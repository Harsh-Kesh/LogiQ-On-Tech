'use client';

import { useState } from 'react';
import { X, Truck, CheckCircle2, Loader2 } from 'lucide-react';

interface MarkFulfilledModalProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onFulfilled: () => void;
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export default function MarkFulfilledModal({ orderId, orderNumber, onClose, onFulfilled }: MarkFulfilledModalProps) {
  const [deliveryDate, setDeliveryDate] = useState(todayIso());
  const [stage, setStage] = useState<'review' | 'processing' | 'success' | 'error'>('review');
  const [error, setError] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);

  const confirm = async () => {
    setStage('processing');
    try {
      const res = await fetch('/api/demo/simulate-sektor-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storefrontOrderId: orderId, deliveryDate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to mark as fulfilled.');
        setStage('error');
        return;
      }
      setInvoiceNumber(data.myobInvoiceNumber || null);
      setStage('success');
    } catch {
      setError('Network error — please try again.');
      setStage('error');
    }
  };

  const handleClose = () => {
    if (stage === 'success') onFulfilled();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }} onClick={stage === 'processing' ? undefined : handleClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: '#059669' }}>
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-white" />
            <div>
              <p className="text-sm font-bold text-white">Mark as Fulfilled</p>
              <p className="text-[11px] text-emerald-100">{orderNumber}</p>
            </div>
          </div>
          {stage !== 'processing' && (
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        <div className="p-6">
          {stage === 'review' && (
            <div className="space-y-5">
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                We don't get real delivery updates, so this is what starts the warranty clock.
                It's set to today — change it only if the goods actually reached the customer on
                an earlier date and you're just getting around to marking it now.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#374151' }}>
                  Delivery Date <span className="font-normal normal-case" style={{ color: '#94a3b8' }}>(defaults to today)</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  max={todayIso()}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
                  style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button onClick={confirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors" style={{ background: '#059669' }}>
                  Confirm
                </button>
              </div>
            </div>
          )}

          {stage === 'processing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#059669' }} />
              <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Marking fulfilled…</p>
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

          {stage === 'success' && (
            <div className="space-y-5 text-center">
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#ecfdf5' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: '#059669' }} />
                </div>
                <div>
                  <p className="text-base font-extrabold" style={{ color: '#0f172a' }}>Order Fulfilled</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                    Customer emailed their tax invoice{invoiceNumber ? ` (${invoiceNumber})` : ''}.
                    Warranty clock started {new Date(deliveryDate).toLocaleDateString('en-AU')}.
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-colors" style={{ background: '#059669' }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
