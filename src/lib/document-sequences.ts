import { prisma } from './prisma';

// BR-012 / FR-MD-007 — Atomic document numbering.
// A single Postgres transaction with SELECT ... FOR UPDATE ensures two
// concurrent requests never receive the same number.

export type SequenceKey = 'SO' | 'PO' | 'DN' | 'CI' | 'VI' | 'CP' | 'VP' | 'OI' | 'TC';

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
  TC: { prefix: 'TRC', yearScope: true, padLength: 5 },
};

function formatNumber(prefix: string, year: number | null, value: number, pad: number): string {
  const padded = String(value).padStart(pad, '0');
  return year ? `${prefix}-${year}-${padded}` : `${prefix}-${padded}`;
}

/** Reserve the next document number for the given sequence key. */
export async function nextDocumentNumber(key: SequenceKey): Promise<string> {
  const cfg = SEQUENCE_CONFIGS[key];
  const nowYear = cfg.yearScope ? new Date().getFullYear() : null;

  const { newYear, newValue } = await prisma.$transaction(async (tx) => {
    const existing = await tx.$queryRawUnsafe<any[]>(
      'SELECT id, "currentYear", "currentValue" FROM document_sequences WHERE key = $1 FOR UPDATE',
      key
    );

    let row = existing[0];
    if (!row) {
      const id = `${key.toLowerCase()}_${Date.now().toString(36)}`;
      await tx.$executeRawUnsafe(
        'INSERT INTO document_sequences (id, key, prefix, "yearScope", "currentYear", "currentValue", "padLength", "updatedAt", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())',
        id, key, cfg.prefix, cfg.yearScope, nowYear, 0, cfg.padLength
      );
      row = { currentYear: nowYear, currentValue: 0 };
    }

    const newYear = cfg.yearScope ? nowYear : null;
    const currentValue = (cfg.yearScope && row.currentYear !== nowYear) ? 0 : row.currentValue;
    const newValue = currentValue + 1;

    await tx.$executeRawUnsafe(
      'UPDATE document_sequences SET "currentYear" = $1, "currentValue" = $2, "updatedAt" = NOW() WHERE key = $3',
      newYear, newValue, key
    );

    return { newYear, newValue };
  });

  return formatNumber(cfg.prefix, newYear, newValue, cfg.padLength);
}

/** Preview what the next number would be without incrementing. Useful for UI hints. */
export async function peekNextDocumentNumber(key: SequenceKey): Promise<string> {
  const cfg = SEQUENCE_CONFIGS[key];
  const nowYear = cfg.yearScope ? new Date().getFullYear() : null;
  const row = await prisma.documentSequence.findUnique({ where: { key } });
  const value = (row && row.currentYear === nowYear) ? row.currentValue + 1 : 1;
  return formatNumber(cfg.prefix, nowYear, value, cfg.padLength);
}
