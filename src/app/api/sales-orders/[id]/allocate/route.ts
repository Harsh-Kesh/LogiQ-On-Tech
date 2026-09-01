import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadSalesOrders, updateSalesOrder, SalesOrder } from '@/lib/sales-orders';
import { calculateStockOnHand } from '@/lib/stock';
import { generatePOsFromAllocation } from '@/lib/purchase-orders';
import { logAuditEvent } from '@/lib/audit';
import { guardPermission } from '@/lib/api-auth';
import { findTransitionPath } from '@/lib/lifecycle';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!guardPermission(user, 'SALES_ORDERS', 'UPDATE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const soId = params.id;
    const body = await req.json();
    const { warehouseCode, allocations } = body; 

    if (!warehouseCode || !allocations || Object.keys(allocations).length === 0) {
      return NextResponse.json({ error: 'Missing warehouseCode or allocations payload.' }, { status: 400 });
    }

    const currentOrders = await loadSalesOrders();
    const so = currentOrders.find((r) => r.id === soId);
    if (!so) return NextResponse.json({ error: 'Sales order not found.' }, { status: 404 });

    if (so.status === 'ALLOCATED' || so.status === 'PARTIALLY_DISPATCHED' || so.status === 'READY_FOR_DISPATCH' || so.status === 'DISPATCHED' || so.status === 'COMPLETED' || so.status === 'CANCELLED') {
      return NextResponse.json({ error: `Cannot allocate order in status ${so.status}.` }, { status: 400 });
    }

    const stockItems = await calculateStockOnHand();
    const warehouseStock = stockItems.filter((s) => s.warehouseCode === warehouseCode);

    for (const [itemCode, qty] of Object.entries(allocations)) {
      const q = qty as number;
      if (q <= 0) continue;

      const soLine = so.lines.find((l) => l.itemCode === itemCode);
      if (!soLine) {
        return NextResponse.json({ error: `Item ${itemCode} is not in this sales order.` }, { status: 400 });
      }

      const currentAllocated = soLine.allocatedWarehouses?.reduce((sum, aw) => sum + aw.qty, 0) || 0;
      if (currentAllocated + q > soLine.quantity) {
        return NextResponse.json({ error: `Cannot allocate more than requested quantity for ${itemCode}.` }, { status: 400 });
      }

      const availableAtWh = warehouseStock
        .filter((s) => s.sku === itemCode)
        .reduce((sum, s) => sum + s.quantityAvailable, 0);

      if (availableAtWh < q) {
        return NextResponse.json({ 
          error: `Insufficient Stock: Cannot allocate ${q} units of ${itemCode} from ${warehouseCode}. Only ${availableAtWh} Available-to-Promise.` 
        }, { status: 400 });
      }
    }

    const patchLines = so.lines.map((l) => {
      const qtyToAllocate = allocations[l.itemCode] as number | undefined;
      if (!qtyToAllocate || qtyToAllocate <= 0) return l;

      const aw = l.allocatedWarehouses ? [...l.allocatedWarehouses] : [];
      const existingWh = aw.find((w) => w.warehouseCode === warehouseCode);
      if (existingWh) {
        existingWh.qty += qtyToAllocate;
      } else {
        aw.push({ warehouseCode, qty: qtyToAllocate });
      }

      return { ...l, allocatedWarehouses: aw };
    });

    let isFullyAllocated = true;
    for (const l of patchLines) {
      const totAlloc = l.allocatedWarehouses?.reduce((sum, aw) => sum + aw.qty, 0) || 0;
      if (totAlloc < l.quantity) {
        isFullyAllocated = false;
        break;
      }
    }

    const nextStatus = isFullyAllocated ? 'ALLOCATED' : 'PARTIALLY_ALLOCATED';

    // Allocating can be triggered straight from CONFIRMED now (the separate "check
    // stock" step was folded into this same modal) — walk any intermediate lifecycle
    // hop (e.g. CONFIRMED -> STOCK_CHECK) rather than loosening the state machine to
    // allow a direct jump.
    const path = findTransitionPath('SALES_ORDER', so.status, nextStatus);
    if (!path) {
      return NextResponse.json({ error: `Cannot transition status from ${so.status} to ${nextStatus}.` }, { status: 400 });
    }
    for (const hop of path.slice(0, -1)) {
      await updateSalesOrder(so.id, { status: hop as SalesOrder['status'] });
    }

    const rec = await updateSalesOrder(so.id, {
      lines: patchLines,
      status: nextStatus
    });

    if (!rec) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'SALES_ORDER_ALLOCATED',
      module: 'GOVERNANCE',
      targetId: so.id,
      payloadJson: { warehouseCode, allocations, nextStatus },
    }).catch(() => {});

    // The stock just allocated belongs to a vendor, not to LogiQ — allocating it is the
    // moment LogiQ commits to paying that vendor for it, so a Purchase Order (or an
    // extension of an already-open one) is generated automatically here, not composed
    // separately by hand.
    let generatedPos: Array<{ poNumber: string; vendorName: string; action: 'created' | 'extended' }> = [];
    try {
      generatedPos = await generatePOsFromAllocation({
        salesOrderNumber: so.salesOrderNumber,
        soLines: so.lines.map((l) => ({ itemCode: l.itemCode, itemName: l.itemName })),
        allocations: allocations as Record<string, number>,
        createdBy: user.email || 'owner@logiqon.com',
      });
      for (const po of generatedPos) {
        await logAuditEvent({
          userId: user.id,
          role: user.role,
          action: po.action === 'created' ? 'PURCHASE_ORDER_CREATED' : 'PURCHASE_ORDER_STATUS_CASCADED',
          module: 'GOVERNANCE',
          targetId: po.poNumber,
          payloadJson: { poNumber: po.poNumber, vendorName: po.vendorName, reason: `Auto-generated from allocation on ${so.salesOrderNumber}`, action: po.action },
        }).catch(() => {});
      }
    } catch (poErr) {
      console.error('[PO_AUTO_GENERATION_ERROR] Failed to generate purchase order(s) from allocation:', poErr);
    }

    return NextResponse.json({ success: true, salesOrder: rec, generatedPurchaseOrders: generatedPos });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
