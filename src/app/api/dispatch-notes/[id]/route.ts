import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadDispatchNotes, updateDispatchNote } from '@/lib/dispatch-notes';
import { loadSalesOrders, updateSalesOrder, computeDispatchFulfillmentStatus } from '@/lib/sales-orders';
import { loadPurchaseOrders, cascadePurchaseOrderByNumber } from '@/lib/purchase-orders';
import { addStockLedgerEntry } from '@/lib/stock';
import { loadPersistentProducts } from '@/lib/products';
import { logAuditEvent } from '@/lib/audit';
import { guardPermission, isVendorApproved } from '@/lib/api-auth';
import { canTransition, getAllowedTransitions, findTransitionPath } from '@/lib/lifecycle';

const DELIVERED_STATUSES = ['DELIVERED', 'PARTIALLY_DELIVERED'];
const DISPATCHED_STATUSES = ['DISPATCHED', 'IN_TRANSIT', ...DELIVERED_STATUSES];

// Picking, packing, and the physical dispatch handover are warehouse-floor actions the
// vendor performs (they're the ones physically holding and shipping the stock) — the
// owner creates the dispatch note, but never these downstream operational steps.
const VENDOR_ONLY_STATUSES = ['PICKING', 'PICKED', 'PACKING', 'PACKED', 'DISPATCHED', 'IN_TRANSIT'];

async function cascadeToSalesOrder(salesOrderNumber: string) {
  const allSOs = await loadSalesOrders();
  const so = allSOs.find((s) => s.salesOrderNumber === salesOrderNumber);
  if (!so) return;

  // A line's allocation can span multiple warehouses, each on its own dispatch note —
  // one note reaching DISPATCHED/DELIVERED must never carry the whole order forward if
  // another warehouse's note is still sitting earlier in its own lifecycle (or hasn't
  // been created at all). This aggregates actual dispatched/delivered quantity across
  // every note for the order before deciding whether the order itself has moved on.
  const allDns = (await loadDispatchNotes()).filter((d) => d.salesOrderNumber === salesOrderNumber);
  const targetSoStatus = computeDispatchFulfillmentStatus(so, allDns);

  if (!targetSoStatus || targetSoStatus === so.status) return;

  if (canTransition('SALES_ORDER', so.status, targetSoStatus)) {
    await updateSalesOrder(so.id, { status: targetSoStatus as any });
  }
}

