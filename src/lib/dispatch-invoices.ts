import fs from 'fs';
import { dataFilePath, ensureDataDir } from './storage';

// Dispatch Invoice & Payment Register — matches the shared spec table columns:
// Dispatch No. | PO Number | Amount Value | Invoice No. | Attachment | Payment Status.
// Extended fields per SRS §7.7 (customer invoicing/receipts) + §7.8 (supplier invoices).

export type PaymentStatus =
  | 'NOT_INVOICED'
  | 'INVOICE_ISSUED'
  | 'PAYMENT_PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'ON_HOLD'
  | 'DISPUTED'
  | 'CANCELLED';

export interface DispatchInvoice {
  id: string;
  dispatchNumber: string;
  salesOrderNumber?: string;
  customerPoNumber?: string;
  customerName: string;
  dispatchValue: number;
  currency: string;
  invoiceNumber: string;
  invoiceDate?: string;
  invoiceAmount: number;
  attachment?: { fileName: string; fileUrl?: string; type: 'INVOICE' | 'POD' | 'DELIVERY_NOTE' };
  paymentDueDate?: string;
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  paymentReference?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

const FILE = 'dispatch_invoices.json';

const SEED_DISPATCH_INVOICES: DispatchInvoice[] = [
  {
    id: 'dinv_seed_1',
    dispatchNumber: 'DSP-2026-00087',
    salesOrderNumber: 'SO-2026-00125',
    customerPoNumber: 'PO-45872',
    customerName: 'Customer A',
    dispatchValue: 5250.00,
    currency: 'AUD',
    invoiceNumber: 'INV-2026-0145',
    invoiceDate: new Date().toISOString(),
    invoiceAmount: 5250.00,
    attachment: { fileName: 'INV-2026-0145.pdf', type: 'INVOICE' },
    paymentDueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    paymentStatus: 'PAYMENT_PENDING',
    comments: 'Awaiting customer remittance advice',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dinv_seed_2',
    dispatchNumber: 'DSP-2026-00088',
    salesOrderNumber: 'SO-2026-00126',
    customerPoNumber: 'PO-45895',
    customerName: 'Customer B',
    dispatchValue: 8750.00,
    currency: 'AUD',
    invoiceNumber: 'INV-2026-0146',
    invoiceDate: new Date().toISOString(),
    invoiceAmount: 8750.00,
    attachment: { fileName: 'INV-2026-0146.pdf', type: 'DELIVERY_NOTE' },
    paymentDueDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    paymentStatus: 'PAID',
    paymentDate: new Date().toISOString(),
    paymentReference: 'BANK-REF-77821',
    comments: 'Settled via EFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function loadDispatchInvoices(): DispatchInvoice[] {
  ensureDataDir();
  const p = dataFilePath(FILE);
  if (!fs.existsSync(p)) return SEED_DISPATCH_INVOICES;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as DispatchInvoice[];
  } catch {
    return SEED_DISPATCH_INVOICES;
  }
}

export function saveDispatchInvoices(records: DispatchInvoice[]) {
  ensureDataDir();
  fs.writeFileSync(dataFilePath(FILE), JSON.stringify(records, null, 2), 'utf-8');
}

export function createDispatchInvoice(input: Omit<DispatchInvoice, 'id' | 'createdAt' | 'updatedAt'>): DispatchInvoice {
  const now = new Date().toISOString();
  const rec: DispatchInvoice = {
    ...input,
    id: `dinv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  const records = loadDispatchInvoices();
  records.push(rec);
  saveDispatchInvoices(records);
  return rec;
}

export function updateDispatchInvoice(id: string, patch: Partial<DispatchInvoice>): DispatchInvoice | null {
  const records = loadDispatchInvoices();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  records[idx] = { ...records[idx], ...patch, id: records[idx].id, updatedAt: new Date().toISOString() };
  saveDispatchInvoices(records);
  return records[idx];
}
