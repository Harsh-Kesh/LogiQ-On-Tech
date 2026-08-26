import fs from 'fs';
import { dataFilePath, ensureDataDir } from './storage';

// FR-MD-004: Customer Master Data — customer-specific selling terms per item.
// Key fields (per user spec): Customer Name, Item Code, Item Description,
// Selling Price, Currency, MOQ, Payment Terms.

export interface CustomerMasterRecord {
  id: string;
  customerName: string;
  itemCode: string;
  itemDescription: string;
  sellingPrice: number;
  currency: string;
  moq: number;
  paymentTerms: string;
  createdAt: string;
  updatedAt: string;
}

const FILE = 'customer_master_data.json';

export function loadCustomerMasterData(): CustomerMasterRecord[] {
  ensureDataDir();
  const p = dataFilePath(FILE);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as CustomerMasterRecord[];
  } catch {
    return [];
  }
}

export function saveCustomerMasterData(records: CustomerMasterRecord[]) {
  ensureDataDir();
  fs.writeFileSync(dataFilePath(FILE), JSON.stringify(records, null, 2), 'utf-8');
}

export function createCustomerMasterRecord(input: Omit<CustomerMasterRecord, 'id' | 'createdAt' | 'updatedAt'>): CustomerMasterRecord {
  const now = new Date().toISOString();
  const rec: CustomerMasterRecord = {
    ...input,
    id: `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  const records = loadCustomerMasterData();
  records.push(rec);
  saveCustomerMasterData(records);
  return rec;
}

export function updateCustomerMasterRecord(id: string, patch: Partial<CustomerMasterRecord>): CustomerMasterRecord | null {
  const records = loadCustomerMasterData();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  records[idx] = { ...records[idx], ...patch, id: records[idx].id, updatedAt: new Date().toISOString() };
  saveCustomerMasterData(records);
  return records[idx];
}

export function deleteCustomerMasterRecord(id: string): boolean {
  const records = loadCustomerMasterData();
  const next = records.filter((r) => r.id !== id);
  if (next.length === records.length) return false;
  saveCustomerMasterData(next);
  return true;
}
