import fs from 'fs';

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

import { ensureDataDir, dataFilePath } from './storage';
const RETURNS_FILE = dataFilePath('persistent_returns.json');


export function loadPersistentReturns(): RmaReturnRequest[] {
  ensureDataDir();
  try {
    if (fs.existsSync(RETURNS_FILE)) {
      const data = fs.readFileSync(RETURNS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {}

  const seeded = getSeededReturns();
  savePersistentReturns(seeded);
  return seeded;
}

export function savePersistentReturns(returnsList: RmaReturnRequest[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(RETURNS_FILE, JSON.stringify(returnsList, null, 2), 'utf-8');
  } catch (e) {
    console.error('[RETURNS] Failed to persist returns data:', e);
  }
}

export function getSeededReturns(): RmaReturnRequest[] {
  return [
    {
      id: 'rma_seeded_101',
      rmaNumber: 'RMA-2026-101',
      orderId: 'ord_syd_901',
      orderNumber: 'ORD-2026-901',
      customerName: 'TechRetail Logistics Centre Sydney',
      itemMasterId: 'item_01',
      sku: 'LQ-SCN-00101',
      itemName: 'Industrial Handheld Wireless Barcode Scanner 2D (HD-900)',
      barcode: '9312345001015',
      warehouseCode: 'WH-SYD-01',
      warehouseName: 'Sydney Central Logistics Hub',
      binLocation: 'BIN-A1-01',
      quantityReturned: 1,
      condition: 'RESTOCKABLE',
      reasonCode: 'Customer Ordered Excess Stock',
      notes: 'Inspected by Sydney Warehouse Desk, original seal intact.',
      createdByEmail: 'sydney.manager@logiqon.com',
      createdAt: '2026-08-11T10:15:00.000Z',
    },
    {
      id: 'rma_seeded_102',
      rmaNumber: 'RMA-2026-102',
      orderId: 'ord_mel_902',
      orderNumber: 'ORD-2026-902',
      customerName: 'Victorian Express Fulfillment Depot',
      itemMasterId: 'item_02',
      sku: 'LQ-PRT-00102',
      itemName: 'Thermal Transfer Desktop Label Printer 300DPI (LogiPrint-30)',
      barcode: '9312345001022',
      warehouseCode: 'WH-MEL-02',
      warehouseName: 'Melbourne Fulfilment Facility',
      binLocation: 'BIN-A1-02',
      quantityReturned: 1,
      condition: 'DAMAGED_WRITE_OFF',
      reasonCode: 'Transit Damage by Carrier',
      notes: 'Casing cracked during carrier transit, isolated to write-off bay.',
      createdByEmail: 'melbourne.manager@logiqon.com',
      createdAt: '2026-08-11T11:45:00.000Z',
    },
  ];
}

export function processRmaReturn(
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
): RmaReturnRequest {
  const returnsList = loadPersistentReturns();
  const persistentProducts = loadPersistentProducts();
  const persistentWarehouses = loadPersistentWarehouses();

  const item = persistentProducts[data.itemMasterId] || Object.values(persistentProducts).find((p) => p.id === data.itemMasterId || p.sku === data.itemMasterId);
  const wh = persistentWarehouses[data.warehouseCode.trim().toUpperCase()] || Object.values(persistentWarehouses).find((w) => w.code === data.warehouseCode || w.id === data.warehouseCode);

  const rmaNum = data.rmaNumber || `RMA-2026-${Math.floor(100 + Math.random() * 900)}`;

  const newReturn: RmaReturnRequest = {
    id: `rma_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    rmaNumber: rmaNum,
    orderId: data.orderId || null,
    orderNumber: data.orderNumber || 'DIRECT-RMA',
    customerName: data.customerName,
    itemMasterId: item ? item.id : data.itemMasterId,
    sku: item ? item.sku : 'SKU-UNKNOWN',
    itemName: item ? item.itemName : 'Returned Product Item',
    barcode: item ? item.barcode : 'EAN-UNKNOWN',
    warehouseCode: wh ? wh.code : data.warehouseCode,
    warehouseName: wh ? wh.name : data.warehouseCode,
    binLocation: data.binLocation.trim().toUpperCase(),
    quantityReturned: data.quantityReturned,
    condition: data.condition,
    reasonCode: data.reasonCode,
    notes: data.notes || '',
    createdByEmail: data.operatorEmail || 'system.operator@logiqon.com',
    createdById: data.operatorId || 'usr_system',
    createdAt: new Date().toISOString(),
  };

  // Determine Stock Ledger Action
  // If RESTOCKABLE -> Write RETURN movement row (+qty)
  // If DAMAGED_WRITE_OFF -> Write ADJUSTMENT write-off ledger row (0 qty to avoid double-deducting)
  const isRestockable = data.condition === 'RESTOCKABLE';
  const movementType = isRestockable ? 'RETURN' : 'ADJUSTMENT';
  const delta = isRestockable ? Math.abs(data.quantityReturned) : 0;
  const reasonText = isRestockable
    ? `RMA Customer Return (${newReturn.rmaNumber}): Restocked`
    : `RMA Customer Return (${newReturn.rmaNumber}): Damaged Write-off`;
  const referenceNumber = isRestockable
    ? newReturn.rmaNumber
    : `${newReturn.rmaNumber} - DAMAGED_WRITE_OFF - No stock movement (already deducted at dispatch)`;

  addStockLedgerEntry({
    warehouseId: wh ? wh.id : 'wh_syd_01',
    warehouseCode: newReturn.warehouseCode,
    warehouseName: newReturn.warehouseName,
    itemMasterId: newReturn.itemMasterId,
    sku: newReturn.sku,
    barcode: newReturn.barcode,
    itemName: newReturn.itemName,
    vendorId: item?.vendorId || null,
    vendorName: item?.vendorName || 'Vendor Partner',
    binLocation: newReturn.binLocation,
    movementType: movementType as any,
    quantityDelta: delta,
    referenceNumber: newReturn.rmaNumber,
    reasonCode: `${newReturn.reasonCode} - ${reasonText}`,
    createdById: newReturn.createdById || 'usr_system',
    createdByEmail: newReturn.createdByEmail || 'system.operator@logiqon.com',
  });

  returnsList.unshift(newReturn);
  savePersistentReturns(returnsList);
  return newReturn;
}
