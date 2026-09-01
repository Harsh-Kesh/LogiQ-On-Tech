'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/store/CartContext';

export default function CartPage() {
  const { lines, updateQuantity, removeItem, totalValue } = useCart();
  const currency = lines[0]?.currency || 'AUD';
  const taxTotal = Math.round(totalValue * 0.1 * 100) / 100;
  const grandTotal = Math.round((totalValue + taxTotal) * 100) / 100;

  // Lets a shopper type a quantity directly instead of only clicking +/- one at a time.
  // Kept as local draft text (not committed to the cart) while typing, so an in-progress
  // edit like clearing the field doesn't briefly collapse the line to quantity 0.
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setQtyDrafts((prev) => {
      const next = { ...prev };
      for (const l of lines) {
        if (next[l.sku] === undefined) next[l.sku] = String(l.quantity);
      }
      return next;
    });
  }, [lines]);

  const commitQty = (sku: string, raw: string, fallback: number) => {
    const parsed = parseInt(raw, 10);
    const next = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    updateQuantity(sku, next);
    setQtyDrafts((prev) => ({ ...prev, [sku]: String(next) }));
  };

  return (
    <div className="bg-surface pt-32 pb-20 min-h-screen">
      <div className="container mx-auto px-margin-desktop max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-8">Your Cart</h1>

        {lines.length === 0 ? (
          <div className="bg-white border border-outline-variant rounded-2xl p-12 text-center">
            <p className="text-on-surface-variant mb-6">Your cart is empty.</p>
            <Link href="/products/shop" className="inline-block bg-slate-950 hover:bg-indigo-600 text-white font-bold text-sm px-6 py-3 rounded-full transition-colors" style={{ color: '#ffffff' }}>
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 bg-white border border-outline-variant rounded-2xl overflow-hidden divide-y divide-outline-variant">
              {lines.map((l) => (
                <div key={l.sku} className="p-5 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-surface-container-low flex items-center justify-center overflow-hidden shrink-0">
                    {l.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.image} alt={l.itemName} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="material-symbols-outlined text-2xl text-slate-300">inventory_2</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-950 truncate">{l.itemName}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">{l.currency} {l.sellingPrice.toFixed(2)} each</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => commitQty(l.sku, String(l.quantity - 1), l.quantity)}
                      className="w-7 h-7 rounded-full border border-outline-variant text-slate-700 hover:bg-surface-container-low flex items-center justify-center"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={qtyDrafts[l.sku] ?? l.quantity}
                      onChange={(e) => setQtyDrafts((prev) => ({ ...prev, [l.sku]: e.target.value }))}
                      onBlur={(e) => commitQty(l.sku, e.target.value, l.quantity)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      aria-label={`Quantity for ${l.itemName}`}
                      className="w-14 text-center text-sm font-bold tabular-nums rounded-lg border border-outline-variant py-1 focus:border-indigo-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => commitQty(l.sku, String(l.quantity + 1), l.quantity)}
                      className="w-7 h-7 rounded-full border border-outline-variant text-slate-700 hover:bg-surface-container-low flex items-center justify-center"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-24 text-right font-bold text-sm text-slate-950 tabular-nums">
                    {l.currency} {(l.sellingPrice * l.quantity).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeItem(l.sku)}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                    aria-label="Remove item"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white border border-outline-variant rounded-2xl p-6 sticky top-28">
              <h2 className="font-bold text-slate-950 mb-4">Order Summary</h2>
              <div className="flex justify-between text-sm text-on-surface-variant mb-2">
                <span>Subtotal</span>
                <span className="tabular-nums">{currency} {totalValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-on-surface-variant mb-4">
                <span>GST (10%)</span>
                <span className="tabular-nums">{currency} {taxTotal.toFixed(2)}</span>
              </div>
              <div className="border-t border-outline-variant pt-4 flex justify-between font-extrabold text-slate-950 mb-6">
                <span>Total</span>
                <span className="tabular-nums">{currency} {grandTotal.toFixed(2)}</span>
              </div>
              <Link
                href="/products/shop/checkout"
                className="block text-center bg-slate-950 hover:bg-indigo-600 text-white font-bold text-sm px-6 py-3 rounded-full transition-colors"
                style={{ color: '#ffffff' }}
              >
                Proceed to Checkout
              </Link>
              <Link href="/products/shop" className="block text-center text-xs font-bold text-slate-500 hover:text-slate-900 mt-4">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
