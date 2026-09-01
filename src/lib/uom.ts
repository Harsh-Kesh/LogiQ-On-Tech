import { prisma } from './prisma';

export interface UnitOfMeasureItem {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export function getDefaultUOMs(): UnitOfMeasureItem[] {
  return [
    { id: 'uom_pcs', code: 'PCS', name: 'Pieces', description: 'Individual single unit' },
    { id: 'uom_box', code: 'BOX', name: 'Box of 10', description: 'Standard pack of 10 units' },
    { id: 'uom_ctn', code: 'CTN', name: 'Carton of 50', description: 'Master shipping carton of 50 units' },
    { id: 'uom_plt', code: 'PLT', name: 'Pallet of 500', description: 'Standard Australian Wooden/Plastic Pallet' },
    { id: 'uom_kg', code: 'KG', name: 'Kilograms', description: 'Weight unit of measure' },
    { id: 'uom_mtr', code: 'MTR', name: 'Meters', description: 'Linear length measure for cabling & ribbons' },
    { id: 'uom_pk', code: 'PK', name: 'Pack of 100', description: 'Label & tag roll bundle' },
  ];
}

/** Bootstraps the default UOM list by code (the actual unique key), without disturbing any UOMs added since. */
async function ensureSeeded() {
  const defaults = getDefaultUOMs();
  const existing = await prisma.unitOfMeasure.findMany({ where: { code: { in: defaults.map((u) => u.code) } }, select: { code: true } });
  const existingCodes = new Set(existing.map((r) => r.code));
  const missing = defaults.filter((u) => !existingCodes.has(u.code));
  if (missing.length === 0) return;
  await prisma.unitOfMeasure.createMany({ data: missing });
}

export async function loadUOMs(): Promise<UnitOfMeasureItem[]> {
  await ensureSeeded();
  const rows = await prisma.unitOfMeasure.findMany({ orderBy: { code: 'asc' } });
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name, description: r.description ?? undefined }));
}

export async function createUOM(input: { code: string; name: string; description?: string }): Promise<UnitOfMeasureItem> {
  const id = `uom_${Date.now()}`;
  const row = await prisma.unitOfMeasure.create({
    data: { id, code: input.code.trim().toUpperCase(), name: input.name.trim(), description: input.description || '' },
  });
  return { id: row.id, code: row.code, name: row.name, description: row.description ?? undefined };
}

export async function updateUOM(id: string, input: { name?: string; description?: string }): Promise<UnitOfMeasureItem> {
  const data: any = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.description !== undefined) data.description = input.description;
  const row = await prisma.unitOfMeasure.update({ where: { id }, data });
  return { id: row.id, code: row.code, name: row.name, description: row.description ?? undefined };
}

export async function deleteUOM(id: string): Promise<void> {
  await prisma.unitOfMeasure.delete({ where: { id } });
}
