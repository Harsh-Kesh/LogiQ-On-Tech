import { prisma } from './prisma';
import { nextDocumentNumber } from './document-sequences';
import { loadPurchaseOrders, updatePurchaseOrder } from './purchase-orders';

// A claim represents ONE physical shipment: several dispatch notes from the SAME
// warehouse, consolidated onto one truck under one tracking/consignment number, with
// one combined freight bill. Dispatch notes from different warehouses can never
// physically travel together, so they can never share a claim — that's enforced at
// creation time. Tracking number lives here (on the claim/shipment), not on any single
// dispatch note, since it's a fact about the consolidated movement, not about any one
// order's goods within it.
//
// The related Purchase Orders are DERIVED from the selected dispatch notes' line items
// (never picked by hand), and the total cost splits across them proportional to how
// much of the shipment's value belongs to each PO. The owner must approve the claim —
// reviewing which POs/DNs it covers — before any PO total is touched, and a vendor
// cannot invoice a PO until it's fully supplied and free of any still-pending claim
// (otherwise the invoice would be raised before the PO's real transport cost is known).

export type TransportCostStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface TransportCostAllocation {
  poNumber: string;
  poTotalValueAtClaim: number; // snapshot for transparency — the PO total may move before approval
  allocatedAmount: number;
}

