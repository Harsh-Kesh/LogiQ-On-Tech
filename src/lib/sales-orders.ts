import { prisma } from './prisma';
import { nextDocumentNumber } from './document-sequences';

// Owner-side function #1, #2, #4 — Sales Orders and their allocation/dispatch statuses.
// FR-SO-001..010, FR-IN-001..007.

export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'STOCK_CHECK'
  | 'PARTIALLY_ALLOCATED'
  | 'ALLOCATED'
  // Set once at least one dispatch note has been created for this order but its
  // allocation spans other warehouses that don't have one yet (or whose note hasn't
  // actually left the warehouse) — keeps the order actionable until every warehouse's
  // share is genuinely covered, instead of the order silently going "ready" on the
  // strength of only one of several warehouses.
  | 'PARTIALLY_DISPATCHED'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'INVOICED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'COMPLETED'
  | 'CANCELLED';

export interface SalesOrderLine {
  id: string;
  itemCode: string;
  itemName: string;
  description?: string;
  quantity: number;
  sellingPrice: number;
  taxPercent: number;
  lineTotal: number; // pre-tax * (1+tax/100), fixed-precision handled in service
  allocatedWarehouses?: Array<{ warehouseCode: string; qty: number }>;
  dispatchedQty?: number;
}

export interface SalesOrder {
  id: string;
  salesOrderNumber: string; // SO-YYYY-#####
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerPoReference?: string;
  // Where this order originated — MANUAL orders are entered by the Owner as always;
  // ONLINE_STORE orders were placed by a guest through the public storefront checkout
  // and land here as DRAFT the same way, so they get the same human review before
  // progressing through allocation/dispatch.
  source?: 'MANUAL' | 'ONLINE_STORE';
  deliveryLocation: string;
  requestedDeliveryDate?: string;
  paymentTerms: string;
  incoterms?: string;
  currency: string;
  status: SalesOrderStatus;
  lines: SalesOrderLine[];
  subtotal: number;
  taxTotal: number;
  totalValue: number;
  internalNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const SO_INCLUDE = { lines: { include: { allocations: true } } } as const;
type SalesOrderRow = Awaited<ReturnType<typeof prisma.salesOrder.findFirstOrThrow<{ include: typeof SO_INCLUDE }>>>;

function toLine(row: SalesOrderRow['lines'][number]): SalesOrderLine {
  const byWarehouse = new Map<string, number>();
  for (const a of row.allocations || []) {
    byWarehouse.set(a.warehouseCode, (byWarehouse.get(a.warehouseCode) || 0) + a.allocatedQty);
  }
  const allocatedWarehouses = [...byWarehouse.entries()].map(([warehouseCode, qty]) => ({ warehouseCode, qty }));
  return {
    id: row.id,
    itemCode: row.itemCode,
    itemName: row.itemName,
    description: row.description ?? undefined,
    quantity: row.quantity,
    sellingPrice: Number(row.sellingPrice),
    taxPercent: Number(row.taxPercent),
    lineTotal: Number(row.lineTotal),
    allocatedWarehouses: allocatedWarehouses.length ? allocatedWarehouses : undefined,
    dispatchedQty: row.dispatchedQty,
  };
}

function toSalesOrder(row: SalesOrderRow): SalesOrder {
  return {
    id: row.id,
    salesOrderNumber: row.salesOrderNumber,
    customerName: row.customerName,
    customerEmail: row.customerEmail ?? undefined,
    customerPhone: row.customerPhone ?? undefined,
    customerPoReference: row.customerPoReference ?? undefined,
    source: (row.source as SalesOrder['source']) ?? undefined,
    deliveryLocation: row.deliveryLocation,
    requestedDeliveryDate: row.requestedDeliveryDate?.toISOString(),
    paymentTerms: row.paymentTerms,
    incoterms: row.incoterms ?? undefined,
    currency: row.currency,
    status: row.status as SalesOrderStatus,
    lines: (row.lines || []).map(toLine),
    subtotal: Number(row.subtotal),
    taxTotal: Number(row.taxTotal),
    totalValue: Number(row.totalValue),
    internalNotes: row.internalNotes ?? undefined,
    createdBy: row.createdBy ?? '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadSalesOrders(): Promise<SalesOrder[]> {
  const rows = await prisma.salesOrder.findMany({ include: SO_INCLUDE, orderBy: { createdAt: 'desc' } });
  return rows.map(toSalesOrder);
}

// BR-012 atomic number allocation.
export async function createSalesOrder(
  input: Omit<SalesOrder, 'id' | 'salesOrderNumber' | 'createdAt' | 'updatedAt' | 'status'> & { status?: SalesOrderStatus }
): Promise<SalesOrder> {
  const salesOrderNumber = await nextDocumentNumber('SO');
  const row = await prisma.salesOrder.create({
    data: {
      salesOrderNumber,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerPoReference: input.customerPoReference,
      source: input.source || 'MANUAL',
      deliveryLocation: input.deliveryLocation,
      requestedDeliveryDate: input.requestedDeliveryDate ? new Date(input.requestedDeliveryDate) : null,
      paymentTerms: input.paymentTerms,
      incoterms: input.incoterms,
      currency: input.currency,
      status: input.status || 'DRAFT',
      subtotal: input.subtotal,
      taxTotal: input.taxTotal,
      totalValue: input.totalValue,
      internalNotes: input.internalNotes,
      createdBy: input.createdBy,
      lines: {
        create: input.lines.map((l) => ({
          itemCode: l.itemCode,
          itemName: l.itemName,
          description: l.description,
          quantity: l.quantity,
          sellingPrice: l.sellingPrice,
          taxPercent: l.taxPercent,
          lineTotal: l.lineTotal,
          dispatchedQty: l.dispatchedQty || 0,
        })),
      },
    },
    include: SO_INCLUDE,
  });
  return toSalesOrder(row);
}

// A single Sales Order line can be allocated across multiple warehouses
// (`line.allocatedWarehouses`), and each warehouse ships on its own Dispatch Note —
// so "has this order been dispatched" is never true off the back of any one note. This
// is the single source of truth for that completeness question, shared by every place
// that cascades a Sales Order's status off dispatch-note activity (note creation, and
// a note progressing through its own picking/dispatch/delivery lifecycle), so all of
// them agree on what "fully covered" means instead of each re-deriving it — and
// diverging, which is how a second warehouse's note previously became uncreatable.
export function computeDispatchFulfillmentStatus(
  so: Pick<SalesOrder, 'salesOrderNumber' | 'lines'>,
  dispatchNotesForOrder: Array<{ status: string; lines?: Array<{ dispatchQty?: number; deliveredQty?: number }> }>
): SalesOrderStatus | null {
  const totalAllocated = so.lines.reduce(
    (sum, l) => sum + (l.allocatedWarehouses || []).reduce((s, w) => s + w.qty, 0),
    0
  );
  if (totalAllocated <= 0) return null;

  const active = dispatchNotesForOrder.filter((d) => d.status !== 'CANCELLED');
  const sumBy = (field: 'dispatchQty' | 'deliveredQty', statuses: string[]) =>
    active
      .filter((d) => statuses.includes(d.status))
      .reduce((sum, d) => sum + (d.lines || []).reduce((s, l) => s + Math.abs(l[field] || 0), 0), 0);

  const totalCreated = active.reduce((sum, d) => sum + (d.lines || []).reduce((s, l) => s + Math.abs(l.dispatchQty || 0), 0), 0);
  const totalDelivered = sumBy('deliveredQty', ['DELIVERED', 'PARTIALLY_DELIVERED']);
  const totalDispatched = sumBy('dispatchQty', ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'PARTIALLY_DELIVERED']);

  if (totalDelivered >= totalAllocated) return 'DELIVERED';
  if (totalDispatched >= totalAllocated) return 'DISPATCHED';
  if (totalCreated >= totalAllocated) return 'READY_FOR_DISPATCH';
  if (totalCreated > 0) return 'PARTIALLY_DISPATCHED';
  return null;
}

export async function updateSalesOrder(id: string, patch: Partial<SalesOrder>): Promise<SalesOrder | null> {
  const data: any = {};
  (['customerName', 'customerEmail', 'customerPhone', 'customerPoReference', 'source', 'deliveryLocation', 'paymentTerms', 'incoterms', 'currency', 'status', 'subtotal', 'taxTotal', 'totalValue', 'internalNotes'] as const).forEach((k) => {
    if (patch[k] !== undefined) data[k] = patch[k];
  });
  if (patch.requestedDeliveryDate !== undefined) {
    data.requestedDeliveryDate = patch.requestedDeliveryDate ? new Date(patch.requestedDeliveryDate) : null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({ where: { id }, data });

      if (patch.lines) {
        for (const line of patch.lines) {
          if (!line.id) continue;
          if (line.dispatchedQty !== undefined) {
            await tx.salesOrderLine.update({ where: { id: line.id }, data: { dispatchedQty: line.dispatchedQty } });
          }
          if (line.allocatedWarehouses) {
            await tx.allocation.deleteMany({ where: { salesOrderLineId: line.id } });
            const toCreate = line.allocatedWarehouses.filter((w) => w.qty > 0);
            if (toCreate.length) {
              await tx.allocation.createMany({
                data: toCreate.map((w) => ({
                  salesOrderId: id,
                  salesOrderLineId: line.id,
                  warehouseCode: w.warehouseCode,
                  allocatedQty: w.qty,
                })),
              });
            }
          }
        }
      }
    });
  } catch {
    return null;
  }

  const row = await prisma.salesOrder.findUnique({ where: { id }, include: SO_INCLUDE });
  return row ? toSalesOrder(row) : null;
}
