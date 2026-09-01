// FR-STORE — read model for the public storefront (unauthenticated). Anything exported
// from this file is safe to expose to an anonymous visitor: no cost price, no vendor
// identity, no internal notes — only what a public product listing needs.

import { loadPersistentProducts, PersistentProduct } from './products';
import { loadCategories, CategoryItem } from './categories';
import { calculateStockOnHand } from './stock';

export interface PublicProduct {
  sku: string;
  itemName: string;
  storeDescription: string;
  sellingPrice: number;
  currency: string;
  storeImages: string[];
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  moq: number;
  quantityAvailable: number;
  attributes?: Record<string, string>;
}

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productCount: number;
  heroImage?: string;
}

function isPublished(item: PersistentProduct): boolean {
  return item.publishToStore === true && item.status === 'ACTIVE';
}

// A product's own category can sit several levels below the slug a storefront page
// asks for (e.g. "RFID Fixed Readers" under the "RFID & Tracking" grouping page) — walk
// up the parent chain so a parent-level slug matches every descendant category too.
function categorySlugChain(categoryId: string | undefined, categories: CategoryItem[]): string[] {
  const chain: string[] = [];
  let current = categories.find((c) => c.id === categoryId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    chain.push(current.slug);
    seen.add(current.id);
    current = current.parentId ? categories.find((c) => c.id === current!.parentId) : undefined;
  }
  return chain;
}

async function availabilityBySku(): Promise<Map<string, number>> {
  const onHand = await calculateStockOnHand();
  const map = new Map<string, number>();
  for (const row of onHand) {
    map.set(row.sku, (map.get(row.sku) || 0) + Math.max(0, row.quantityAvailable));
  }
  return map;
}

function toPublicProduct(item: PersistentProduct, categories: CategoryItem[], availability: Map<string, number>): PublicProduct {
  const cat = categories.find((c) => c.id === item.categoryId);
  return {
    sku: item.sku,
    itemName: item.itemName,
    storeDescription: item.storeDescription || '',
    sellingPrice: item.sellingPrice,
    currency: 'AUD',
    storeImages: item.storeImages || [],
    categoryId: item.categoryId || '',
    categoryName: item.categoryName || cat?.name || 'Uncategorised',
    categorySlug: cat?.slug || 'uncategorised',
    moq: item.moq || 1,
    quantityAvailable: availability.get(item.sku) || 0,
    attributes: item.attributes,
  };
}

export async function getPublishedProducts(categorySlug?: string): Promise<PublicProduct[]> {
  const products = Object.values(await loadPersistentProducts()).filter(isPublished);
  const categories = await loadCategories();
  const availability = await availabilityBySku();
  let mapped = products.map((p) => toPublicProduct(p, categories, availability));
  if (categorySlug) {
    mapped = mapped.filter((p) => categorySlugChain(p.categoryId, categories).includes(categorySlug));
  }
  return mapped.sort((a, b) => a.itemName.localeCompare(b.itemName));
}

export async function getPublishedProductBySku(sku: string): Promise<PublicProduct | null> {
  const products = Object.values(await loadPersistentProducts()).filter(isPublished);
  const categories = await loadCategories();
  const availability = await availabilityBySku();
  const match = products.find((p) => p.sku === sku);
  return match ? toPublicProduct(match, categories, availability) : null;
}

// Public categories are derived entirely from which internal Item Master categories
// currently have at least one published item — there is no separate storefront-only
// category list to keep in sync. The owner "adds a category" to the storefront simply
// by publishing an item under a category that doesn't have one published yet.
export async function getPublishedCategories(): Promise<PublicCategory[]> {
  const products = Object.values(await loadPersistentProducts()).filter(isPublished);
  const categories = await loadCategories();
  const byCategory = new Map<string, PersistentProduct[]>();
  for (const p of products) {
    if (!p.categoryId) continue;
    const list = byCategory.get(p.categoryId) || [];
    list.push(p);
    byCategory.set(p.categoryId, list);
  }
  const result: PublicCategory[] = [];
  for (const [categoryId, items] of byCategory.entries()) {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) continue;
    result.push({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      productCount: items.length,
      heroImage: items.find((i) => (i.storeImages || []).length > 0)?.storeImages?.[0],
    });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}
