import { prisma } from './prisma';

export interface PersistentProduct {
  id: string;
  sku: string;
  barcode: string;
  itemName: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  marginPercent?: number;
  markupPercent?: number;
  moq?: number;
  status: 'ACTIVE' | 'DRAFT' | 'DISCONTINUED';
  vendorId?: string | null;
  vendorEmail?: string;
  vendorName?: string;
  categoryId?: string;
  categoryName?: string;
  uomId?: string;
  uomCode?: string;
  uomName?: string;
  lowStockThreshold?: number;
  reorderQuantity?: number;
  imageUrl?: string;
  // Public storefront listing (opt-in, FR-STORE-001). An item can only be published
  // once it has a vendor allocated, a public description, and at least one image —
  // enforced server-side in /api/mdm/items, not just in the form.
  publishToStore?: boolean;
  storeDescription?: string;
  storeImages?: string[];
  attributes?: Record<string, string>;
  statusHistory?: Array<{
    from: string;
    to: string;
    changedBy: string;
    changedAt: string;
    reason?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const ITEM_INCLUDE = {
  vendor: { include: { user: true } },
  category: true,
  uom: true,
} as const;

type ItemMasterWithRelations = Awaited<ReturnType<typeof prisma.itemMaster.findFirstOrThrow<{ include: typeof ITEM_INCLUDE }>>>;

function toRecord(row: ItemMasterWithRelations): PersistentProduct {
  const { marginPercent, markupPercent } = calculateMarginAndMarkup(Number(row.costPrice), Number(row.sellingPrice));
  return {
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    itemName: row.itemName,
    description: row.description ?? undefined,
    costPrice: Number(row.costPrice),
    sellingPrice: Number(row.sellingPrice),
    marginPercent,
    markupPercent,
    moq: row.moq,
    status: row.status as PersistentProduct['status'],
    vendorId: row.vendorId,
    vendorEmail: row.vendor?.user?.email,
    vendorName: row.vendor?.companyName,
    categoryId: row.categoryId ?? undefined,
    categoryName: row.category?.name,
    uomId: row.uomId ?? undefined,
    uomCode: row.uom?.code,
    uomName: row.uom?.name,
    lowStockThreshold: row.lowStockThreshold ?? undefined,
    reorderQuantity: row.reorderQuantity ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    publishToStore: row.publishToStore,
    storeDescription: row.storeDescription ?? undefined,
    storeImages: row.storeImages,
    attributes: row.attributesJson ? JSON.parse(row.attributesJson) : undefined,
    statusHistory: row.statusHistoryJson ? JSON.parse(row.statusHistoryJson) : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// FR-STORE-001 — an item can only be opted into the public storefront once it has
// everything a public listing needs: an allocated vendor (so a store order can flow
// into the normal fulfilment pipeline), a public-facing description, at least one
// image, and a real selling price. Shared by create + update so neither path can
// publish a half-filled listing.
export function validateStorePublish(item: Pick<PersistentProduct, 'vendorId' | 'sellingPrice' | 'storeDescription' | 'storeImages'>): string | null {
  if (!item.vendorId) {
    return 'A vendor must be allocated to this item before it can be listed on the public store.';
  }
  if (!item.storeDescription || !item.storeDescription.trim()) {
    return 'A public-facing store description is required to list this item on the public store.';
  }
  if (!Array.isArray(item.storeImages) || item.storeImages.length === 0) {
    return 'At least one product image is required to list this item on the public store.';
  }
  if (!item.sellingPrice || item.sellingPrice <= 0) {
    return 'A selling price greater than zero is required to list this item on the public store.';
  }
  return null;
}

export function calculateMarginAndMarkup(cost: number, selling: number) {
  const margin = selling > 0 ? ((selling - cost) / selling) * 100 : 0;
  const markup = cost > 0 ? ((selling - cost) / cost) * 100 : 0;
  return {
    marginPercent: parseFloat(margin.toFixed(2)),
    markupPercent: parseFloat(markup.toFixed(2)),
  };
}

export async function loadPersistentProducts(): Promise<Record<string, PersistentProduct>> {
  const rows = await prisma.itemMaster.findMany({ include: ITEM_INCLUDE, orderBy: { createdAt: 'asc' } });
  const result: Record<string, PersistentProduct> = {};
  for (const row of rows) result[row.id] = toRecord(row as ItemMasterWithRelations);
  return result;
}

export interface CreateItemMasterInput {
  id: string;
  sku: string;
  barcode: string;
  itemName: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  moq: number;
  status: 'ACTIVE' | 'DRAFT' | 'DISCONTINUED';
  vendorId?: string | null;
  categoryId?: string | null;
  uomId?: string | null;
  imageUrl?: string;
  publishToStore?: boolean;
  storeDescription?: string;
  storeImages?: string[];
  attributes?: Record<string, string>;
  statusHistory?: PersistentProduct['statusHistory'];
}

export async function createItemMasterRecord(input: CreateItemMasterInput): Promise<PersistentProduct> {
  const row = await prisma.itemMaster.create({
    data: {
      id: input.id,
      sku: input.sku,
      barcode: input.barcode,
      itemName: input.itemName,
      description: input.description || null,
      costPrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      moq: input.moq,
      status: input.status,
      vendorId: input.vendorId || null,
      categoryId: input.categoryId || null,
      uomId: input.uomId || null,
      imageUrl: input.imageUrl || null,
      publishToStore: input.publishToStore === true,
      storeDescription: input.storeDescription || null,
      storeImages: input.storeImages || [],
      attributesJson: input.attributes ? JSON.stringify(input.attributes) : null,
      statusHistoryJson: input.statusHistory ? JSON.stringify(input.statusHistory) : null,
    },
    include: ITEM_INCLUDE,
  });
  return toRecord(row as ItemMasterWithRelations);
}

export interface UpdateItemMasterInput {
  itemName?: string;
  sku?: string;
  barcode?: string;
  costPrice?: number;
  sellingPrice?: number;
  moq?: number;
  status?: 'ACTIVE' | 'DRAFT' | 'DISCONTINUED';
  description?: string;
  vendorId?: string | null;
  categoryId?: string | null;
  uomId?: string | null;
  imageUrl?: string;
  publishToStore?: boolean;
  storeDescription?: string;
  storeImages?: string[];
  attributes?: Record<string, string>;
  statusHistory?: PersistentProduct['statusHistory'];
  lowStockThreshold?: number;
  reorderQuantity?: number;
}

export async function updateItemMasterRecord(id: string, patch: UpdateItemMasterInput): Promise<PersistentProduct | null> {
  const data: any = {};
  if (patch.itemName !== undefined) data.itemName = patch.itemName;
  if (patch.sku !== undefined) data.sku = patch.sku;
  if (patch.barcode !== undefined) data.barcode = patch.barcode;
  if (patch.costPrice !== undefined) data.costPrice = patch.costPrice;
  if (patch.sellingPrice !== undefined) data.sellingPrice = patch.sellingPrice;
  if (patch.moq !== undefined) data.moq = patch.moq;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.vendorId !== undefined) data.vendorId = patch.vendorId;
  if (patch.categoryId !== undefined) data.categoryId = patch.categoryId;
  if (patch.uomId !== undefined) data.uomId = patch.uomId;
  if (patch.imageUrl !== undefined) data.imageUrl = patch.imageUrl;
  if (patch.publishToStore !== undefined) data.publishToStore = patch.publishToStore;
  if (patch.storeDescription !== undefined) data.storeDescription = patch.storeDescription;
  if (patch.storeImages !== undefined) data.storeImages = patch.storeImages;
  if (patch.attributes !== undefined) data.attributesJson = JSON.stringify(patch.attributes);
  if (patch.statusHistory !== undefined) data.statusHistoryJson = JSON.stringify(patch.statusHistory);
  if (patch.lowStockThreshold !== undefined) data.lowStockThreshold = patch.lowStockThreshold;
  if (patch.reorderQuantity !== undefined) data.reorderQuantity = patch.reorderQuantity;

  try {
    const row = await prisma.itemMaster.update({ where: { id }, data, include: ITEM_INCLUDE });
    return toRecord(row as ItemMasterWithRelations);
  } catch {
    return null;
  }
}

export async function deleteItemMasterRecord(id: string): Promise<boolean> {
  try {
    await prisma.itemMaster.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function updateItemThreshold(productId: string, threshold: number, reorderQty: number = 50): Promise<PersistentProduct | null> {
  const existing = await prisma.itemMaster.findFirst({ where: { OR: [{ id: productId }, { sku: productId }] } });
  if (!existing) return null;
  return updateItemMasterRecord(existing.id, { lowStockThreshold: threshold, reorderQuantity: reorderQty });
}
