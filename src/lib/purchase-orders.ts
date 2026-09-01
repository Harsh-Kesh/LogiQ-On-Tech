import { prisma } from './prisma';
import { nextDocumentNumber } from './document-sequences';
import { findTransitionPath } from './lifecycle';
import { loadPersistentProducts } from './products';
import { loadVendorMasterData } from './vendor-master';

// Owner-side #9, #10 — Purchase Orders. FR-PO-001..005.

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'SENT_TO_VENDOR'
  | 'VENDOR_CONFIRMED'
  | 'PARTIALLY_SUPPLIED'
  | 'FULLY_SUPPLIED'
  | 'VENDOR_INVOICE_RECEIVED'
  | 'PAYMENT_PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CLOSED'
  | 'CANCELLED';

export interface PurchaseOrderLine {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  taxPercent: number;
  lineTotal: number;
  receivedQty?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // PO-YYYY-#####
  vendorName: string;
  vendorId?: string;
  linkedSalesOrderNumber?: string;
  requestedDeliveryDate?: string;
  paymentTerms: string;
  currency: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  subtotal: number;
  taxTotal: number;
  totalValue: number;
  leadTimeDays?: number;
  notes?: string;
  // Sum of allocated shares from APPROVED transport cost claims (see transport-costs.ts).
  // Already folded into totalValue once approved — kept separate too so the PO detail/
  // print views and the invoice default can show what portion is transport vs goods.
  transportCost?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const PO_INCLUDE = { lines: true } as const;
type PurchaseOrderRow = Awaited<ReturnType<typeof prisma.purchaseOrder.findFirstOrThrow<{ include: typeof PO_INCLUDE }>>>;

function toLine(row: PurchaseOrderRow['lines'][number]): PurchaseOrderLine {
  return {
    id: row.id,
    itemCode: row.itemCode,
    itemName: row.itemName,
    quantity: row.quantity,
    unitCost: Number(row.unitCost),
    taxPercent: Number(row.taxPercent),
    lineTotal: Number(row.lineTotal),
    receivedQty: row.receivedQty,
  };
}

function toPurchaseOrder(row: PurchaseOrderRow): PurchaseOrder {
  return {
    id: row.id,
    poNumber: row.poNumber,
    vendorName: row.vendorName,
    vendorId: row.vendorId ?? undefined,
    linkedSalesOrderNumber: row.linkedSalesOrderNumber ?? undefined,
    requestedDeliveryDate: row.requestedDeliveryDate?.toISOString(),
    paymentTerms: row.paymentTerms,
    currency: row.currency,
    status: row.status as PurchaseOrderStatus,
    lines: (row.lines || []).map(toLine),
    subtotal: Number(row.subtotal),
    taxTotal: Number(row.taxTotal),
    totalValue: Number(row.totalValue),
    leadTimeDays: row.leadTimeDays ?? undefined,
    notes: row.notes ?? undefined,
    transportCost: row.transportCost !== null ? Number(row.transportCost) : undefined,
    createdBy: row.createdBy ?? '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadPurchaseOrders(): Promise<PurchaseOrder[]> {
  const rows = await prisma.purchaseOrder.findMany({ include: PO_INCLUDE, orderBy: { createdAt: 'desc' } });
  return rows.map(toPurchaseOrder);
}

// BR-012 atomic number allocation.
export async function createPurchaseOrder(input: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt' | 'status'> & { status?: PurchaseOrderStatus }): Promise<PurchaseOrder> {
  const poNumber = await nextDocumentNumber('PO');
  const row = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      vendorName: input.vendorName,
      vendorId: input.vendorId,
      linkedSalesOrderNumber: input.linkedSalesOrderNumber,
      requestedDeliveryDate: input.requestedDeliveryDate ? new Date(input.requestedDeliveryDate) : null,
      paymentTerms: input.paymentTerms,
      currency: input.currency,
      status: input.status || 'DRAFT',
      subtotal: input.subtotal,
      taxTotal: input.taxTotal,
      totalValue: input.totalValue,
      leadTimeDays: input.leadTimeDays,
      notes: input.notes,
      transportCost: input.transportCost,
      createdBy: input.createdBy,
      lines: {
        create: input.lines.map((l) => ({
          itemCode: l.itemCode,
          itemName: l.itemName,
          quantity: l.quantity,
          unitCost: l.unitCost,
          taxPercent: l.taxPercent,
          lineTotal: l.lineTotal,
          receivedQty: l.receivedQty || 0,
        })),
      },
    },
    include: PO_INCLUDE,
  });
  return toPurchaseOrder(row);
}

