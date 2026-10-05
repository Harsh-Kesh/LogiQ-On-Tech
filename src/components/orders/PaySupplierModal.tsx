'use client';

import { useEffect, useState } from 'react';
import { X, Landmark, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

interface PaymentPreview {
  orderNumber: string;
  poNumber: string;
  vendorName: string;
  bsb: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  currency: string;
  provider: string;
  canPay: boolean;
  status: string;
}

interface PaySupplierModalProps {
  orderId: string;
  onClose: () => void;
  onPaid: () => void;
}

type Stage = 'loading' | 'review' | 'processing' | 'success' | 'error';

export default function PaySupplierModal({ orderId, onClose, onPaid }: PaySupplierModalProps) {
  const [stage, setStage] = useState<Stage>('loading');
  const [preview, setPreview] = useState<PaymentPreview | null>(null);
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    fetch(`/api/payments/supplier?storefrontOrderId=${orderId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: PaymentPreview) => {
        setPreview(data);
        setStage('review');
      })
      .catch(() => {
        setError('Could not load payment details for this order.');
        setStage('error');
      });
  }, [orderId]);

  const confirmPayment = async () => {
    setStage('processing');
    // Brief simulated processing delay so the transfer feels real, not instant.
    await new Promise((r) => setTimeout(r, 1100));
    try {
      const res = await fetch('/api/payments/supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storefrontOrderId: orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Payment failed.');
        setStage('error');
        return;
      }
      setTransactionId(data.transactionId || '');
      setStage('success');
    } catch {
      setError('Network error — please try again.');
      setStage('error');
    }
  };

  const handleClose = () => {
    if (stage === 'success') onPaid();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }} onClick={stage === 'processing' ? undefined : handleClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: '#4C3AE3' }}>
          <div className="flex items-center gap-2.5">
            <Landmark className="w-5 h-5 text-white" />
            <div>
              <p className="text-sm font-bold text-white">Pay Supplier</p>
              <p className="text-[11px] text-blue-200">{preview?.provider || 'Bank transfer'}</p>
            </div>
          </div>
          {stage !== 'processing' && (
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        <div className="p-6">
          {stage === 'loading' && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#4C3AE3' }} />
            </div>
          )}

          {stage === 'error' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button onClick={handleClose} className="w-full py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                Close
              </button>
            </div>
          )}

          {stage === 'review' && preview && (
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Paying</p>
                <p className="text-lg font-extrabold" style={{ color: '#0f172a' }}>{preview.vendorName}</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>Against PO {preview.poNumber}</p>
              </div>

              <div className="rounded-xl border p-4 space-y-2.5" style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
                <Row label="BSB" value={preview.bsb} mono />
                <Row label="Account Number" value={preview.accountNumber} mono />
                <Row label="Account Name" value={preview.accountName} />
              </div>

              <div className="flex items-baseline justify-between pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Amount</span>
                <span className="text-2xl font-black font-mono" style={{ color: '#0f172a' }}>{preview.currency} {preview.amount.toFixed(2)}</span>
              </div>

              {!preview.canPay && (
                <p className="text-xs font-semibold px-3 py-2 rounded-xl" style={{ background: '#fef2f2', color: '#991b1b' }}>
                  This order is at status {preview.status} — payment is only available once matched or billed.
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={confirmPayment}
                  disabled={!preview.canPay}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                  style={{ background: '#4C3AE3' }}
                >
                  Confirm &amp; Send
                </button>
              </div>
            </div>
          )}

          {stage === 'processing' && preview && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#4C3AE3' }} />
              <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Sending via {preview.provider}…</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>{preview.currency} {preview.amount.toFixed(2)} to {preview.vendorName}</p>
            </div>
          )}

          {stage === 'success' && preview && (
            <div className="space-y-5 text-center">
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#ecfdf5' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: '#059669' }} />
                </div>
                <div>
                  <p className="text-base font-extrabold" style={{ color: '#0f172a' }}>Payment Sent</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{preview.currency} {preview.amount.toFixed(2)} to {preview.vendorName}</p>
                </div>
              </div>
              <div className="rounded-xl border p-4 space-y-2 text-left" style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
                <Row label="Transaction ID" value={transactionId} mono />
                <Row label="Sent at" value={new Date().toLocaleString('en-AU')} />
              </div>
              <button onClick={handleClose} className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors" style={{ background: '#4C3AE3' }}>
                Done <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-xs shrink-0" style={{ color: '#94a3b8' }}>{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono' : 'font-semibold'}`} style={{ color: '#0f172a' }}>{value}</span>
    </div>
  );
}
