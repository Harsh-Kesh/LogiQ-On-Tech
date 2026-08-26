import fs from 'fs';
import { dataFilePath, ensureDataDir } from './storage';

// Owner-side #11, #12, #13, #14 — Vendor Invoice registration, view, payment, status.
// FR-SI-001..005, FR-SP-001..003.

export type VendorInvoiceStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ON_HOLD'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID';

export interface VendorInvoicePayment {
  id: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: string; // e.g. EFT, Cheque, BPAY
  bankReferenceNumber: string;
  comments?: string;
  createdBy: string;
}

export interface VendorInvoice {
  id: string;
  vendorInvoiceNumber: string; // supplier's number
  linkedPoNumber: string;
  vendorName: string;
  vendorId?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  invoiceAmount: number;
  varianceVsPo?: number;
  attachment?: { fileName: string; fileUrl?: string };
  status: VendorInvoiceStatus;
  payments: VendorInvoicePayment[];
  amountPaid: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const FILE = 'vendor_invoices.json';

const SEED_VI: VendorInvoice[] = [
  {
    id: 'vi_seed_1',
    vendorInvoiceNumber: 'APX-INV-88221',
    linkedPoNumber: 'PO-2026-00042',
    vendorName: 'Apex Hardware & Logistics Ltd',
    invoiceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    currency: 'AUD',
    invoiceAmount: 4290.00,
    attachment: { fileName: 'APX-INV-88221.pdf' },
    status: 'APPROVED',
    payments: [],
    amountPaid: 0,
    createdBy: 'owner@logiqon.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function loadVendorInvoices(): VendorInvoice[] {
  ensureDataDir();
  const p = dataFilePath(FILE);
  if (!fs.existsSync(p)) return SEED_VI;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as VendorInvoice[];
  } catch {
    return SEED_VI;
  }
}

export function saveVendorInvoices(records: VendorInvoice[]) {
  ensureDataDir();
  fs.writeFileSync(dataFilePath(FILE), JSON.stringify(records, null, 2), 'utf-8');
}

export function createVendorInvoice(input: Omit<VendorInvoice, 'id' | 'createdAt' | 'updatedAt' | 'payments' | 'amountPaid' | 'status'> & { status?: VendorInvoiceStatus }): VendorInvoice {
  const now = new Date().toISOString();
  const rec: VendorInvoice = {
    ...input,
    id: `vi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    status: input.status || 'SUBMITTED',
    payments: [],
    amountPaid: 0,
    createdAt: now,
    updatedAt: now,
  };
  const records = loadVendorInvoices();
  records.push(rec);
  saveVendorInvoices(records);
  return rec;
}

export function updateVendorInvoice(id: string, patch: Partial<VendorInvoice>): VendorInvoice | null {
  const records = loadVendorInvoices();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  records[idx] = { ...records[idx], ...patch, id: records[idx].id, updatedAt: new Date().toISOString() };
  saveVendorInvoices(records);
  return records[idx];
}

// Owner-side #13 Vendor Payment Processing + #14 Payment Status.
export function recordVendorPayment(invoiceId: string, payment: Omit<VendorInvoicePayment, 'id'>): VendorInvoice | null {
  const records = loadVendorInvoices();
  const idx = records.findIndex((r) => r.id === invoiceId);
  if (idx < 0) return null;
  const inv = records[idx];
  const paymentRec: VendorInvoicePayment = { ...payment, id: `vp_${Date.now().toString(36)}` };
  inv.payments.push(paymentRec);
  inv.amountPaid = inv.payments.reduce((s, p) => s + p.amountPaid, 0);
  if (inv.amountPaid >= inv.invoiceAmount) inv.status = 'PAID';
  else if (inv.amountPaid > 0) inv.status = 'PARTIALLY_PAID';
  inv.updatedAt = new Date().toISOString();
  records[idx] = inv;
  saveVendorInvoices(records);
  return inv;
}