export async function updatePurchaseOrder(id: string, patch: Partial<PurchaseOrder>): Promise<PurchaseOrder | null> {
  const data: any = {};
  (['vendorName', 'vendorId', 'linkedSalesOrderNumber', 'paymentTerms', 'currency', 'status', 'subtotal', 'taxTotal', 'totalValue', 'leadTimeDays', 'notes', 'transportCost'] as const).forEach((k) => {
    if (patch[k] !== undefined) data[k] = patch[k];
  });
  if (patch.requestedDeliveryDate !== undefined) {
    data.requestedDeliveryDate = patch.requestedDeliveryDate ? new Date(patch.requestedDeliveryDate) : null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({ where: { id }, data });

      if (patch.lines) {
        // Lines are wholesale-replaced (matching the JSON store's plain-object-replace
        // semantics) — the small set of callers that patch `lines` always pass the full,
        // already-merged array back (see generatePOsFromAllocation below).
        await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseOrderLine.createMany({
          data: patch.lines.map((l) => ({
            purchaseOrderId: id,
            itemCode: l.itemCode,
            itemName: l.itemName,
            quantity: l.quantity,
            unitCost: l.unitCost,
            taxPercent: l.taxPercent,
            lineTotal: l.lineTotal,
            receivedQty: l.receivedQty || 0,
          })),
        });
      }
    });
  } catch {
    return null;
  }

  const row = await prisma.purchaseOrder.findUnique({ where: { id }, include: PO_INCLUDE });
  return row ? toPurchaseOrder(row) : null;
}

/**
 * Advances a PO toward `targetStatus` by walking the legal transition chain one hop
 * at a time (never skipping a lifecycle guard). Used to auto-cascade a PO's status
 * when its linked vendor invoice is registered or paid, so the owner doesn't have to
 * separately click through the same status the vendor-invoice event already implies.
 * Returns the final PO record, or null if the PO doesn't exist or the target isn't
 * currently reachable (e.g. the PO was cancelled) — in which case nothing changes.
 */
export async function cascadePurchaseOrderByNumber(poNumber: string, targetStatus: PurchaseOrderStatus): Promise<PurchaseOrder | null> {
  const po = await prisma.purchaseOrder.findUnique({ where: { poNumber } });
  if (!po) return null;
  const path = findTransitionPath('PURCHASE_ORDER', po.status, targetStatus);
  if (!path || path.length === 0) return null;
  let updated: PurchaseOrder | null = null;
  for (const next of path) {
    updated = await updatePurchaseOrder(po.id, { status: next as PurchaseOrderStatus });
    if (!updated) return null;
  }
  return updated;
}

// Once a PO has advanced past this point, the vendor has already been told (or has
// started acting on) a specific committed quantity — a later allocation must not
// silently rewrite that. Only POs still at one of these earlier stages are safe to
// extend in place; anything further along gets a new supplementary PO instead.
const SAFE_TO_EXTEND_PO_STATUSES: PurchaseOrderStatus[] = ['DRAFT', 'APPROVED', 'SENT_TO_VENDOR', 'VENDOR_CONFIRMED'];

function purchaseOrderPriceFor(vendorName: string, itemCode: string, vendorMaster: Awaited<ReturnType<typeof loadVendorMasterData>>, products: Awaited<ReturnType<typeof loadPersistentProducts>>): number {
  const vm = vendorMaster.find((v) => v.vendorName === vendorName && v.itemCode === itemCode);
  if (vm) return vm.costOfGoods;
  const product = Object.values(products).find((p) => p.sku === itemCode);
  return product?.costPrice ?? 0;
}

