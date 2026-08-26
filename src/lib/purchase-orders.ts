import fs from 'fs';
import { dataFilePath, ensureDataDir } from './storage';

// Owner-side #9, #10 — Purchase Orders. FR-PO-001..005.

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'SENT_TO_VENDOR'
  | 'VENDOR_CONFIRMED'
  | 'PARTIALLY_SUPPLIED'
  | 'RECEIVED'
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
  moq?: number;
  leadTimeDays?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const FILE = 'purchase_orders.json';

const SEED_PO: PurchaseOrder[] = [
  {
    id: 'po_seed_1',
    poNumber: 'PO-2026-00042',
    vendorName: 'Apex Hardware & Logistics Ltd',
    linkedSalesOrderNumber: 'SO-2026-00125',
    requestedDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
    paymentTerms: 'Net 30',
    currency: 'AUD',
    status: 'SENT_TO_VENDOR',
    lines: [
      { id: 'pol_1', itemCode: 'ITEM-001', itemName: 'Zebra DS2200 Handheld Barcode Scanner', quantity: 50, unitCost: 78.00, taxPercent: 10, lineTotal: 4290.00 },
    ],
    subtotal: 3900.00,
    taxTotal: 390.00,
    totalValue: 4290.00,
    moq: 25,
    leadTimeDays: 14,
    createdBy: 'owner@logiqon.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function loadPurchaseOrders(): PurchaseOrder[] {
  ensureDataDir();
  const p = dataFilePath(FILE);
  if (!fs.existsSync(p)) return SEED_PO;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as PurchaseOrder[];
  } catch {
    return SEED_PO;
  }
}

export function savePurchaseOrders(records: PurchaseOrder[]) {
  ensureDataDir();
  fs.writeFileSync(dataFilePath(FILE), JSON.stringify(records, null, 2), 'utf-8');
}

export function nextPoNumber(): string {
  const y = new Date().getFullYear();
  const existing = loadPurchaseOrders();
  const seq = existing.filter((r) => r.poNumber.includes(`PO-${y}-`)).length + 1;
  return `PO-${y}-${String(seq).padStart(5, '0')}`;
}

export function createPurchaseOrder(input: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt' | 'status'> & { status?: PurchaseOrderStatus }): PurchaseOrder {
  const now = new Date().toISOString();
  const rec: PurchaseOrder = {
    ...input,
    id: `po_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    poNumber: nextPoNumber(),
    status: input.status || 'DRAFT',
    createdAt: now,
    updatedAt: now,
  };
  const records = loadPurchaseOrders();
  records.push(rec);
  savePurchaseOrders(records);
  return rec;
}

export function updatePurchaseOrder(id: string, patch: Partial<PurchaseOrder>): PurchaseOrder | null {
  const records = loadPurchaseOrders();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  records[idx] = { ...records[idx], ...patch, id: records[idx].id, updatedAt: new Date().toISOString() };
  savePurchaseOrders(records);
  return records[idx];
}
