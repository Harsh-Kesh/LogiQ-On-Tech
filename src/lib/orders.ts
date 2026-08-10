import fs from 'fs';
import path from 'path';
import { loadPersistentStockLedger, savePersistentStockLedger, loadPersistentWarehouses, calculateStockOnHand, addStockLedgerEntry } from './stock';

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
  status: OrderStatus;
  items: OrderItem[];
  pickSteps?: PickStep[];
  packageDetails?: PackageDetails;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_DIR = path.join(process.cwd(), '.data');
const ORDERS_FILE = path.join(STORAGE_DIR, 'persistent_orders.json');

function ensureStorageDirExists() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export function getSeededOrders(): OutboundOrder[] {
  return [
    {
      id: 'ord_syd_901',
      orderNumber: 'ORD-2026-901',
      customerName: 'TechRetail Logistics Centre Sydney',
      deliveryAddress: '44 Market Street, Sydney NSW 2000',
      warehouseCode: 'WH-SYD-01',
      warehouseName: 'Sydney Central Logistics Hub',
      vendorId: 'vnd_usr_vendor_01',
      vendorName: 'Apex Hardware & Logistics Ltd',
      status: 'SUBMITTED',
      items: [
        {
          itemMasterId: 'item_01',
          sku: 'LQ-SCN-00101',
          itemName: 'Industrial Handheld Wireless Barcode Scanner 2D (HD-900)',
          barcode: '9312345001015',
          quantityRequested: 5,
          quantityPicked: 0,
          quantityPacked: 0,
          unitPrice: 385.00,
        },
        {
          itemMasterId: 'item_09_plt',
          sku: 'LQ-PLT-00301',
          itemName: 'LogiQ-On Standard Wooden Pallet (Internal)',
          barcode: '9312345678903',
          quantityRequested: 2,
          quantityPicked: 0,
          quantityPacked: 0,
          unitPrice: 85.00,
        },
      ],
      notes: 'Priority Outbound Dispatch for Client Store Launch',
      createdAt: '2026-08-10T09:00:00.000Z',
      updatedAt: '2026-08-10T09:00:00.000Z',
    },
    {
      id: 'ord_mel_902',
      orderNumber: 'ORD-2026-902',
      customerName: 'Victorian Express Fulfillment Depot',
      deliveryAddress: '100 Spencer St, Melbourne VIC 3000',
      warehouseCode: 'WH-MEL-02',
      warehouseName: 'Melbourne Fulfilment Facility',
      vendorId: 'vnd_usr_vendor_01',
      vendorName: 'Apex Hardware & Logistics Ltd',
      status: 'SUBMITTED',
      items: [
        {
          itemMasterId: 'item_02',
          sku: 'LQ-PRT-00102',
          itemName: 'Thermal Transfer Desktop Label Printer 300DPI (LogiPrint-30)',
          barcode: '9312345001022',
          quantityRequested: 3,
          quantityPicked: 0,
          quantityPacked: 0,
          unitPrice: 520.00,
        },
      ],
      notes: 'Urgent Label Printer Replenishment',
      createdAt: '2026-08-10T10:30:00.000Z',
      updatedAt: '2026-08-10T10:30:00.000Z',
    },
  ];
}

export function loadPersistentOrders(): OutboundOrder[] {
  ensureStorageDirExists();
  const seeds = getSeededOrders();
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      const parsed: OutboundOrder[] = JSON.parse(data);
      const existingIds = new Set(parsed.map((o) => o.id));
      const missingSeeds = seeds.filter((s) => !existingIds.has(s.id));
      return [...missingSeeds, ...parsed];
    }
  } catch (e) {}
  return seeds;
}

export function savePersistentOrders(orders: OutboundOrder[]) {
  ensureStorageDirExists();
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {}
}

/**
 * GENERATE OPTIMIZED PICK LIST FOR AN ORDER
 * Scans stock on hand and storage bin grids in the target warehouse.
 * Orders steps by warehouse zone (Zone A -> Zone B -> Zone C) for continuous pathing.
 */
