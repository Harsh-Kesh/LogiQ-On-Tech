'use client';

import { useState } from 'react';
import { X, Truck, CheckCircle2, Loader2 } from 'lucide-react';
import { CARRIERS } from '@/lib/carriers';

interface DispatchModalProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onDispatched: () => void;
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

// For a BILL_CREATED order whose supplier invoice had no readable tracking number:
// the owner enters it, the customer gets the tracking email, the order is dispatched.
export default function DispatchModal({ orderId, orderNumber, onClose, onDispatched }: DispatchModalProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [dispatchDate, setDispatchDate] = useState(todayIso());
  const [stage, setStage] = useState<'review' | 'processing' | 'success' | 'error'>('review');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ trackingUrl?: string | null; emailSent?: boolean } | null>(null);

  const confirm = async () => {
    setStage('processing');
    try {
      const res = await fetch(`/api/storefront/orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber, carrier: carrier || undefined, dispatchDate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to dispatch.');
        setStage('error');
        return;
      }
      setResult(data);
      setStage('success');
    } catch {
      setError('Network error — please try again.');
      setStage('error');
    }
  };

  const handleClose = () => {
    if (stage === 'success') onDispatched();
    onClose();
  };

  const inputStyle = { borderColor: '#e2e8f0', color: '#0f172a' };
  const labelCls = 'block text-xs font-bold uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }} onClick={stage === 'processing' ? undefined : handleClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: '#059669' }}>
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-white" />
            <div>
              <p className="text-sm font-bold text-white">Send Tracking to Customer</p>
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
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); confirm(); }}>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                The supplier invoice had no tracking number we could read. Enter it from the
                invoice or the supplier — the customer is emailed a tracking link and their tax invoice.
              </p>
              <div>
                <label htmlFor="d-tracking" className={labelCls} style={{ color: '#374151' }}>Tracking Number</label>
                <input id="d-tracking" required minLength={3} maxLength={60} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="d-carrier" className={labelCls} style={{ color: '#374151' }}>Carrier</label>
                <input id="d-carrier" list="d-carriers" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Australia Post"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none" style={inputStyle} />
                <datalist id="d-carriers">
                  {Object.values(CARRIERS).map((c) => <option key={c.label} value={c.label} />)}
                </datalist>
              </div>
              <div>
                <label htmlFor="d-date" className={labelCls} style={{ color: '#374151' }}>Dispatch Date</label>
                <input id="d-date" type="date" value={dispatchDate} max={todayIso()} onChange={(e) => setDispatchDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none" style={inputStyle} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={handleClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors" style={{ background: '#059669' }}>
                  Send
                </button>
              </div>
            </form>
          )}

          {stage === 'processing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#059669' }} />
              <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Sending tracking…</p>
            </div>
          )}

          {stage === 'error' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button onClick={() => setStage('review')} className="w-full py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                Back
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
                  <p className="text-base font-extrabold" style={{ color: '#0f172a' }}>Order Dispatched</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                    {result?.emailSent === false ? 'Saved, but the email failed — check the Emails page.' : 'Customer emailed their tracking and tax invoice.'}
                    {!result?.trackingUrl && ' No tracking link for this carrier — the email shows the number only.'}
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
