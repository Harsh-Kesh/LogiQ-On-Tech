import { prisma } from './prisma';
import { calculateStockOnHand, addStockLedgerEntry } from './stock';

export type OrderStatus = 'SUBMITTED' | 'IN_PICKING' | 'PICKED' | 'PACKED' | 'DISPATCHED' | 'CANCELLED';

export interface OrderItem {
  itemMasterId: string;
  sku: string;
  itemName: string;
  barcode: string;
  quantityRequested: number;
  quantityPicked: number;
  quantityPacked: number;
  unitPrice?: number;
}

export interface PickStep {
  stepNumber: number;
  itemMasterId: string;
  sku: string;
  itemName: string;
  barcode: string;
  binLocation: string;
  zone: string;
  quantityToPick: number;
  isPicked: boolean;
}

export interface PackageDetails {
  packageType: string; // e.g. Shipper Carton A1, Heavy-Duty Wooden Crate, Express Poly Mailer
  grossWeightKg: number;
  courierName: string;
  trackingNumber: string;
  packedAt?: string;
  packedByEmail?: string;
}

export interface OutboundOrder {
  id: string;
  orderNumber: string; // e.g. ORD-2026-901
  customerName: string;
  deliveryAddress: string;
  warehouseCode: string;
  warehouseName: string;
  vendorId?: string | null;
  vendorName?: string;
  vendorEmail?: string;
  status: OrderStatus;
  items: OrderItem[];
  pickSteps?: PickStep[];
  packageDetails?: PackageDetails;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const OO_INCLUDE = { items: true, pickSteps: true } as const;
type OutboundOrderRow = Awaited<ReturnType<typeof prisma.outboundOrder.findFirstOrThrow<{ include: typeof OO_INCLUDE }>>>;

function toOrder(row: OutboundOrderRow): OutboundOrder {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerName: row.customerName,
    deliveryAddress: row.deliveryAddress,
    warehouseCode: row.warehouseCode,
    warehouseName: row.warehouseName,
    vendorId: row.vendorId,
    vendorName: row.vendorName ?? undefined,
    vendorEmail: row.vendorEmail ?? undefined,
    status: row.status as OrderStatus,
    items: (row.items || []).map((i) => ({
      itemMasterId: i.itemMasterId,
      sku: i.sku,
      itemName: i.itemName,
      barcode: i.barcode,
      quantityRequested: i.quantityRequested,
      quantityPicked: i.quantityPicked,
      quantityPacked: i.quantityPacked,
      unitPrice: i.unitPrice !== null ? Number(i.unitPrice) : undefined,
    })),
    pickSteps: (row.pickSteps || []).length
      ? row.pickSteps.map((p) => ({
          stepNumber: p.stepNumber,
          itemMasterId: p.itemMasterId,
          sku: p.sku,
          itemName: p.itemName,
          barcode: p.barcode,
          binLocation: p.binLocation,
          zone: p.zone,
          quantityToPick: p.quantityToPick,
          isPicked: p.isPicked,
        }))
      : undefined,
    packageDetails: row.packageType
      ? {
          packageType: row.packageType,
          grossWeightKg: row.grossWeightKg ? Number(row.grossWeightKg) : 0,
          courierName: row.courierName || '',
          trackingNumber: row.trackingNumber || '',
          packedAt: row.packedAt?.toISOString(),
          packedByEmail: row.packedByEmail ?? undefined,
        }
      : undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadPersistentOrders(): Promise<OutboundOrder[]> {
  const rows = await prisma.outboundOrder.findMany({ include: OO_INCLUDE, orderBy: { createdAt: 'desc' } });
  return rows.map(toOrder);
}

/**
 * GENERATE OPTIMIZED PICK LIST FOR AN ORDER
 * Scans stock on hand and storage bin grids in the target warehouse.
 * Orders steps by warehouse zone (Zone A -> Zone B -> Zone C) for continuous pathing.
 */
export async function generatePickListForOrder(orderId: string): Promise<OutboundOrder | null> {
  const row = await prisma.outboundOrder.findFirst({ where: { OR: [{ id: orderId }, { orderNumber: orderId }] }, include: OO_INCLUDE });
  if (!row) return null;
  const order = toOrder(row);

  const stockOnHand = await calculateStockOnHand();
  const pickSteps: PickStep[] = [];
  let stepCounter = 1;

  for (const lineItem of order.items) {
    // Find matching stock records for this warehouse
    const matchingStock = stockOnHand.filter(
      (s) =>
        s.warehouseCode === order.warehouseCode &&
        (s.itemMasterId === lineItem.itemMasterId || s.sku.toLowerCase() === lineItem.sku.toLowerCase()) &&
        s.quantityOnHand > 0
    );

    let remainingToPick = lineItem.quantityRequested;

    for (const stockRecord of matchingStock) {
      if (remainingToPick <= 0) break;
      const pickQty = Math.min(remainingToPick, stockRecord.quantityOnHand);

      pickSteps.push({
        stepNumber: stepCounter++,
        itemMasterId: lineItem.itemMasterId,
        sku: lineItem.sku,
        itemName: lineItem.itemName,
        barcode: lineItem.barcode,
        binLocation: stockRecord.binLocation,
        zone: stockRecord.binLocation.startsWith('BIN-A')
          ? 'Zone A - Fast Pick'
          : stockRecord.binLocation.startsWith('BIN-B')
          ? 'Zone B - Bulk Storage'
          : 'Zone C - Overstock',
        quantityToPick: pickQty,
        isPicked: false,
      });

      remainingToPick -= pickQty;
    }

    // Fallback if no specific bin found
    if (pickSteps.filter((p) => p.itemMasterId === lineItem.itemMasterId).length === 0) {
      pickSteps.push({
        stepNumber: stepCounter++,
        itemMasterId: lineItem.itemMasterId,
        sku: lineItem.sku,
        itemName: lineItem.itemName,
        barcode: lineItem.barcode,
        binLocation: 'BIN-A1-01',
        zone: 'Zone A - Pick Face',
        quantityToPick: lineItem.quantityRequested,
        isPicked: false,
      });
    }
  }

  // Sort pick steps by Zone to optimize walking route
  pickSteps.sort((a, b) => a.zone.localeCompare(b.zone));

  const nextStatus = order.status === 'SUBMITTED' ? 'IN_PICKING' : order.status;

  await prisma.$transaction(async (tx) => {
    await tx.outboundOrderPickStep.deleteMany({ where: { outboundOrderId: row.id } });
    await tx.outboundOrderPickStep.createMany({
      data: pickSteps.map((p) => ({ ...p, outboundOrderId: row.id })),
    });
    await tx.outboundOrder.update({ where: { id: row.id }, data: { status: nextStatus } });
  });

  const updated = await prisma.outboundOrder.findUnique({ where: { id: row.id }, include: OO_INCLUDE });
  return updated ? toOrder(updated) : null;
}

/**
 * CREATE NEW OUTBOUND DISPATCH ORDER
 */
export async function createOutboundOrder(data: {
  customerName: string;
  deliveryAddress: string;
  warehouseCode: string;
  warehouseName: string;
  vendorId?: string | null;
  vendorName?: string;
  vendorEmail?: string;
  items: Array<{
    itemMasterId: string;
    sku: string;
    itemName: string;
    barcode: string;
    quantityRequested: number;
    unitPrice?: number;
  }>;
  notes?: string;
}): Promise<OutboundOrder> {
  const stockOnHand = await calculateStockOnHand();
  const shortItems = [];
  for (const i of data.items) {
    const stockRec = stockOnHand.find(s => s.warehouseCode === data.warehouseCode && (s.itemMasterId === i.itemMasterId || s.sku.toLowerCase() === i.sku.toLowerCase()));
    const available = stockRec ? stockRec.quantityAvailable : 0;
    if (available < i.quantityRequested) {
      shortItems.push(`${i.sku} (Req: ${i.quantityRequested}, Avail: ${available})`);
    }
  }
  if (shortItems.length > 0) {
    throw new Error(`Insufficient stock for items: ${shortItems.join(', ')}`);
  }

  const orderNumber = `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

  const row = await prisma.outboundOrder.create({
    data: {
      orderNumber,
      customerName: data.customerName,
      deliveryAddress: data.deliveryAddress,
      warehouseCode: data.warehouseCode,
      warehouseName: data.warehouseName,
      vendorId: data.vendorId || null,
      vendorName: data.vendorName || 'Vendor Partner',
      vendorEmail: data.vendorEmail || undefined,
      status: 'SUBMITTED',
      notes: data.notes || '',
      items: {
        create: data.items.map((i) => ({
          itemMasterId: i.itemMasterId,
          sku: i.sku,
          itemName: i.itemName,
          barcode: i.barcode,
          quantityRequested: i.quantityRequested,
          quantityPicked: 0,
          quantityPacked: 0,
          unitPrice: i.unitPrice,
        })),
      },
    },
    include: OO_INCLUDE,
  });

  return toOrder(row);
}

/**
 * CONFIRM ORDER PACKING & TRIGGER PHYSICAL STOCK DECREMENT
 * 1. Sets order status to PACKED
 * 2. Writes package weight, carton type, tracking number
 * 3. Appends an ISSUE movement row to the stock ledger for every packed item
 */
export async function confirmOrderPacking(
  orderId: string,
  packageInfo: {
    packageType: string;
    grossWeightKg: number;
    courierName?: string;
  },
  operatorEmail: string
): Promise<{ success: boolean; order?: OutboundOrder; message: string }> {
  const row = await prisma.outboundOrder.findFirst({ where: { OR: [{ id: orderId }, { orderNumber: orderId }] }, include: OO_INCLUDE });
  if (!row) {
    return { success: false, message: 'Order not found' };
  }
  const order = toOrder(row);

  if (order.status === 'PACKED' || order.status === 'DISPATCHED' || order.status === 'CANCELLED') {
    throw new Error('Order has already been packed/dispatched/cancelled');
  }

  if (order.status !== 'SUBMITTED' && order.status !== 'IN_PICKING' && order.status !== 'PICKED') {
    return { success: false, message: `Order cannot be packed from status: ${order.status}` };
  }

  const trackingNum = `TRK-${order.orderNumber}-${Math.floor(1000 + Math.random() * 9000)}`;

  await prisma.$transaction(async (tx) => {
    await tx.outboundOrder.update({
      where: { id: row.id },
      data: {
        status: 'PACKED',
        packageType: packageInfo.packageType,
        grossWeightKg: packageInfo.grossWeightKg,
        courierName: packageInfo.courierName || 'StarTrack Express',
        trackingNumber: trackingNum,
        packedAt: new Date(),
        packedByEmail: operatorEmail,
      },
    });
    for (const item of order.items) {
      await tx.outboundOrderItem.updateMany({
        where: { outboundOrderId: row.id, itemMasterId: item.itemMasterId },
        data: { quantityPicked: item.quantityRequested, quantityPacked: item.quantityRequested },
      });
    }
  });

  // PHYSICAL STOCK DECREMENT TRIGGER: Appends ISSUE movement row to stock ledger for each item
  for (const item of order.items) {
    const matchingSteps = order.pickSteps?.filter((p) => p.itemMasterId === item.itemMasterId) || [];

    if (matchingSteps.length > 0) {
      for (const step of matchingSteps) {
        await addStockLedgerEntry({
          warehouseId: order.warehouseCode.toLowerCase().replace(/-/g, '_'),
          warehouseCode: order.warehouseCode,
          warehouseName: order.warehouseName,
          itemMasterId: item.itemMasterId,
          sku: item.sku,
          barcode: item.barcode,
          itemName: item.itemName,
          vendorId: order.vendorId || null,
          vendorName: order.vendorName || 'LogiQ-On Internal Stock',
          binLocation: step.binLocation,
          movementType: 'ISSUE',
          quantityDelta: -Math.abs(step.quantityToPick),
          referenceNumber: order.orderNumber,
          reasonCode: `Outbound Customer Order Fulfillment (${order.orderNumber})`,
          createdById: 'usr_wh_operator',
          createdByEmail: operatorEmail,
        });
      }
    } else {
      await addStockLedgerEntry({
        warehouseId: order.warehouseCode.toLowerCase().replace(/-/g, '_'),
        warehouseCode: order.warehouseCode,
        warehouseName: order.warehouseName,
        itemMasterId: item.itemMasterId,
        sku: item.sku,
        barcode: item.barcode,
        itemName: item.itemName,
        vendorId: order.vendorId || null,
        vendorName: order.vendorName || 'LogiQ-On Internal Stock',
        binLocation: 'BIN-A1-01',
        movementType: 'ISSUE',
        quantityDelta: -Math.abs(item.quantityRequested),
        referenceNumber: order.orderNumber,
        reasonCode: `Outbound Customer Order Fulfillment (${order.orderNumber})`,
        createdById: 'usr_wh_operator',
        createdByEmail: operatorEmail,
      });
    }
  }

  const updated = await prisma.outboundOrder.findUnique({ where: { id: row.id }, include: OO_INCLUDE });

  return {
    success: true,
    order: updated ? toOrder(updated) : undefined,
    message: `Successfully packed ${order.orderNumber}. Physical stock decremented and immutable ISSUE movement rows logged.`,
  };
}

export async function dispatchOutboundOrder(
  orderId: string,
  manifestInfo: {
    manifestId?: string;
    driverName?: string;
    vehicleReg?: string;
    notes?: string;
  },
  operatorEmail: string
): Promise<{ success: boolean; order?: OutboundOrder; message: string }> {
  const row = await prisma.outboundOrder.findFirst({ where: { OR: [{ id: orderId }, { orderNumber: orderId }] }, include: OO_INCLUDE });
  if (!row) {
    return { success: false, message: 'Order not found' };
  }
  const order = toOrder(row);

  if (order.status !== 'PACKED') {
    return { success: false, message: `Order must be in PACKED status prior to dispatch release (Current: ${order.status}).` };
  }

  const manifestRef = manifestInfo.manifestId || `MANIFEST-${order.warehouseCode}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const dispatchNote = `Dispatched via Carrier Manifest #${manifestRef}. Driver: ${manifestInfo.driverName || 'StarTrack Express Freight'} (${manifestInfo.vehicleReg || 'NSW-TRK-901'}). ${manifestInfo.notes || ''}`.trim();
  const nextNotes = order.notes ? `${order.notes} | ${dispatchNote}` : dispatchNote;

  const data: any = { status: 'DISPATCHED', notes: nextNotes };
  if (!order.packageDetails) {
    data.packageType = 'Shipper Carton A1';
    data.grossWeightKg = 3.5;
    data.courierName = 'StarTrack Express';
    data.trackingNumber = `TRK-${order.orderNumber}-7712`;
  }

  const updated = await prisma.outboundOrder.update({ where: { id: row.id }, data, include: OO_INCLUDE });

  return {
    success: true,
    order: toOrder(updated),
    message: `Order ${order.orderNumber} successfully DISPATCHED to carrier under Manifest #${manifestRef}!`,
  };
}

export async function markOrderPicked(orderId: string): Promise<OutboundOrder | null> {
  const row = await prisma.outboundOrder.findFirst({ where: { OR: [{ id: orderId }, { orderNumber: orderId }] } });
  if (!row) return null;
  if (row.status !== 'IN_PICKING') {
    const full = await prisma.outboundOrder.findUnique({ where: { id: row.id }, include: OO_INCLUDE });
    return full ? toOrder(full) : null;
  }
  const updated = await prisma.outboundOrder.update({ where: { id: row.id }, data: { status: 'PICKED' }, include: OO_INCLUDE });
  return toOrder(updated);
}

export async function cancelOrder(orderId: string): Promise<OutboundOrder | null> {
  const row = await prisma.outboundOrder.findFirst({ where: { OR: [{ id: orderId }, { orderNumber: orderId }] }, include: OO_INCLUDE });
  if (!row) return null;
  const order = toOrder(row);

  if (order.status !== 'DISPATCHED') {
    if (order.status === 'PACKED' && order.items) {
      for (const item of order.items) {
        const qty = item.quantityPacked || item.quantityRequested || 0;
        if (qty > 0) {
          const bin = order.pickSteps?.find((p) => p.itemMasterId === item.itemMasterId)?.binLocation || 'BIN-A1-01';
          await addStockLedgerEntry({
            warehouseId: order.warehouseCode.toLowerCase().replace(/-/g, '_'),
            warehouseCode: order.warehouseCode,
            warehouseName: order.warehouseCode,
            binLocation: bin,
            itemMasterId: item.itemMasterId,
            sku: item.sku,
            barcode: '',
            itemName: item.itemName,
            movementType: 'RETURN',
            quantityDelta: Math.abs(qty),
            referenceNumber: order.orderNumber,
            reasonCode: `Order ${order.orderNumber} cancelled — stock reversal`,
            createdById: 'system',
            createdByEmail: 'system@logiqon.com',
          });
        }
      }
    }
    const updated = await prisma.outboundOrder.update({ where: { id: row.id }, data: { status: 'CANCELLED' }, include: OO_INCLUDE });
    return toOrder(updated);
  }
  return order;
}