export function generatePickListForOrder(orderId: string): OutboundOrder | null {
  const orders = loadPersistentOrders();
  const order = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  if (!order) return null;

  const stockOnHand = calculateStockOnHand();
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

  order.pickSteps = pickSteps;
  if (order.status === 'SUBMITTED') {
    order.status = 'IN_PICKING';
  }
  order.updatedAt = new Date().toISOString();

  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx !== -1) orders[idx] = order;
  savePersistentOrders(orders);

  return order;
}

/**
 * CREATE NEW OUTBOUND DISPATCH ORDER
 */
export function createOutboundOrder(data: {
  customerName: string;
  deliveryAddress: string;
  warehouseCode: string;
  warehouseName: string;
  vendorId?: string | null;
  vendorName?: string;
  items: Array<{
    itemMasterId: string;
    sku: string;
    itemName: string;
    barcode: string;
    quantityRequested: number;
    unitPrice?: number;
  }>;
  notes?: string;
}): OutboundOrder {
  const orders = loadPersistentOrders();

  const newOrder: OutboundOrder = {
    id: `ord_${Date.now()}`,
    orderNumber: `ORD-2026-${Math.floor(100 + Math.random() * 900)}`,
    customerName: data.customerName,
    deliveryAddress: data.deliveryAddress,
    warehouseCode: data.warehouseCode,
    warehouseName: data.warehouseName,
    vendorId: data.vendorId || null,
    vendorName: data.vendorName || 'Vendor Partner',
    status: 'SUBMITTED',
    items: data.items.map((i) => ({
      ...i,
      quantityPicked: 0,
      quantityPacked: 0,
    })),
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  savePersistentOrders(orders);

  return newOrder;
}

/**
 * CONFIRM ORDER PACKING & TRIGGER PHYSICAL STOCK DECREMENT
 * 1. Sets order status to PACKED
 * 2. Writes package weight, carton type, tracking number
 * 3. Appends an ISSUE movement row to persistent_stock_ledger.json for every packed item
 */
export function confirmOrderPacking(
  orderId: string,
  packageInfo: {
    packageType: string;
    grossWeightKg: number;
    courierName?: string;
  },
  operatorEmail: string
): { success: boolean; order?: OutboundOrder; message: string } {
  const orders = loadPersistentOrders();
  const order = orders.find((o) => o.id === orderId || o.orderNumber === orderId);

  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  const trackingNum = `TRK-${order.orderNumber}-${Math.floor(1000 + Math.random() * 9000)}`;

  order.packageDetails = {
    packageType: packageInfo.packageType,
    grossWeightKg: packageInfo.grossWeightKg,
    courierName: packageInfo.courierName || 'StarTrack Express',
    trackingNumber: trackingNum,
    packedAt: new Date().toISOString(),
    packedByEmail: operatorEmail,
  };

  order.status = 'PACKED';
  order.updatedAt = new Date().toISOString();

  // Mark all line items as packed
  for (const item of order.items) {
    item.quantityPicked = item.quantityRequested;
    item.quantityPacked = item.quantityRequested;
  }

  // PHYSICAL STOCK DECREMENT TRIGGER: Appends ISSUE movement row to stock ledger for each item
  for (const item of order.items) {
    // Find bin location from pick steps or default to BIN-A1-01
    const matchingStep = order.pickSteps?.find((p) => p.itemMasterId === item.itemMasterId);
    const targetBin = matchingStep ? matchingStep.binLocation : 'BIN-A1-01';

    addStockLedgerEntry({
      warehouseId: `wh_${order.warehouseCode.toLowerCase().replace(/-/g, '_')}`,
      warehouseCode: order.warehouseCode,
      warehouseName: order.warehouseName,
      itemMasterId: item.itemMasterId,
      sku: item.sku,
      barcode: item.barcode,
      itemName: item.itemName,
      vendorId: order.vendorId || null,
      vendorName: order.vendorName || 'LogiQ-On Internal Stock',
      binLocation: targetBin,
      movementType: 'ISSUE',
      quantityDelta: -Math.abs(item.quantityRequested),
      referenceNumber: order.orderNumber,
      reasonCode: `Outbound Customer Order Fulfillment (${order.orderNumber})`,
      createdById: 'usr_wh_operator',
      createdByEmail: operatorEmail,
    });
  }

  savePersistentOrders(orders);

  return {
    success: true,
    order,
    message: `Successfully packed ${order.orderNumber}. Physical stock decremented and immutable ISSUE movement rows logged.`,
  };
}
