'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import ProductGrid from '@/components/products/ProductGrid';
import { getAssetPath } from '@/lib/nav';
import type { PublicProduct, PublicCategory } from '@/lib/store-catalog';

type SortOption = 'name' | 'price-asc' | 'price-desc';

const SORT_LABELS: Record<SortOption, string> = {
  name: 'Name (A–Z)',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
};

export default function ShopHubPage() {
  const [products, setProducts] = useState<PublicProduct[] | null>(null);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  useEffect(() => {
    fetch('/api/store/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]));
    fetch('/api/store/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => setCategories([]));
  }, []);

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      const matchesSearch =
        !q ||
        p.itemName.toLowerCase().includes(q) ||
        p.storeDescription.toLowerCase().includes(q) ||
        (p.attributes?.Brand || '').toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'All' || p.categorySlug === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
      if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
      return a.itemName.localeCompare(b.itemName);
    });
    return list;
  }, [products, search, categoryFilter, sortBy]);

  const hasActiveFilters = search || categoryFilter !== 'All';

  return (
    <div>
      <section className="relative min-h-[60vh] flex items-center overflow-hidden bg-slate-950 pt-36 pb-16">
        <div className="absolute inset-0 z-0">
          <Image
            src={getAssetPath('/images/pexels/retail-store-aisle.jpg')}
            alt="Retail store aisle stocked with ready-to-order hardware"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/45 to-slate-950/85 pointer-events-none" />
        </div>
        <div className="container mx-auto px-margin-desktop relative z-10 text-center">
          <span className="inline-block text-label-md text-white bg-white/15 border border-white/30 px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest backdrop-blur-md" style={{ color: '#ffffff' }}>
            Online Store
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg" style={{ color: '#ffffff' }}>
            Shop All Products
          </h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto drop-shadow-md" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Every orderable product across every category, in one place — search, filter, and check out directly.
          </p>
        </div>
      </section>

      <section className="bg-surface py-16">
        <div className="container mx-auto px-margin-desktop">
          <div className="bg-white border border-outline-variant rounded-2xl shadow-sm p-5 mb-10 space-y-5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, brands, SKUs…"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 focus:outline-none text-sm transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryFilter('All')}
                  className={
                    categoryFilter === 'All'
                      ? 'px-4 py-2 rounded-full text-xs font-bold bg-slate-950 text-white transition-colors'
                      : 'px-4 py-2 rounded-full text-xs font-bold bg-surface-container-low border border-outline-variant text-on-surface-variant hover:border-indigo-400 transition-colors'
                  }
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryFilter(c.slug)}
                    className={
                      categoryFilter === c.slug
                        ? 'px-4 py-2 rounded-full text-xs font-bold bg-slate-950 text-white transition-colors'
                        : 'px-4 py-2 rounded-full text-xs font-bold bg-surface-container-low border border-outline-variant text-on-surface-variant hover:border-indigo-400 transition-colors'
                    }
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none pl-4 pr-9 py-2.5 rounded-full border border-outline-variant bg-surface-container-low focus:border-indigo-600 focus:outline-none text-xs font-bold text-on-surface-variant cursor-pointer"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                    <option key={key} value={key}>Sort: {SORT_LABELS[key]}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>

          {products === null && <p className="text-center text-on-surface-variant py-16">Loading products…</p>}

          {products !== null && (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-on-surface-variant">
                  <span className="font-bold text-on-background">{visibleProducts.length}</span> product{visibleProducts.length === 1 ? '' : 's'}
                  {categoryFilter !== 'All' ? <> in <span className="font-bold text-on-background">{categories.find((c) => c.slug === categoryFilter)?.name || categoryFilter}</span></> : ''}
                  {search ? <> matching &ldquo;{search}&rdquo;</> : ''}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setSearch(''); setCategoryFilter('All'); }}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <ProductGrid products={visibleProducts} hideTypeFilter />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