export interface TransportCost {
  id: string;
  transportCostNumber: string; // TRC-YYYY-#####
  trackingNumber: string;
  warehouseCode: string;
  warehouseName?: string;
  totalCost: number;
  currency: string;
  vendorName: string;
  vendorId?: string;
  relatedPoNumbers: string[];
  relatedDnNumbers: string[];
  allocations: TransportCostAllocation[];
  status: TransportCostStatus;
  rejectionReason?: string;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const TC_INCLUDE = { allocations: true } as const;
type TransportCostRow = Awaited<ReturnType<typeof prisma.transportCost.findFirstOrThrow<{ include: typeof TC_INCLUDE }>>>;

function toTransportCost(row: TransportCostRow): TransportCost {
  return {
    id: row.id,
    transportCostNumber: row.transportCostNumber,
    trackingNumber: row.trackingNumber,
    warehouseCode: row.warehouseCode,
    warehouseName: row.warehouseName ?? undefined,
    totalCost: Number(row.totalCost),
    currency: row.currency,
    vendorName: row.vendorName,
    vendorId: row.vendorId ?? undefined,
    relatedPoNumbers: row.allocations.map((a) => a.poNumber),
    relatedDnNumbers: row.relatedDnNumbers,
    allocations: row.allocations.map((a) => ({
      poNumber: a.poNumber,
      poTotalValueAtClaim: Number(a.poTotalValueAtClaim),
      allocatedAmount: Number(a.allocatedAmount),
    })),
    status: row.status as TransportCostStatus,
    rejectionReason: row.rejectionReason ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.createdBy ?? '',
    approvedBy: row.approvedBy ?? undefined,
    approvedAt: row.approvedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadTransportCosts(): Promise<TransportCost[]> {
  const rows = await prisma.transportCost.findMany({ include: TC_INCLUDE, orderBy: { createdAt: 'desc' } });
  return rows.map(toTransportCost);
}

// Fallback for when no value signal is available to weight by (shouldn't normally
// happen — every PO line here comes from the same catalogue as the dispatch note lines
// that produced it) — split evenly rather than divide by zero.
export async function computeEqualAllocations(totalCost: number, poNumbers: string[]): Promise<TransportCostAllocation[]> {
  const allPos = await loadPurchaseOrders();
  const share = Math.round((totalCost / poNumbers.length) * 100) / 100;
  // Give the rounding remainder to the last line so allocations always sum exactly to totalCost.
  const allocations: TransportCostAllocation[] = poNumbers.map((poNumber, i) => {
    const po = allPos.find((p) => p.poNumber === poNumber);
    const isLast = i === poNumbers.length - 1;
    const runningTotal = share * (poNumbers.length - 1);
    return {
      poNumber,
      poTotalValueAtClaim: po?.totalValue ?? 0,
      allocatedAmount: isLast ? Math.round((totalCost - runningTotal) * 100) / 100 : share,
    };
  });
  return allocations;
}

// Splits the shipment's total cost across the POs it covers, proportional to how much
// of the shipment's value belongs to each PO — a PO that's 80% of what's on the truck
// should carry roughly 80% of the freight bill, not an equal slice regardless of size.
export async function computeProportionalAllocations(totalCost: number, poWeights: Array<{ poNumber: string; value: number }>): Promise<TransportCostAllocation[]> {
  const totalWeight = poWeights.reduce((s, w) => s + w.value, 0);
  if (totalWeight <= 0) {
    return computeEqualAllocations(totalCost, poWeights.map((w) => w.poNumber));
  }
  const allPos = await loadPurchaseOrders();
  let running = 0;
  return poWeights.map((w, i) => {
    const po = allPos.find((p) => p.poNumber === w.poNumber);
    const isLast = i === poWeights.length - 1;
    const share = isLast
      ? Math.round((totalCost - running) * 100) / 100
      : Math.round(totalCost * (w.value / totalWeight) * 100) / 100;
    running += share;
    return { poNumber: w.poNumber, poTotalValueAtClaim: po?.totalValue ?? 0, allocatedAmount: share };
  });
}

// A claim is scoped to dispatch notes from ONE warehouse — everything on it physically
// left together, so the related POs are whatever the selected dispatches' line items
// actually belong to, weighted by dispatched qty × the PO's own unit cost for that item.
// Never accept a related-PO list from the client: it's always derived from the
// dispatch notes themselves, so it can't drift from what actually shipped.
export function deriveRelatedPosAndWeights(
  selectedDns: Array<{ salesOrderNumber: string; lines?: Array<{ itemCode: string; dispatchQty?: number }> }>,
  vendorPos: Array<{ poNumber: string; linkedSalesOrderNumber?: string; lines: Array<{ itemCode: string; unitCost: number }> }>
): Array<{ poNumber: string; value: number }> {
  const weightByPo = new Map<string, number>();
  for (const dn of selectedDns) {
    const candidatePos = vendorPos.filter((p) => p.linkedSalesOrderNumber === dn.salesOrderNumber);
    for (const line of dn.lines || []) {
      const qty = Math.abs(line.dispatchQty || 0);
      if (qty <= 0) continue;
      for (const po of candidatePos) {
        const poLine = po.lines.find((l) => l.itemCode === line.itemCode);
        if (!poLine) continue;
        weightByPo.set(po.poNumber, (weightByPo.get(po.poNumber) || 0) + qty * (poLine.unitCost || 0));
      }
    }
  }
  return Array.from(weightByPo.entries()).map(([poNumber, value]) => ({ poNumber, value }));
}

export async function createTransportCost(input: {
  trackingNumber: string;
  warehouseCode: string;
  warehouseName?: string;
  totalCost: number;
  currency: string;
  vendorName: string;
  vendorId?: string;
  relatedDnNumbers: string[];
  poWeights: Array<{ poNumber: string; value: number }>;
  notes?: string;
  createdBy: string;
}): Promise<TransportCost> {
  const transportCostNumber = await nextDocumentNumber('TC');
  const allocations = await computeProportionalAllocations(input.totalCost, input.poWeights);

  const row = await prisma.transportCost.create({
    data: {
      transportCostNumber,
      trackingNumber: input.trackingNumber,
      warehouseCode: input.warehouseCode,
      warehouseName: input.warehouseName,
      totalCost: input.totalCost,
      currency: input.currency,
      vendorName: input.vendorName,
      vendorId: input.vendorId,
      relatedDnNumbers: input.relatedDnNumbers,
      status: 'PENDING_APPROVAL',
      notes: input.notes,
      createdBy: input.createdBy,
      allocations: {
        create: allocations.map((a) => ({
          poNumber: a.poNumber,
          poTotalValueAtClaim: a.poTotalValueAtClaim,
          allocatedAmount: a.allocatedAmount,
        })),
      },
    },
    include: TC_INCLUDE,
  });
  return toTransportCost(row);
}

// True while ANY claim referencing this PO is still awaiting owner approval — the
// vendor must not invoice against a total that's about to move.
export async function hasPendingTransportCost(poNumber: string): Promise<boolean> {
  const count = await prisma.transportCost.count({
    where: { status: 'PENDING_APPROVAL', allocations: { some: { poNumber } } },
  });
  return count > 0;
}

// A dispatch note's freight can only be claimed once — once it's on a claim that's
// pending or already approved, it drops out of the selectable list for any new claim.
// A rejected claim frees the dispatch back up (the vendor re-submits with a corrected
// claim covering it).
export async function isDnAlreadyClaimed(dispatchNumber: string): Promise<boolean> {
  const count = await prisma.transportCost.count({
    where: { status: { not: 'REJECTED' }, relatedDnNumbers: { has: dispatchNumber } },
  });
  return count > 0;
}

export async function approveTransportCost(id: string, approvedBy: string): Promise<TransportCost | null> {
  const row = await prisma.transportCost.findUnique({ where: { id }, include: TC_INCLUDE });
  if (!row || row.status !== 'PENDING_APPROVAL') return null;

  for (const alloc of row.allocations) {
    const po = (await loadPurchaseOrders()).find((p) => p.poNumber === alloc.poNumber);
    if (!po) continue;
    const newTransportCost = Math.round(((po.transportCost || 0) + Number(alloc.allocatedAmount)) * 100) / 100;
    const newTotal = Math.round((po.subtotal + po.taxTotal + newTransportCost) * 100) / 100;
    await updatePurchaseOrder(po.id, { transportCost: newTransportCost, totalValue: newTotal });
  }

  const updated = await prisma.transportCost.update({
    where: { id },
    data: { status: 'APPROVED', approvedBy, approvedAt: new Date() },
    include: TC_INCLUDE,
  });
  return toTransportCost(updated);
}

export async function rejectTransportCost(id: string, approvedBy: string, reason?: string): Promise<TransportCost | null> {
  const row = await prisma.transportCost.findUnique({ where: { id } });
  if (!row || row.status !== 'PENDING_APPROVAL') return null;

  const updated = await prisma.transportCost.update({
    where: { id },
    data: { status: 'REJECTED', approvedBy, approvedAt: new Date(), rejectionReason: reason },
    include: TC_INCLUDE,
  });
  return toTransportCost(updated);
}
