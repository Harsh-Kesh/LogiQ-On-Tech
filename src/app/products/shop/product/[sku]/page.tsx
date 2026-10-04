'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/components/store/CartContext';
import { getAssetPath } from '@/lib/nav';
import type { PublicProduct } from '@/lib/store-catalog';

function resolveImageSrc(src: string): string {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
  return getAssetPath(src);
}

export default function ProductDetailPage() {
  const { sku } = useParams<{ sku: string }>();
  const router = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!sku) return;
    fetch(`/api/store/products/${encodeURIComponent(sku)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { setProduct(d.product); setLoading(false); })
      .catch(() => { setProduct(null); setLoading(false); });
  }, [sku]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      sku: product.sku,
      itemName: product.itemName,
      sellingPrice: product.sellingPrice,
      currency: product.currency,
      image: product.storeImages[0],
      categorySlug: product.categorySlug,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addItem({
      sku: product.sku,
      itemName: product.itemName,
      sellingPrice: product.sellingPrice,
      currency: product.currency,
      image: product.storeImages[0],
      categorySlug: product.categorySlug,
    }, qty);
    router.push('/products/shop/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface pt-32 flex items-center justify-center">
        <span className="text-on-surface-variant text-sm">Loading product…</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-surface pt-32 flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-5xl text-slate-300">search_off</span>
        <p className="text-on-surface-variant">Product not found.</p>
        <Link href="/products/shop" className="text-indigo-600 font-bold hover:underline text-sm">← Back to Shop</Link>
      </div>
    );
  }

  const inStock = product.quantityAvailable > 0;

  return (
    <div className="min-h-screen bg-surface">
      {/* Breadcrumb */}
      <div className="border-b border-outline-variant/30 bg-white pt-28 pb-4">
        <div className="container mx-auto px-margin-desktop">
          <nav aria-label="Breadcrumb" className="text-body-sm text-on-surface-variant flex items-center gap-1.5 flex-wrap">
            <Link href="/products" className="hover:text-indigo-600 transition-colors">Products</Link>
            <span className="text-slate-300">›</span>
            <Link href="/products/shop" className="hover:text-indigo-600 transition-colors">Shop</Link>
            <span className="text-slate-300">›</span>
            <span className="text-on-background font-medium truncate max-w-[200px]">{product.itemName}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-margin-desktop py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

          {/* Image gallery */}
          <div className="space-y-4">
            <div className="relative bg-white border border-outline-variant rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
              {product.storeImages[activeImage] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveImageSrc(product.storeImages[activeImage])}
                  alt={product.itemName}
                  className="w-full h-full object-contain p-10"
                />
              ) : (
                <span className="material-symbols-outlined text-6xl text-slate-200">inventory_2</span>
              )}
              {!inStock && (
                <span className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full">
                  Enquire
                </span>
              )}
            </div>
            {product.storeImages.length > 1 && (
              <div className="flex gap-3">
                {product.storeImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden bg-white flex items-center justify-center transition-all ${
                      activeImage === i ? 'border-indigo-600 shadow-md' : 'border-outline-variant hover:border-indigo-300'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveImageSrc(img)} alt="" className="w-full h-full object-contain p-1.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-3">
              {product.attributes?.Brand || product.categoryName}
              {product.attributes?.Type ? ` · ${product.attributes.Type}` : ''}
            </span>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-950 leading-tight mb-4">
              {product.itemName}
            </h1>

            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              {product.storeDescription}
            </p>

            {/* SKU */}
            <p className="text-xs text-slate-400 font-mono mb-6">SKU: {product.sku}</p>

            {/* Stock badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`w-2 h-2 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className={`text-xs font-bold ${inStock ? 'text-emerald-700' : 'text-rose-700'}`}>
                {inStock ? 'In Stock' : 'Out of Stock — Backorders Accepted'}
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-3xl font-extrabold text-slate-950">
                {product.currency} {product.sellingPrice.toFixed(2)}
              </span>
              <span className="text-sm text-on-surface-variant">ex. GST</span>
            </div>

            {/* Quantity selector */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-bold text-on-background">Quantity</span>
              <div className="flex items-center border border-outline-variant rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-on-surface-variant hover:bg-surface-container-low transition-colors text-lg font-bold"
                >
                  −
                </button>
                <span className="px-4 py-2 text-sm font-bold text-on-background min-w-[40px] text-center border-x border-outline-variant">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3 py-2 text-on-surface-variant hover:bg-surface-container-low transition-colors text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBuyNow}
                className="flex-1 py-3.5 px-6 rounded-full font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md"
                style={{ color: '#ffffff' }}
              >
                Buy Now
              </button>
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3.5 px-6 rounded-full font-bold text-sm border-2 transition-colors ${
                  added
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-950 text-slate-950 hover:bg-slate-950 hover:text-white'
                }`}
                style={added ? { color: '#ffffff' } : {}}
              >
                {added ? 'Added to Cart ✓' : 'Add to Cart'}
              </button>
            </div>

            <Link
              href="/products/shop/cart"
              className="mt-4 text-center text-xs text-indigo-600 hover:underline font-medium"
            >
              View Cart
            </Link>

            {/* Divider */}
            <div className="border-t border-outline-variant/40 my-8" />

            {/* Product attributes */}
            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-on-background uppercase tracking-widest mb-3">Specifications</p>
                {Object.entries(product.attributes).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm py-2 border-b border-outline-variant/30 last:border-0">
                    <span className="text-on-surface-variant font-medium">{k}</span>
                    <span className="text-on-background font-bold text-right max-w-[60%]">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
