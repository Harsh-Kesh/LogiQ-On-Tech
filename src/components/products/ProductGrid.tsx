'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { getAssetPath } from '@/lib/nav';
import { useCart } from '@/components/store/CartContext';
import type { PublicProduct } from '@/lib/store-catalog';

// Owner-uploaded store images are data: URLs (see Item Master's storefront upload) —
// getAssetPath only knows how to prefix local marketing asset paths, so data/remote
// URLs must bypass it entirely rather than being mangled into an invalid path.
function resolveImageSrc(src: string): string {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
  return getAssetPath(src);
}

// A non-transactional card — e.g. a SaaS platform or bespoke solution that's promoted
// alongside real, orderable products but routes to a solutions/quote page instead of
// the cart (it isn't an Item Master SKU).
export type SupplementaryCard = {
  id: string;
  brand?: string;
  title: string;
  description: string;
  image: string;
  href: string;
  ctaLabel?: string;
};

interface ProductGridProps {
  products: PublicProduct[];
  supplementary?: SupplementaryCard[];
  // The shop hub page (src/app/products/shop/page.tsx) already renders its own
  // category filter row above this grid. Without this flag, ProductGrid's internal
  // "Type" pill row would stack on top of it as a second, unlabeled filter bar
  // filtering by a different taxonomy — confusingly redundant. Defaults to false so
  // every other ProductGrid call site (rfid-solutions, mobile-computers,
  // barcode-scanners, the category listing page) keeps its current behavior.
  hideTypeFilter?: boolean;
}

export default function ProductGrid({ products, supplementary = [], hideTypeFilter = false }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map((p) => p.attributes?.Type).filter(Boolean) as string[]))];
  }, [products]);

  const filtered = useMemo(() => {
    if (hideTypeFilter) return products;
    return activeCategory === 'All' ? products : products.filter((p) => p.attributes?.Type === activeCategory);
  }, [products, activeCategory, hideTypeFilter]);

  const handleAdd = (p: PublicProduct) => {
    addItem({
      sku: p.sku,
      itemName: p.itemName,
      sellingPrice: p.sellingPrice,
      currency: p.currency,
      image: p.storeImages[0],
      categorySlug: p.categorySlug,
    });
    setJustAdded(p.sku);
    setTimeout(() => setJustAdded((cur) => (cur === p.sku ? null : cur)), 1800);
  };

  return (
    <div>
      {!hideTypeFilter && categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={
                cat === activeCategory
                  ? 'px-4 py-2 rounded-full text-label-sm font-bold bg-slate-950 text-white transition-colors'
                  : 'px-4 py-2 rounded-full text-label-sm font-bold bg-white border border-outline-variant text-on-surface-variant hover:border-indigo-400 transition-colors'
              }
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((product) => (
          <div key={product.sku} className="bg-white border border-outline-variant rounded-2xl overflow-hidden group hover:border-indigo-300 hover:shadow-lg transition-all flex flex-col">
            <div className="relative h-52 bg-surface-container-low">
              {product.storeImages[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveImageSrc(product.storeImages[0])}
                  alt={product.itemName}
                  className="absolute inset-0 w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300">inventory_2</span>
                </div>
              )}
              {product.quantityAvailable <= 0 && (
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded-full">
                  Out of Stock
                </span>
              )}
            </div>
            <div className="p-6 border-t border-outline-variant flex flex-col flex-1">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">
                {product.attributes?.Brand || product.categoryName}
                {product.attributes?.Type ? ` · ${product.attributes.Type}` : ''}
              </span>
              <h3 className="text-headline-sm font-headline-sm text-on-background mb-2">{product.itemName}</h3>
              <p className="text-body-sm text-on-surface-variant mb-4 leading-snug flex-1">{product.storeDescription}</p>
              <div className="flex items-center justify-between gap-3 mt-auto">
                <span className="text-lg font-extrabold text-slate-950">
                  {product.currency} {product.sellingPrice.toFixed(2)}
                </span>
                <button
                  onClick={() => handleAdd(product)}
                  className={`px-4 py-2 rounded-full text-label-sm font-bold transition-colors whitespace-nowrap ${
                    justAdded === product.sku ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-white hover:bg-indigo-600'
                  }`}
                  style={{ color: '#ffffff' }}
                >
                  {justAdded === product.sku ? 'Added ✓' : product.quantityAvailable <= 0 ? 'Add Anyway (Backorder)' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        ))}

        {supplementary.map((item) => (
          <div key={item.id} className="bg-white border border-outline-variant rounded-2xl overflow-hidden group hover:border-indigo-300 hover:shadow-lg transition-all flex flex-col">
            <div className="relative h-52 bg-surface-container-low">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveImageSrc(item.image)}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-6 border-t border-outline-variant flex flex-col flex-1">
              {item.brand && (
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">{item.brand}</span>
              )}
              <h3 className="text-headline-sm font-headline-sm text-on-background mb-2">{item.title}</h3>
              <p className="text-body-sm text-on-surface-variant mb-4 leading-snug flex-1">{item.description}</p>
              <Link
                href={item.href}
                className="text-label-sm font-bold text-indigo-600 flex items-center gap-1 w-fit hover:gap-2 transition-all mt-auto"
              >
                {item.ctaLabel ?? 'Learn More'} <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && supplementary.length === 0 && (
        <p className="text-center text-on-surface-variant py-16">No products are available in this category right now.</p>
      )}
    </div>
  );
}
