import fs from 'fs';
import { dataFilePath, ensureDataDir } from './storage';
import { nextDocumentNumber } from './document-sequences';

// Owner-side function #1, #2, #4 — Sales Orders and their allocation/dispatch statuses.
// FR-SO-001..010, FR-IN-001..007.

export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'STOCK_CHECK'
  | 'PARTIALLY_ALLOCATED'
  | 'ALLOCATED'
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
  customerPoReference?: string;
  deliveryLocation: string;
  requestedDeliveryDate?: string;
  paymentTerms: string;
  currency: string;
  status: SalesOrderStatus;
  lines: SalesOrderLine[];
  subtotal: number;
  taxTotal: number;
  totalValue: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const FILE = 'sales_orders.json';

const SEED_SO: SalesOrder[] = [
  {
    id: 'so_seed_1',
    salesOrderNumber: 'SO-2026-00125',
    customerName: 'Customer A',
    customerPoReference: 'PO-45872',
    deliveryLocation: '12 Collins St, Melbourne VIC 3000',
    requestedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    paymentTerms: 'Net 30',
    currency: 'AUD',
    status: 'ALLOCATED',
    lines: [
      { id: 'sol_1', itemCode: 'ITEM-001', itemName: 'Zebra DS2200 Handheld Barcode Scanner', quantity: 50, sellingPrice: 105.00, taxPercent: 10, lineTotal: 5775.00 },
    ],
    subtotal: 5250.00,
    taxTotal: 525.00,
    totalValue: 5775.00,
    createdBy: 'owner@logiqon.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'so_seed_2',
    salesOrderNumber: 'SO-2026-00126',
    customerName: 'Customer B',
    customerPoReference: 'PO-45895',
    deliveryLocation: '55 George St, Sydney NSW 2000',
    requestedDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    paymentTerms: 'Net 30',
    currency: 'AUD',
    status: 'READY_FOR_DISPATCH',
    lines: [
      { id: 'sol_2', itemCode: 'ITEM-025', itemName: 'Honeywell CT47 Mobile Computer', quantity: 100, sellingPrice: 87.50, taxPercent: 10, lineTotal: 9625.00 },
    ],
    subtotal: 8750.00,
    taxTotal: 875.00,
    totalValue: 9625.00,
    createdBy: 'owner@logiqon.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function loadSalesOrders(): SalesOrder[] {
  ensureDataDir();
  const p = dataFilePath(FILE);
  if (!fs.existsSync(p)) return SEED_SO;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as SalesOrder[];
  } catch {
    return SEED_SO;
  }
}

export function saveSalesOrders(records: SalesOrder[]) {
  ensureDataDir();
  fs.writeFileSync(dataFilePath(FILE), JSON.stringify(records, null, 2), 'utf-8');
}

// Legacy sync helper kept for callers not yet migrated to the atomic generator.
export function nextSalesOrderNumber(): string {
  const y = new Date().getFullYear();
  const existing = loadSalesOrders();
  const seq = existing.filter((r) => r.salesOrderNumber.includes(`SO-${y}-`)).length + 1;
  return `SO-${y}-${String(seq).padStart(5, '0')}`;
}

// BR-012 atomic number allocation.
export async function createSalesOrder(input: Omit<SalesOrder, 'id' | 'salesOrderNumber' | 'createdAt' | 'updatedAt' | 'status'> & { status?: SalesOrderStatus }): Promise<SalesOrder> {
  const now = new Date().toISOString();
  const rec: SalesOrder = {
    ...input,
    id: `so_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    salesOrderNumber: await nextDocumentNumber('SO'),
    status: input.status || 'DRAFT',
    createdAt: now,
    updatedAt: now,
  };
  const records = loadSalesOrders();
  records.push(rec);
  saveSalesOrders(records);
  return rec;
}

export function updateSalesOrder(id: string, patch: Partial<SalesOrder>): SalesOrder | null {
  const records = loadSalesOrders();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  records[idx] = { ...records[idx], ...patch, id: records[idx].id, updatedAt: new Date().toISOString() };
  saveSalesOrders(records);
  return records[idx];
}