function buildPoLine(itemCode: string, itemName: string, quantity: number, unitCost: number): PurchaseOrderLine {
  const taxPercent = 10;
  return {
    id: `pol_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    itemCode,
    itemName,
    quantity,
    unitCost,
    taxPercent,
    lineTotal: Math.round(quantity * unitCost * (1 + taxPercent / 100) * 100) / 100,
  };
}

function recomputePoTotals(lines: PurchaseOrderLine[]) {
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const taxTotal = Math.round(lines.reduce((s, l) => s + l.quantity * l.unitCost * (l.taxPercent / 100), 0) * 100) / 100;
  const totalValue = Math.round((subtotal + taxTotal) * 100) / 100;
  return { subtotal, taxTotal, totalValue };
}

/**
 * The stock being allocated to a Sales Order line is vendor-owned inventory sitting in
 * the warehouse, not LogiQ's own stock — so allocating it is the moment LogiQ commits to
 * paying the owning vendor for exactly that quantity. This mirrors that commitment into a
 * Purchase Order automatically; nobody composes it by hand. Items with no external vendor
 * (e.g. LogiQ's own internal stock) are skipped — there's no one to owe for those.
 *
 * One PO per vendor per Sales Order is reused across allocation events as long as it
 * hasn't progressed past a stage where the vendor has already acted on a committed
 * number (see SAFE_TO_EXTEND_PO_STATUSES) — otherwise a fresh supplementary PO is
 * created for the incremental quantity instead of mutating a settled one.
 */
export async function generatePOsFromAllocation(input: {
  salesOrderNumber: string;
  soLines: Array<{ itemCode: string; itemName: string }>;
  allocations: Record<string, number>;
  createdBy: string;
}): Promise<Array<{ poNumber: string; vendorName: string; action: 'created' | 'extended' }>> {
  const products = await loadPersistentProducts();
  const productList = Object.values(products);
  const vendorMaster = await loadVendorMasterData();

  const byVendor = new Map<string, { vendorId?: string; lines: Array<{ itemCode: string; itemName: string; quantity: number }> }>();
  for (const [itemCode, qty] of Object.entries(input.allocations)) {
    if (!qty || qty <= 0) continue;
    const product = productList.find((p) => p.sku === itemCode);
    if (!product || !product.vendorId || !product.vendorName) continue; // internal stock — no vendor to owe
    const soLine = input.soLines.find((l) => l.itemCode === itemCode);
    const itemName = soLine?.itemName || product.itemName;
    const group = byVendor.get(product.vendorName) || { vendorId: product.vendorId, lines: [] };
    group.lines.push({ itemCode, itemName, quantity: qty });
    byVendor.set(product.vendorName, group);
  }

  const results: Array<{ poNumber: string; vendorName: string; action: 'created' | 'extended' }> = [];
  const existingPOs = await loadPurchaseOrders();

  for (const [vendorName, group] of byVendor) {
    const existing = existingPOs.find(
      (p) => p.vendorName === vendorName
        && p.linkedSalesOrderNumber === input.salesOrderNumber
        && SAFE_TO_EXTEND_PO_STATUSES.includes(p.status)
    );

    if (existing) {
      const lines = existing.lines.map((l) => ({ ...l }));
      for (const newLine of group.lines) {
        const match = lines.find((l) => l.itemCode === newLine.itemCode);
        if (match) {
          match.quantity += newLine.quantity;
          match.lineTotal = Math.round(match.quantity * match.unitCost * (1 + match.taxPercent / 100) * 100) / 100;
        } else {
          const unitCost = purchaseOrderPriceFor(vendorName, newLine.itemCode, vendorMaster, products);
          lines.push(buildPoLine(newLine.itemCode, newLine.itemName, newLine.quantity, unitCost));
        }
      }
      await updatePurchaseOrder(existing.id, { lines, ...recomputePoTotals(lines) });
      results.push({ poNumber: existing.poNumber, vendorName, action: 'extended' });
    } else {
      const lines = group.lines.map((l) =>
        buildPoLine(l.itemCode, l.itemName, l.quantity, purchaseOrderPriceFor(vendorName, l.itemCode, vendorMaster, products))
      );
      const vmSample = vendorMaster.find((v) => v.vendorName === vendorName);
      const rec = await createPurchaseOrder({
        vendorName,
        vendorId: group.vendorId,
        linkedSalesOrderNumber: input.salesOrderNumber,
        paymentTerms: vmSample?.paymentTerms || 'Net 30',
        currency: 'AUD',
        lines,
        ...recomputePoTotals(lines),
        leadTimeDays: vmSample?.leadTimeDays,
        createdBy: input.createdBy,
        status: 'DRAFT',
      });
      results.push({ poNumber: rec.poNumber, vendorName, action: 'created' });
    }
  }

  return results;
}
