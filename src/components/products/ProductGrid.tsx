"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";

type Product = {
  id: string;
  brand: string;
  model: string;
  category: string;
  description: string;
  image: string;
  href?: string;
  ctaLabel?: string;
};

export default function ProductGrid({ products }: { products: Product[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  }, [products]);

  const filtered = useMemo(() => {
    return activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-10">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={
              cat === activeCategory
                ? "px-4 py-2 rounded-full text-label-sm font-bold bg-primary text-on-primary transition-colors"
                : "px-4 py-2 rounded-full text-label-sm font-bold bg-white border border-outline-variant text-on-surface-variant hover:border-primary transition-colors"
            }
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((product) => (
          <div key={product.id} className="bg-white border border-outline-variant rounded-2xl overflow-hidden group hover:border-primary/40 hover:shadow-lg transition-all">
            <div className="relative h-52 bg-surface-container-low">
              <Image
                src={getAssetPath(product.image)}
                alt={`${product.brand} ${product.model}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-contain p-6 group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-6 border-t border-outline-variant">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-2">
                {product.brand} &middot; {product.category}
              </span>
              <h3 className="text-headline-sm font-headline-sm text-on-background mb-2">{product.model}</h3>
              <p className="text-body-sm text-on-surface-variant mb-4 leading-snug">{product.description}</p>
              <Link
                href={product.href ?? "/request-quote"}
                className="text-label-sm font-bold text-primary flex items-center gap-1 w-fit hover:gap-2 transition-all"
              >
                {product.ctaLabel ?? "Request a Quote"} <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-on-surface-variant py-16">No products in this category yet.</p>
      )}
    </div>
  );
}
