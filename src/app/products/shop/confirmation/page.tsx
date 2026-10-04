'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface OrderDetails {
  orderNumber: string;
  status: string;
  customerName: string;
  totalAmount: number;
  currency: string;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const legacyOrderNumber = searchParams.get('order');

  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    // Poll until the webhook has processed the session and created the StorefrontOrder.
    // Typically completes within a second or two of the Stripe redirect.
    let attempts = 0;
    const maxAttempts = 10;
    const poll = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/checkout/order-status?session_id=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.orderNumber) {
            setDetails(data);
            setLoading(false);
            return;
          }
        }
      } catch {}
      if (attempts < maxAttempts) {
        setTimeout(poll, 1500);
      } else {
        setLoading(false);
        setError('Your payment was received. Your order confirmation email will arrive shortly.');
      }
    };
    poll();
  }, [sessionId]);

  const orderNumber = details?.orderNumber || legacyOrderNumber;

  if (loading) {
    return (
      <div className="bg-surface pt-32 pb-20 min-h-screen">
        <div className="container mx-auto px-margin-desktop max-w-2xl text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-6" />
          <h1 className="text-2xl font-extrabold text-slate-950 mb-2">Confirming your order…</h1>
          <p className="text-sm text-on-surface-variant">We're processing your payment. This takes just a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface pt-32 pb-20 min-h-screen">
      <div className="container mx-auto px-margin-desktop max-w-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-4">
          {sessionId ? 'Payment Successful!' : 'Order Confirmed'}
        </h1>

        {orderNumber && (
          <p className="text-lg text-on-surface-variant mb-2">
            Your order number is{' '}
            <span className="font-bold text-slate-950">{orderNumber}</span>.
          </p>
        )}

        {details && (
          <p className="text-sm text-on-surface-variant mb-2">
            Total charged: <span className="font-bold text-slate-950">{details.currency} {Number(details.totalAmount).toFixed(2)}</span>
          </p>
        )}

        {error ? (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 max-w-md mx-auto">
            {error}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant mb-10 max-w-md mx-auto">
            {sessionId
              ? 'Your payment has been confirmed and your order is now in our system. A confirmation email is on its way to you.'
              : 'A confirmation email is on its way to you now. A formal Tax Invoice will follow once your order has been dispatched.'}
          </p>
        )}

        <Link
          href="/products/shop"
          className="inline-block bg-slate-950 hover:bg-indigo-600 text-white font-bold text-sm px-6 py-3 rounded-full transition-colors"
          style={{ color: '#ffffff' }}
        >
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
