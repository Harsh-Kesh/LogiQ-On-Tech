import { prisma } from './prisma';
import { addStockLedgerEntry, loadPersistentWarehouses } from './stock';
import { loadPersistentProducts } from './products';

export type ReturnCondition = 'RESTOCKABLE' | 'DAMAGED_WRITE_OFF';

export interface RmaReturnRequest {
  id: string;
  rmaNumber: string; // e.g. RMA-2026-101
  orderId?: string | null;
  orderNumber?: string;
  customerName: string;
  itemMasterId: string;
  sku: string;
  itemName: string;
  barcode: string;
  warehouseCode: string;
  warehouseName: string;
  binLocation: string;
  quantityReturned: number;
  condition: ReturnCondition;
  reasonCode: string;
  notes?: string;
  createdById?: string;
  createdByEmail?: string;
  createdAt: string;
}

function toReturn(row: any): RmaReturnRequest {
  return {
    id: row.id,
    rmaNumber: row.rmaNumber,
    orderId: row.orderId,
    orderNumber: row.orderNumber ?? undefined,
    customerName: row.customerName,
    itemMasterId: row.itemMasterId,
    sku: row.sku,
    itemName: row.itemName,
    barcode: row.barcode,
    warehouseCode: row.warehouseCode,
    warehouseName: row.warehouseName,
    binLocation: row.binLocation,
    quantityReturned: row.quantityReturned,
    condition: row.condition as ReturnCondition,
    reasonCode: row.reasonCode,
    notes: row.notes ?? undefined,
    createdById: row.createdById ?? undefined,
    createdByEmail: row.createdByEmail ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadPersistentReturns(): Promise<RmaReturnRequest[]> {
  const rows = await prisma.rmaReturn.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toReturn);
}

export async function processRmaReturn(
  data: {
    rmaNumber?: string;
    orderId?: string;
    orderNumber?: string;
    customerName: string;
    itemMasterId: string;
    warehouseCode: string;
    binLocation: string;
    quantityReturned: number;
    condition: ReturnCondition;
    reasonCode: string;
    notes?: string;
    operatorEmail?: string;
    operatorId?: string;
  }
): Promise<RmaReturnRequest> {
  const persistentProducts = await loadPersistentProducts();
  const persistentWarehouses = await loadPersistentWarehouses();

  const item = persistentProducts[data.itemMasterId] || Object.values(persistentProducts).find((p) => p.id === data.itemMasterId || p.sku === data.itemMasterId);
  const wh = persistentWarehouses[data.warehouseCode.trim().toUpperCase()] || Object.values(persistentWarehouses).find((w) => w.code === data.warehouseCode || w.id === data.warehouseCode);

  const rmaNumber = data.rmaNumber || `RMA-2026-${Math.floor(100 + Math.random() * 900)}`;
  const warehouseCode = wh ? wh.code : data.warehouseCode;
  const warehouseName = wh ? wh.name : data.warehouseCode;
  const binLocation = data.binLocation.trim().toUpperCase();
  const itemMasterId = item ? item.id : data.itemMasterId;
  const sku = item ? item.sku : 'SKU-UNKNOWN';
  const itemName = item ? item.itemName : 'Returned Product Item';
  const barcode = item ? item.barcode : 'EAN-UNKNOWN';
  const createdByEmail = data.operatorEmail || 'system.operator@logiqon.com';
  const createdById = data.operatorId || 'usr_system';

  const row = await prisma.rmaReturn.create({
    data: {
      rmaNumber,
      orderId: data.orderId || null,
      orderNumber: data.orderNumber || 'DIRECT-RMA',
      customerName: data.customerName,
      itemMasterId,
      sku,
      itemName,
      barcode,
      warehouseCode,
      warehouseName,
      binLocation,
      quantityReturned: data.quantityReturned,
      condition: data.condition,
      reasonCode: data.reasonCode,
      notes: data.notes || '',
      createdByEmail,
      createdById,
    },
  });
  const newReturn = toReturn(row);

  // Determine Stock Ledger Action
  // If RESTOCKABLE -> Write RETURN movement row (+qty)
  // If DAMAGED_WRITE_OFF -> Write ADJUSTMENT write-off ledger row (0 qty to avoid double-deducting)
  const isRestockable = data.condition === 'RESTOCKABLE';
  const movementType = isRestockable ? 'RETURN' : 'ADJUSTMENT';
  const delta = isRestockable ? Math.abs(data.quantityReturned) : 0;
  const reasonText = isRestockable
    ? `RMA Customer Return (${newReturn.rmaNumber}): Restocked`
    : `RMA Customer Return (${newReturn.rmaNumber}): Damaged Write-off`;

  await addStockLedgerEntry({
    warehouseId: wh ? wh.id : 'wh_syd_01',
    warehouseCode,
    warehouseName,
    itemMasterId,
    sku,
    barcode,
    itemName,
    vendorId: item?.vendorId || null,
    vendorName: item?.vendorName || 'Vendor Partner',
    binLocation,
    movementType: movementType as any,
    quantityDelta: delta,
    referenceNumber: newReturn.rmaNumber,
    reasonCode: `${newReturn.reasonCode} - ${reasonText}`,
    createdById,
    createdByEmail,
  });

  return newReturn;
}
