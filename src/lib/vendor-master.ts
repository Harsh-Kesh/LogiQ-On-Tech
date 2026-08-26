import fs from 'fs';
import { dataFilePath, ensureDataDir } from './storage';

// FR-MD-004: Vendor Master Data — vendor pricing per item with commercial terms.
// Key fields (per user spec): Vendor Name, Item Code, Item Description,
// Purchase Price, Currency, MOQ, Lead Time, Payment Terms.

export interface VendorMasterRecord {
  id: string;
  vendorName: string;
  itemCode: string;
  itemDescription: string;
  purchasePrice: number;
  currency: string;
  moq: number;
  leadTimeDays: number;
  paymentTerms: string;
  createdAt: string;
  updatedAt: string;
}

const FILE = 'vendor_master_data.json';

export function loadVendorMasterData(): VendorMasterRecord[] {
  ensureDataDir();
  const p = dataFilePath(FILE);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as VendorMasterRecord[];
  } catch {
    return [];
  }
}

export function saveVendorMasterData(records: VendorMasterRecord[]) {
  ensureDataDir();
  fs.writeFileSync(dataFilePath(FILE), JSON.stringify(records, null, 2), 'utf-8');
}

export function createVendorMasterRecord(input: Omit<VendorMasterRecord, 'id' | 'createdAt' | 'updatedAt'>): VendorMasterRecord {
  const now = new Date().toISOString();
  const rec: VendorMasterRecord = {
    ...input,
    id: `vmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  const records = loadVendorMasterData();
  records.push(rec);
  saveVendorMasterData(records);
  return rec;
}

export function updateVendorMasterRecord(id: string, patch: Partial<VendorMasterRecord>): VendorMasterRecord | null {
  const records = loadVendorMasterData();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  records[idx] = { ...records[idx], ...patch, id: records[idx].id, updatedAt: new Date().toISOString() };
  saveVendorMasterData(records);
  return records[idx];
}

export function deleteVendorMasterRecord(id: string): boolean {
  const records = loadVendorMasterData();
  const next = records.filter((r) => r.id !== id);
  if (next.length === records.length) return false;
  saveVendorMasterData(next);
  return true;
}
