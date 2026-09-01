'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import GsapSection from '@/components/GsapSection';
import ProductGrid from '@/components/products/ProductGrid';
import { PublicProduct } from '@/lib/store-catalog';

export default function ShopCategoryPage() {
  const params = useParams();
  const categorySlug = String(params.category);

  const [products, setProducts] = useState<PublicProduct[] | null>(null);

  useEffect(() => {
    fetch(`/api/store/products?category=${encodeURIComponent(categorySlug)}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]));
  }, [categorySlug]);

  const categoryName = products && products.length > 0 ? products[0].categoryName : categorySlug.replace(/-/g, ' ');

  return (
    <div>
      <section className="bg-surface pt-32 pb-10 border-b border-outline-variant/30">
        <div className="container mx-auto px-margin-desktop">
          <nav aria-label="Breadcrumb" className="text-body-sm text-on-surface-variant mb-4">
            <Link href="/products" className="hover:text-indigo-600">Products</Link>
            <span className="mx-2">›</span>
            <Link href="/products/shop" className="hover:text-indigo-600">Shop</Link>
            <span className="mx-2">›</span>
            <span className="capitalize">{categoryName}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-950 capitalize">{categoryName}</h1>
        </div>
      </section>

      <GsapSection id="shop-category-grid" className="bg-surface" fullScreen={false} scrub={false} start="top 92%">
        <div className="container mx-auto px-margin-desktop">
          {products === null && <p className="text-center text-on-surface-variant py-16">Loading products…</p>}

          {products !== null && <ProductGrid products={products} />}
        </div>
      </GsapSection>
    </div>
  );
}
