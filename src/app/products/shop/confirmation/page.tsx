'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/components/store/CartContext';

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
  const { clear } = useCart();

  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState('');

  // Clear cart immediately when landing here from Stripe
  useEffect(() => {
    if (sessionId) clear();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sessionId) return;
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
      <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div className="animate-spin" style={{
            width: 52, height: 52, borderRadius: '50%',
            border: '3px solid #e2e8f0', borderTopColor: '#1e3a8a',
            margin: '0 auto 28px',
          }} />
          <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
            Confirming your order…
          </p>
          <p className="animate-pulse" style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
            Processing your payment — just a moment
          </p>
        </div>
      </div>
    );
  }

  const firstName = details?.customerName?.split(' ')[0];

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '40px 24px', maxWidth: 460, width: '100%' }}>

        {/* Navy check circle */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#1e3a8a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          boxShadow: '0 0 0 12px rgba(30,58,138,0.08)',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.8px', color: '#1e3a8a', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Payment Confirmed
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          {firstName ? `Thank you, ${firstName}!` : 'Thank you!'}
        </h1>
        <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 32px', lineHeight: 1.6 }}>
          {sessionId
            ? 'Your payment is confirmed and your order is being processed.'
            : 'Your order has been received.'}
        </p>

        {/* Order details card */}
        {(orderNumber || details) && !error && (
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 24,
            textAlign: 'left',
          }}>
            {orderNumber && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: details?.totalAmount ? 14 : 0 }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Order number</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace,monospace' }}>{orderNumber}</span>
              </div>
            )}
            {details?.totalAmount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total paid</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  {details.currency} {Number(details.totalAmount).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: 12, padding: '12px 16px',
            fontSize: 13, color: '#92400e', marginBottom: 24, textAlign: 'left',
          }}>
            {error}
          </div>
        )}

        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 28px' }}>
          A confirmation email is on its way to you.
        </p>

        <Link
          href="/products/shop"
          style={{
            display: 'inline-block',
            background: '#1e3a8a',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            padding: '13px 36px',
            borderRadius: 999,
            textDecoration: 'none',
          }}
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
