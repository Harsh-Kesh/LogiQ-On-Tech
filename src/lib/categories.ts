import { prisma } from './prisma';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string;
}

export function getDefaultCategoryTree(): CategoryItem[] {
  return [
    // Top-Level Parent 1: Industrial Hardware & Scanners
    { id: 'cat_hw', name: 'Industrial Hardware', slug: 'industrial-hardware', parentId: null, description: 'Warehouse equipment, scanners, and terminals' },
    { id: 'cat_hw_scn', name: 'Barcode Scanners', slug: 'barcode-scanners', parentId: 'cat_hw', description: '1D & 2D handheld, Bluetooth, and fixed-mount scanners' },
    { id: 'cat_hw_mob', name: 'Mobile Computers', slug: 'mobile-computers', parentId: 'cat_hw', description: 'Rugged handheld Android touch computers' },

    // Top-Level Parent 2: Label Printing & Supplies
    { id: 'cat_prt', name: 'Label Printing', slug: 'label-printing', parentId: null, description: 'Thermal printers, ribbons, and barcode labels' },
    { id: 'cat_prt_dsk', name: 'Desktop Printers', slug: 'desktop-printers', parentId: 'cat_prt', description: 'Compact thermal transfer & direct thermal printers' },
    { id: 'cat_prt_ind', name: 'Industrial Printers', slug: 'industrial-printers', parentId: 'cat_prt', description: 'High-volume 24/7 heavy-duty label printers' },
    { id: 'cat_prt_lbl', name: 'Barcode Labels & Ribbons', slug: 'labels-ribbons', parentId: 'cat_prt', description: 'Direct thermal & thermal transfer label rolls' },

    // Top-Level Parent 3: RFID & Asset Tracking
    { id: 'cat_rfid', name: 'RFID & Tracking', slug: 'rfid-tracking', parentId: null, description: 'UHF RFID readers, antennas, and asset tags' },
    { id: 'cat_rfid_tags', name: 'RFID Smart Labels & Tags', slug: 'rfid-tags', parentId: 'cat_rfid', description: 'On-metal and printable UHF RFID adhesive tags' },
    { id: 'cat_rfid_rdr', name: 'RFID Fixed Readers', slug: 'rfid-readers', parentId: 'cat_rfid', description: 'Multi-port overhead portal RFID readers' },

    // Top-Level Parent 4: Warehouse Infrastructure & Supplies
    { id: 'cat_wh', name: 'Warehouse Supplies', slug: 'warehouse-supplies', parentId: null, description: 'Pallets, bins, racking labels, and packaging' },
    { id: 'cat_wh_bin', name: 'Location & Bin Markers', slug: 'bin-location-markers', parentId: 'cat_wh', description: 'Retro-reflective aisle and bin location barcode signs' },
    { id: 'cat_wh_plt', name: 'Pallets & Storage', slug: 'pallets-storage', parentId: 'cat_wh', description: 'Heavy-duty plastic pallets and storage containers' },
  ];
}

/** Bootstraps the default category tree by slug (the actual unique key), without disturbing any categories added since. */
async function ensureSeeded() {
  const defaults = getDefaultCategoryTree();
  const existing = await prisma.category.findMany({ where: { slug: { in: defaults.map((c) => c.slug) } }, select: { slug: true } });
  const existingSlugs = new Set(existing.map((r) => r.slug));
  const missing = defaults.filter((c) => !existingSlugs.has(c.slug));
  if (missing.length === 0) return;
  // Parents must be created before children reference them via parentId FK.
  const parents = missing.filter((c) => !c.parentId);
  const children = missing.filter((c) => c.parentId);
  if (parents.length) await prisma.category.createMany({ data: parents.map(({ id, name, slug, description }) => ({ id, name, slug, description, parentId: null })) });
  if (children.length) await prisma.category.createMany({ data: children.map(({ id, name, slug, description, parentId }) => ({ id, name, slug, description, parentId })) });
}

export async function loadCategories(): Promise<CategoryItem[]> {
  await ensureSeeded();
  const rows = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  return rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, parentId: r.parentId, description: r.description ?? undefined }));
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
}

export async function createCategory(input: { name: string; parentId?: string | null; description?: string }): Promise<CategoryItem> {
  const id = `cat_${Date.now()}`;
  const row = await prisma.category.create({
    data: { id, name: input.name.trim(), slug: slugify(input.name), parentId: input.parentId || null, description: input.description || '' },
  });
  return { id: row.id, name: row.name, slug: row.slug, parentId: row.parentId, description: row.description ?? undefined };
}

export async function updateCategory(id: string, input: { name: string; description?: string }): Promise<CategoryItem> {
  const data: any = { name: input.name.trim(), slug: slugify(input.name) };
  if (input.description !== undefined) data.description = input.description;
  const row = await prisma.category.update({ where: { id }, data });
  return { id: row.id, name: row.name, slug: row.slug, parentId: row.parentId, description: row.description ?? undefined };
}

export async function deleteCategory(id: string): Promise<void> {
  await prisma.category.delete({ where: { id } });
}

export async function hasChildCategories(id: string): Promise<boolean> {
  const count = await prisma.category.count({ where: { parentId: id } });
  return count > 0;
}