// The vendor's stock already sits in the warehouse before any PO exists — a PO's
// "supply" is fulfilled the moment the linked Sales Order's goods leave the warehouse
// for the customer, not by any separate goods-receipt event. So a PO's PARTIALLY_SUPPLIED
// / FULLY_SUPPLIED status is derived here from cumulative dispatched quantity per item,
// never set by hand. Runs whenever a dispatch note reaches a "left the warehouse" status.
async function cascadePOsFromDispatch(salesOrderNumber: string): Promise<Array<{ poNumber: string; status: string }>> {
  const allDns = (await loadDispatchNotes()).filter((d) => d.salesOrderNumber === salesOrderNumber);
  const dispatchedQtyByItem = new Map<string, number>();
  for (const dn of allDns) {
    if (!DISPATCHED_STATUSES.includes(dn.status)) continue;
    for (const line of dn.lines || []) {
      const qty = Math.abs(line.dispatchQty || 0);
      dispatchedQtyByItem.set(line.itemCode, (dispatchedQtyByItem.get(line.itemCode) || 0) + qty);
    }
  }

  const linkedPos = (await loadPurchaseOrders()).filter((p) => p.linkedSalesOrderNumber === salesOrderNumber);
  const cascaded: Array<{ poNumber: string; status: string }> = [];
  for (const po of linkedPos) {
    let allFull = true;
    let anyDispatched = false;
    for (const line of po.lines || []) {
      const dispatched = dispatchedQtyByItem.get(line.itemCode) || 0;
      if (dispatched > 0) anyDispatched = true;
      if (dispatched < line.quantity) allFull = false;
    }
    const targetStatus = allFull ? 'FULLY_SUPPLIED' : anyDispatched ? 'PARTIALLY_SUPPLIED' : null;
    if (!targetStatus) continue;
    const updated = await cascadePurchaseOrderByNumber(po.poNumber, targetStatus as any);
    if (updated) cascaded.push({ poNumber: updated.poNumber, status: updated.status });
  }
  return cascaded;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!guardPermission(user, 'DISPATCH', 'UPDATE')) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (!(await isVendorApproved(user))) {
    return NextResponse.json({ error: 'Your vendor registration must be approved by the Platform Owner before you can act on dispatches.' }, { status: 403 });
  }

  const body = await req.json();
  const patch: any = {};
  let currentDn: any = null;

  if (body.status) {
    currentDn = (await loadDispatchNotes()).find((r) => r.id === params.id);
    if (!currentDn) return NextResponse.json({ error: 'Dispatch note not found.' }, { status: 404 });
    // "Confirm Picking" and "Dispatch" are each a single user action, but the state
    // machine still has PICKING/PACKING/PACKED/READY_FOR_DISPATCH as real intermediate
    // hops — walk them rather than skipping the state machine.
    const path = findTransitionPath('DISPATCH_NOTE', currentDn.status, body.status);
    if (!path) {
      return NextResponse.json({
        error: `Cannot transition from ${currentDn.status} to ${body.status}. Allowed: ${getAllowedTransitions('DISPATCH_NOTE', currentDn.status).join(', ')}`,
      }, { status: 400 });
    }
    if (VENDOR_ONLY_STATUSES.includes(body.status) && user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Picking, packing, and dispatch are performed by the vendor/warehouse, not the Platform Owner.' }, { status: 403 });
    }
    for (const hop of path.slice(0, -1)) {
      await updateDispatchNote(params.id, { status: hop as any });
    }
    patch.status = body.status;

    if (body.status === 'DELIVERED' || body.status === 'PARTIALLY_DELIVERED') {
      patch.actualDeliveryDate = body.actualDeliveryDate || new Date().toISOString();
    }

    if (body.status === 'DELIVERY_EXCEPTION' && !body.rejectionReason?.trim()) {
      return NextResponse.json({ error: 'A reason is required to reject/report an exception on a dispatched order.' }, { status: 400 });
    }
  }

  ['carrier', 'expectedDeliveryDate', 'actualDeliveryDate', 'comments', 'attachment', 'podReference', 'receiverName', 'rejectionReason', 'lines'].forEach((k) => {
    if (body[k] !== undefined) patch[k] = body[k];
  });
  if (body.dispatchQty !== undefined) patch.dispatchQty = Number(body.dispatchQty);
  if (body.dispatchDate !== undefined) patch.dispatchDate = body.dispatchDate;

  const rec = await updateDispatchNote(params.id, patch);
  if (!rec) return NextResponse.json({ error: 'Dispatch note not found.' }, { status: 404 });

  // PHYSICAL STOCK DECREMENT TRIGGER: When status transitions to DISPATCHED, append ISSUE rows to Stock Ledger
  if (patch.status === 'DISPATCHED' && currentDn?.status !== 'DISPATCHED') {
    try {
      const products = await loadPersistentProducts();
      for (const line of rec.lines || []) {
        const qtyToIssue = Math.abs(line.dispatchQty || line.orderedQty || 0);
        if (qtyToIssue > 0) {
          // Vendor tagging is required here so the vendor's own (filtered) Stock
          // Activity Log picks up their dispatches — without it, ISSUE rows from
          // dispatch are invisible to the vendor even though the row itself exists.
          const product = Object.values(products).find((p) => p.sku === line.itemCode || p.id === (line as any).itemMasterId);
          await addStockLedgerEntry({
            warehouseId: (rec.warehouseCode || 'WH-SYD-01').toLowerCase().replace(/-/g, '_'),
            warehouseCode: rec.warehouseCode || 'WH-SYD-01',
            warehouseName: rec.warehouseName || rec.warehouseCode || 'Warehouse Facility',
            itemMasterId: (line as any).itemMasterId || product?.id || line.itemCode,
            sku: line.itemCode,
            barcode: (line as any).barcode || product?.barcode || '9312345001015',
            itemName: line.itemName || line.itemCode,
            vendorId: product?.vendorId || null,
            vendorName: product?.vendorName,
            binLocation: (line as any).binLocation || 'BIN-A1-01',
            movementType: 'ISSUE',
            quantityDelta: -qtyToIssue,
            referenceNumber: rec.dispatchNumber,
            reasonCode: `Sales Order Outbound Dispatch (${rec.salesOrderNumber})`,
            createdById: user.id || 'usr_wh_operator',
            createdByEmail: user.email || 'warehouse@logiqon.tech',
          });
        }
      }
    } catch (stockErr) {
      console.error('[STOCK_DECREMENT_ERROR] Failed to append ledger rows on dispatch:', stockErr);
    }
  }

  if (patch.status) {
    await cascadeToSalesOrder(rec.salesOrderNumber);
  }

  if (patch.status === 'DISPATCHED' && currentDn?.status !== 'DISPATCHED') {
    const cascadedPos = await cascadePOsFromDispatch(rec.salesOrderNumber);
    for (const cp of cascadedPos) {
      await logAuditEvent({
        userId: user.id,
        role: user.role,
        action: 'PURCHASE_ORDER_STATUS_CASCADED',
        module: 'GOVERNANCE',
        targetId: cp.poNumber,
        payloadJson: { poNumber: cp.poNumber, status: cp.status, reason: `Dispatch note ${rec.dispatchNumber} dispatched for ${rec.salesOrderNumber}` },
      }).catch(() => {});
    }
  }

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'DISPATCH_NOTE_UPDATED',
    module: 'WAREHOUSE_OPERATIONS',
    targetId: params.id,
    payloadJson: patch,
  }).catch(() => {});

  return NextResponse.json({ success: true, dispatchNote: rec });
}
