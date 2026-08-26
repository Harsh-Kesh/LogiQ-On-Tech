import fs from 'fs';
import { dataFilePath, ensureDataDir } from './storage';

// FR-DN-001..012 — Dispatch Notes. Structured to match:
//   • Warehouse Dispatch Note List (columns: SO No., Dispatch No., Customer, Item, Qty, Status, Tracking, Comments)
//   • End-to-end fulfilment: Pending → Allocated → Picking → Picked → Packing → Packed → Ready → Dispatched → Delivered.

export type DispatchStatus =
  | 'PENDING'
  | 'ALLOCATED'
  | 'PICKING'
  | 'PICKED'
  | 'PACKING'
  | 'PACKED'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'DELIVERY_EXCEPTION'
  | 'ON_HOLD'
  | 'RETURNED'
  | 'CANCELLED';

export const DISPATCH_STATUS_FLOW: DispatchStatus[] = [
  'PENDING',
  'ALLOCATED',
  'PICKING',
  'PICKED',
  'PACKING',
  'PACKED',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
];

export interface DispatchNote {
  id: string;
  dispatchNumber: string; // DSP-YYYY-#####
  salesOrderNumber: string;
  salesOrderId?: string;
  customerName: string;
  customerAddress: string;
  warehouseCode: string;
  warehouseName?: string;
  itemCode: string;
  itemName: string;
  orderedQty: number;
  dispatchQty: number;
  status: DispatchStatus;
  dispatchDate?: string;
  carrier?: string;
  trackingNumber?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

const FILE = 'dispatch_notes.json';

export function loadDispatchNotes(): DispatchNote[] {
  ensureDataDir();
  const p = dataFilePath(FILE);
  if (!fs.existsSync(p)) return SEED_DISPATCH_NOTES;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as DispatchNote[];
  } catch {
    return SEED_DISPATCH_NOTES;
  }
}

export function saveDispatchNotes(records: DispatchNote[]) {
  ensureDataDir();
  fs.writeFileSync(dataFilePath(FILE), JSON.stringify(records, null, 2), 'utf-8');
}

export function nextDispatchNumber(): string {
  const y = new Date().getFullYear();
  const existing = loadDispatchNotes();
  const seq = existing.filter((d) => d.dispatchNumber.includes(`DSP-${y}-`)).length + 1;
  return `DSP-${y}-${String(seq).padStart(5, '0')}`;
}

export function createDispatchNote(input: Omit<DispatchNote, 'id' | 'dispatchNumber' | 'createdAt' | 'updatedAt' | 'status'> & { status?: DispatchStatus }): DispatchNote {
  const now = new Date().toISOString();
  const rec: DispatchNote = {
    ...input,
    id: `dsp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    dispatchNumber: nextDispatchNumber(),
    status: input.status || 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
  const records = loadDispatchNotes();
  records.push(rec);
  saveDispatchNotes(records);
  return rec;
}

export function updateDispatchNote(id: string, patch: Partial<DispatchNote>): DispatchNote | null {
  const records = loadDispatchNotes();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  records[idx] = { ...records[idx], ...patch, id: records[idx].id, updatedAt: new Date().toISOString() };
  saveDispatchNotes(records);
  return records[idx];
}

// Seed a small demo set matching the SRS document example rows.
const SEED_DISPATCH_NOTES: DispatchNote[] = [
  {
    id: 'dsp_seed_1',
    dispatchNumber: 'DSP-2026-00087',
    salesOrderNumber: 'SO-2026-00125',
    customerName: 'Customer A',
    customerAddress: '12 Collins St, Melbourne VIC 3000',
    warehouseCode: 'WH-SYD-01',
    warehouseName: 'Sydney Central Logistics Hub',
    itemCode: 'ITEM-001',
    itemName: 'Zebra DS2200 Handheld Barcode Scanner',
    orderedQty: 50,
    dispatchQty: 50,
    status: 'PICKING',
    comments: 'Picking in progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dsp_seed_2',
    dispatchNumber: 'DSP-2026-00088',
    salesOrderNumber: 'SO-2026-00126',
    customerName: 'Customer B',
    customerAddress: '55 George St, Sydney NSW 2000',
    warehouseCode: 'WH-SYD-01',
    warehouseName: 'Sydney Central Logistics Hub',
    itemCode: 'ITEM-025',
    itemName: 'Honeywell CT47 Mobile Computer',
    orderedQty: 100,
    dispatchQty: 100,
    status: 'PACKED',
    comments: 'Ready for dispatch',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dsp_seed_3',
    dispatchNumber: 'DSP-2026-00089',
    salesOrderNumber: 'SO-2026-00127',
    customerName: 'Customer C',
    customerAddress: '200 Queen St, Brisbane QLD 4000',
    warehouseCode: 'WH-MEL-02',
    warehouseName: 'Melbourne Fulfilment Facility',
    itemCode: 'ITEM-014',
    itemName: 'Impinj Speedway R420 RFID Reader',
    orderedQty: 25,
    dispatchQty: 25,
    status: 'IN_TRANSIT',
    trackingNumber: 'TRK45879621',
    carrier: 'StarTrack Express',
    comments: 'Dispatched via courier',
    dispatchDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dsp_seed_4',
    dispatchNumber: 'DSP-2026-00090',
    salesOrderNumber: 'SO-2026-00128',
    customerName: 'Customer D',
    customerAddress: '350 St Georges Tce, Perth WA 6000',
    warehouseCode: 'WH-BNE-03',
    warehouseName: 'Brisbane Regional Depot',
    itemCode: 'ITEM-032',
    itemName: 'Bixolon SLP-DX420 Desktop Printer',
    orderedQty: 75,
    dispatchQty: 75,
    status: 'DELIVERED',
    trackingNumber: 'TRK45879635',
    carrier: 'Toll IPEC',
    comments: 'Delivered successfully',
    dispatchDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    actualDeliveryDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
