'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');

  return (
    <div className="bg-surface pt-32 pb-20 min-h-screen">
      <div className="container mx-auto px-margin-desktop max-w-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-3xl text-emerald-600">check_circle</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-4">Order Confirmed</h1>
        {orderNumber && (
          <p className="text-lg text-on-surface-variant mb-2">
            Your order number is <span className="font-bold text-slate-950">{orderNumber}</span>.
          </p>
        )}
        <p className="text-sm text-on-surface-variant mb-10 max-w-md mx-auto">
          A confirmation email is on its way to you now. A formal Tax Invoice will follow by email once your order has been dispatched.
        </p>
        <Link href="/products/shop" className="inline-block bg-slate-950 hover:bg-indigo-600 text-white font-bold text-sm px-6 py-3 rounded-full transition-colors" style={{ color: '#ffffff' }}>
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmationContent />
    </Suspense>
  );
}
