import fs from 'fs';
import { dataFilePath, ensureDataDir } from './storage';
import { prisma } from './prisma';

// BR-012 / FR-MD-007 — Atomic document numbering.
// Postgres path uses `prisma.$transaction` with SELECT ... FOR UPDATE via
// raw SQL so two concurrent requests never receive the same number.
// File-store fallback uses a same-process mutex.

export type SequenceKey = 'SO' | 'PO' | 'DN' | 'CI' | 'VI' | 'CP' | 'VP' | 'OI';

interface SequenceConfig {
  prefix: string;
  yearScope: boolean;
  padLength: number;
}

export const SEQUENCE_CONFIGS: Record<SequenceKey, SequenceConfig> = {
  SO: { prefix: 'SO', yearScope: true, padLength: 5 },
  PO: { prefix: 'PO', yearScope: true, padLength: 5 },
  DN: { prefix: 'DSP', yearScope: true, padLength: 5 },
  CI: { prefix: 'INV', yearScope: true, padLength: 4 },
  VI: { prefix: 'VIN', yearScope: true, padLength: 4 },
  CP: { prefix: 'PMT', yearScope: true, padLength: 5 },
  VP: { prefix: 'VPT', yearScope: true, padLength: 5 },
  OI: { prefix: 'ORQ', yearScope: true, padLength: 5 },
};

const FILE = 'document_sequences.json';

interface FileSequenceRecord {
  key: SequenceKey;
  prefix: string;
  yearScope: boolean;
  padLength: number;
  currentYear: number | null;
  currentValue: number;
  updatedAt: string;
}

function loadFileSequences(): FileSequenceRecord[] {
  ensureDataDir();
  const p = dataFilePath(FILE);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as FileSequenceRecord[];
  } catch {
    return [];
  }
}
function saveFileSequences(recs: FileSequenceRecord[]) {
  ensureDataDir();
  fs.writeFileSync(dataFilePath(FILE), JSON.stringify(recs, null, 2), 'utf-8');
}

// Simple per-process mutex chain — good enough for the file fallback.
let lock: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = lock.then(fn, fn);
  lock = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function formatNumber(prefix: string, year: number | null, value: number, pad: number): string {
  const padded = String(value).padStart(pad, '0');
  return year ? `${prefix}-${year}-${padded}` : `${prefix}-${padded}`;
}

/**
 * Reserve the next document number for the given sequence key.
 * Tries Postgres (row-level lock) first, falls back to file store.
 */
export async function nextDocumentNumber(key: SequenceKey): Promise<string> {
  const cfg = SEQUENCE_CONFIGS[key];
  const nowYear = cfg.yearScope ? new Date().getFullYear() : null;

  // Try DB first
  try {
    const res = await prisma.$transaction(async (tx) => {
      // Ensure row exists
      const existing = await tx.$queryRawUnsafe<any[]>(
        'SELECT id, "currentYear", "currentValue" FROM document_sequences WHERE key = $1 FOR UPDATE',
        key
      );
      if (existing.length === 0) {
        const id = `${key.toLowerCase()}_${Date.now().toString(36)}`;
        await tx.$executeRawUnsafe(
          'INSERT INTO document_sequences (id, key, prefix, "yearScope", "currentYear", "currentValue", "padLength", "updatedAt", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())',
          id, key, cfg.prefix, cfg.yearScope, nowYear, 0, cfg.padLength
        );
      }
      const row = existing[0] || { currentYear: null, currentValue: 0 };
      let newYear = cfg.yearScope ? nowYear : null;
      let newValue = row.currentValue + 1;
      if (cfg.yearScope && row.currentYear !== nowYear) {
        newValue = 1;
        newYear = nowYear;
      }
      await tx.$executeRawUnsafe(
        'UPDATE document_sequences SET "currentYear" = $1, "currentValue" = $2, "updatedAt" = NOW() WHERE key = $3',
        newYear, newValue, key
      );
      return { newYear, newValue };
    });
    return formatNumber(cfg.prefix, res.newYear, res.newValue, cfg.padLength);
  } catch (e) {
    // Fall through to file store (DB unavailable or table missing pre-migration)
  }

  return withLock(async () => {
    const recs = loadFileSequences();
    let rec = recs.find((r) => r.key === key);
    if (!rec) {
      rec = {
        key, prefix: cfg.prefix, yearScope: cfg.yearScope, padLength: cfg.padLength,
        currentYear: nowYear, currentValue: 0, updatedAt: new Date().toISOString(),
      };
      recs.push(rec);
    }
    if (cfg.yearScope && rec.currentYear !== nowYear) {
      rec.currentYear = nowYear;
      rec.currentValue = 0;
    }
    rec.currentValue += 1;
    rec.updatedAt = new Date().toISOString();
    saveFileSequences(recs);
    return formatNumber(cfg.prefix, rec.currentYear, rec.currentValue, cfg.padLength);
  });
}

/** Preview what the next number would be without incrementing. Useful for UI hints. */
export async function peekNextDocumentNumber(key: SequenceKey): Promise<string> {
  const cfg = SEQUENCE_CONFIGS[key];
  const nowYear = cfg.yearScope ? new Date().getFullYear() : null;
  const recs = loadFileSequences();
  const rec = recs.find((r) => r.key === key);
  let value = 1;
  if (rec && rec.currentYear === nowYear) value = rec.currentValue + 1;
  return formatNumber(cfg.prefix, nowYear, value, cfg.padLength);
}
