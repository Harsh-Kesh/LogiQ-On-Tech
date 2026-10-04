'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/store/CartContext';
import { LockKeyhole, CreditCard } from 'lucide-react';

export default function CheckoutPage() {
  const { lines, totalValue } = useCart();

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryAddress: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currency = lines[0]?.currency || 'AUD';
  const taxTotal = Math.round(totalValue * 0.1 * 100) / 100;
  const grandTotal = Math.round((totalValue + taxTotal) * 100) / 100;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (lines.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout/stripe-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lines: lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      // Redirect to Stripe-hosted checkout
      window.location.href = data.url;
    } catch {
      setError('Network error — please try again.');
      setSubmitting(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="bg-surface pt-32 pb-20 min-h-screen">
        <div className="container mx-auto px-margin-desktop max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold text-slate-950 mb-4">Your cart is empty</h1>
          <Link
            href="/products/shop"
            className="inline-block bg-slate-950 hover:bg-indigo-600 text-white font-bold text-sm px-6 py-3 rounded-full transition-colors"
            style={{ color: '#ffffff' }}
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface pt-32 pb-20 min-h-screen">
      <div className="container mx-auto px-margin-desktop max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white border border-outline-variant rounded-2xl p-6 space-y-5">
            <h2 className="font-bold text-slate-950">Your Details</h2>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Full Name *</label>
              <input
                required
                value={form.customerName}
                onChange={set('customerName')}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant focus:border-indigo-600 focus:outline-none text-sm"
                placeholder="Jane Smith"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Email *</label>
                <input
                  required
                  type="email"
                  value={form.customerEmail}
                  onChange={set('customerEmail')}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant focus:border-indigo-600 focus:outline-none text-sm"
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Phone</label>
                <input
                  value={form.customerPhone}
                  onChange={set('customerPhone')}
                  type="tel"
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant focus:border-indigo-600 focus:outline-none text-sm"
                  placeholder="04xx xxx xxx"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5">Delivery Address *</label>
              <input
                required
                value={form.deliveryAddress}
                onChange={set('deliveryAddress')}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant focus:border-indigo-600 focus:outline-none text-sm"
                placeholder="1 Example St, Sydney NSW 2000"
              />
            </div>

            {error && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-950 hover:bg-indigo-600 disabled:opacity-60 text-white font-bold text-sm px-6 py-3.5 rounded-full transition-colors flex items-center justify-center gap-2"
              style={{ color: '#ffffff' }}
            >
              <CreditCard className="w-4 h-4" />
              {submitting ? 'Redirecting to payment…' : `Pay ${currency} ${grandTotal.toFixed(2)} with Card`}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant">
              <LockKeyhole className="w-3.5 h-3.5 text-emerald-600" />
              Secure payment powered by Stripe. Your card details never touch our servers.
            </div>
          </form>

          {/* Order Summary */}
          <div className="bg-white border border-outline-variant rounded-2xl p-6">
            <h2 className="font-bold text-slate-950 mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {lines.map((l) => (
                <div key={l.sku} className="flex justify-between text-sm">
                  <span className="text-on-surface-variant truncate pr-2">
                    {l.quantity} × {l.itemName}
                  </span>
                  <span className="font-bold text-slate-950 tabular-nums shrink-0">
                    {l.currency} {(l.sellingPrice * l.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-outline-variant pt-4 space-y-2">
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Subtotal</span>
                <span className="tabular-nums">{currency} {totalValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>GST (10%)</span>
                <span className="tabular-nums">{currency} {taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-slate-950 pt-2 border-t border-outline-variant">
                <span>Total</span>
                <span className="tabular-nums">{currency} {grandTotal.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-4">
              GST included. A tax invoice will be emailed after your order is dispatched.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
