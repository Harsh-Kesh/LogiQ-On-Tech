import fs from 'fs';
import { dataFilePath, ensureDataDir } from './storage';
import { nextDocumentNumber } from './document-sequences';

// Owner-side #7, #8 — Sales Invoice creation + send to customer. FR-CI-001..008.

export type CustomerInvoiceStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'SENT'
  | 'VIEWED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID';

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string; // INV-YYYY-#####
  salesOrderNumber: string;
  dispatchNumber?: string;
  customerName: string;
  customerEmail?: string;
  billingAddress?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  lines: Array<{ itemCode: string; itemName: string; quantity: number; unitPrice: number; taxPercent: number; lineTotal: number }>;
  subtotal: number;
  taxTotal: number;
  totalValue: number;
  amountPaid: number;
  status: CustomerInvoiceStatus;
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;
  pdfSnapshot?: string; // stored path or filename
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const FILE = 'customer_invoices.json';

const SEED_CI: CustomerInvoice[] = [
  {
    id: 'ci_seed_1',
    invoiceNumber: 'INV-2026-0145',
    salesOrderNumber: 'SO-2026-00125',
    dispatchNumber: 'DSP-2026-00087',
    customerName: 'Customer A',
    customerEmail: 'ap@customer-a.example',
    billingAddress: '12 Collins St, Melbourne VIC 3000',
    issueDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    currency: 'AUD',
    lines: [
      { itemCode: 'ITEM-001', itemName: 'Zebra DS2200 Handheld Barcode Scanner', quantity: 50, unitPrice: 105.00, taxPercent: 10, lineTotal: 5775.00 },
    ],
    subtotal: 5250.00,
    taxTotal: 525.00,
    totalValue: 5775.00,
    amountPaid: 0,
    status: 'SENT',
    sentAt: new Date().toISOString(),
    createdBy: 'owner@logiqon.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function loadCustomerInvoices(): CustomerInvoice[] {
  ensureDataDir();
  const p = dataFilePath(FILE);
  if (!fs.existsSync(p)) return SEED_CI;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as CustomerInvoice[];
  } catch {
    return SEED_CI;
  }
}

export function saveCustomerInvoices(records: CustomerInvoice[]) {
  ensureDataDir();
  fs.writeFileSync(dataFilePath(FILE), JSON.stringify(records, null, 2), 'utf-8');
}

export function nextInvoiceNumber(): string {
  const y = new Date().getFullYear();
  const existing = loadCustomerInvoices();
  const seq = existing.filter((r) => r.invoiceNumber.includes(`INV-${y}-`)).length + 1;
  return `INV-${y}-${String(seq).padStart(4, '0')}`;
}

// BR-012 atomic number allocation.
export async function createCustomerInvoice(input: Omit<CustomerInvoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'status' | 'amountPaid'> & { status?: CustomerInvoiceStatus }): Promise<CustomerInvoice> {
  const now = new Date().toISOString();
  const rec: CustomerInvoice = {
    ...input,
    id: `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    invoiceNumber: await nextDocumentNumber('CI'),
    status: input.status || 'DRAFT',
    amountPaid: 0,
    createdAt: now,
    updatedAt: now,
  };
  const records = loadCustomerInvoices();
  records.push(rec);
  saveCustomerInvoices(records);
  return rec;
}

export function updateCustomerInvoice(id: string, patch: Partial<CustomerInvoice>): CustomerInvoice | null {
  const records = loadCustomerInvoices();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  records[idx] = { ...records[idx], ...patch, id: records[idx].id, updatedAt: new Date().toISOString() };
  saveCustomerInvoices(records);
  return records[idx];
}
