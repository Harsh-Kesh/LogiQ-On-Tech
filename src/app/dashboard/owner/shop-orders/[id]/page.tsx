'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Package, User, MapPin, CreditCard, Truck,
  CheckCircle2, Clock, Send, Mail, ExternalLink, FileText,
  DollarSign, RotateCcw, ShieldAlert, AlertTriangle, Search,
} from 'lucide-react';
import PaySupplierModal from '@/components/orders/PaySupplierModal';
import MarkFulfilledModal from '@/components/orders/MarkFulfilledModal';

interface OrderItem {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: string | number;
  taxPercent: string | number;
  lineTotal: string | number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  deliveryAddress: string;
  currency: string;
  subtotal: string | number;
  taxTotal: string | number;
  totalAmount: string | number;
  status: string;
  stripeSessionId?: string;
  stripePaymentId?: string;
  paidAt?: string;
  createdAt: string;
  // MYOB / supplier
  myobSoNumber?: string;
  myobPoNumber?: string;
  myobBillNumber?: string;
  myobInvoiceNumber?: string;
  monoovaTxnId?: string;
  threeWayMatchResult?: string | null;
  threeWayMatchNotes?: string | null;
  sektorStatus?: string | null;
  poEmailSentTo?: string;
  poEmailSentAt?: string;
  // SO link
  salesOrder?: {
    salesOrderNumber: string;
    status: string;
  } | null;
  items: OrderItem[];
}

const PIPELINE_STEPS = ['PAID', 'SO_CREATED', 'PO_SENT', 'INVOICE_RECEIVED', 'MATCHED', 'BILL_CREATED', 'SUPPLIER_PAID', 'FULFILLED'];
const PIPELINE_STEP_LABELS = [
  { key: 'PAID', label: 'Payment Received', icon: CreditCard },
  { key: 'SO_CREATED', label: 'Sales Order Created', icon: Package },
  { key: 'PO_SENT', label: 'PO Sent to Supplier', icon: Send },
  { key: 'INVOICE_RECEIVED', label: 'Supplier Invoice Received', icon: FileText },
  { key: 'MATCHED', label: '3-Way Matched', icon: CheckCircle2 },
  { key: 'BILL_CREATED', label: 'Bill Created', icon: FileText },
  { key: 'SUPPLIER_PAID', label: 'Supplier Paid', icon: DollarSign },
  { key: 'FULFILLED', label: 'Fulfilled', icon: CheckCircle2 },
];

const PAY_ELIGIBLE = new Set(['MATCHED', 'BILL_CREATED']);
const FULFILL_ELIGIBLE = new Set(['SUPPLIER_PAID']);
const FORCE_MATCH_ELIGIBLE = new Set(['MATCH_EXCEPTION', 'MATCHED', 'INVOICE_RECEIVED', 'BILL_CREATED']);

export default function ShopOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showPayModal, setShowPayModal] = useState(false);
  const [simulatingId, setSimulatingId] = useState(false);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [retryingPoId, setRetryingPoId] = useState(false);
  const [forceMatchId, setForceMatchId] = useState(false);

  const load = () => {
    fetch(`/api/storefront/orders/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setOrder)
      .catch(() => setError('Order not found.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleRetryPo = async () => {
    if (!order || !confirm('Retry creating the MYOB Purchase Order for this order?')) return;
    setRetryingPoId(true);
    const res = await fetch('/api/myob/po', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefrontOrderId: order.id }),
    });
    setRetryingPoId(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) { alert(`PO created: ${data.poNumber}`); load(); }
    else alert(`Failed: ${data.error || res.statusText}`);
  };

  const handleForceMatch = async () => {
    if (!order) return;
    const label = order.status === 'MATCH_EXCEPTION' ? 'override the exception and force-match' : 'force the order through bill/payment';
    if (!confirm(`This will ${label} for this order. Continue?`)) return;
    setForceMatchId(true);
    const res = await fetch('/api/demo/force-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefrontOrderId: order.id }),
    });
    setForceMatchId(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) { alert(`Force match complete!\nNew status: ${data.orderStatus}\n${data.notes || ''}`); load(); }
    else alert(`Failed: ${data.error || res.statusText}`);
  };

  const handleSimulateInvoice = async () => {
    if (!order || !confirm('Simulate a supplier invoice arriving for this order? This will trigger the 3-way match immediately.')) return;
    setSimulatingId(true);
    const res = await fetch('/api/demo/simulate-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefrontOrderId: order.id }),
    });
    setSimulatingId(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) { alert(`Invoice simulated! ${data.matched ? '✓ 3-way match PASSED' : '⚠ Match exception — check variance'}\n${data.notes}`); load(); }
    else alert(`Simulation failed: ${data.error || res.statusText}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <style>{`@keyframes _spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#4C3AE3', animation: '_spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-32">
        <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>{error || 'Order not found.'}</p>
        <Link href="/dashboard/owner/shop-orders" className="text-xs mt-4 inline-block" style={{ color: '#4C3AE3' }}>← Back to orders</Link>
      </div>
    );
  }

  const fmt = (v: string | number) => Number(v).toFixed(2);
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const currentStepIdx = PIPELINE_STEPS.indexOf(order.status);
  const canPay = PAY_ELIGIBLE.has(order.status);
  const canFulfill = FULFILL_ELIGIBLE.has(order.status);
  const canForceMatch = FORCE_MATCH_ELIGIBLE.has(order.status);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Back + header */}
      <div>
        <Link href="/dashboard/owner/shop-orders" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4 hover:underline" style={{ color: '#4C3AE3' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Shop Orders
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Order</p>
            <h1 className="text-2xl font-extrabold font-mono" style={{ color: '#0f172a' }}>{order.orderNumber}</h1>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Placed {fmtDate(order.createdAt)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={order.status} />
            <Link
              href={`/dashboard/owner/traceability?orderId=${order.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
              style={{ color: '#4C3AE3' }}
            >
              <Search className="w-3 h-3" /> Investigate full history →
            </Link>
          </div>
        </div>
        {order.threeWayMatchResult === 'EXCEPTION' && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-600">
            <AlertTriangle className="w-3.5 h-3.5" /> 3-way match exception — check the variance before proceeding.
          </div>
        )}
      </div>

      {/* Operational actions */}
      <div className="flex flex-wrap gap-2">
        {order.status === 'PAID' && (
          <ActionButton onClick={handleRetryPo} loading={retryingPoId} icon={RotateCcw} color="#f97316" label="Fix: Create SO + PO" loadingLabel="Creating…" />
        )}
        {order.status === 'SO_CREATED' && (
          <ActionButton onClick={handleRetryPo} loading={retryingPoId} icon={RotateCcw} color="#f59e0b" label="Retry PO" loadingLabel="Retrying…" />
        )}
        {canForceMatch && (
          <ActionButton
            onClick={handleForceMatch}
            loading={forceMatchId}
            icon={ShieldAlert}
            color="#e11d48"
            label={order.status === 'MATCH_EXCEPTION' ? 'Override Match' : 'Force Through'}
            loadingLabel="Forcing…"
          />
        )}
        {order.status === 'PO_SENT' && (
          <ActionButton onClick={handleSimulateInvoice} loading={simulatingId} icon={FileText} color="#7c3aed" label="Simulate Invoice" loadingLabel="Simulating…" />
        )}
        {canPay && (
          <ActionButton onClick={() => setShowPayModal(true)} loading={false} icon={DollarSign} color="#16a34a" label="Pay Supplier" loadingLabel="Processing…" />
        )}
        {canFulfill && (
          <ActionButton
            onClick={() => setShowFulfillModal(true)}
            loading={false}
            icon={Truck}
            color="#059669"
            label="Mark as Fulfilled"
            loadingLabel="Marking…"
          />
        )}
      </div>

      {/* Stage timeline */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e2e8f0' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: '#94a3b8' }}>Order Progress</p>
        <div className="flex items-start gap-0 overflow-x-auto">
          {PIPELINE_STEP_LABELS.map((stage, i) => {
            const stepIdx = PIPELINE_STEPS.indexOf(stage.key);
            const done = stepIdx <= currentStepIdx;
            const active = stepIdx === currentStepIdx;
            const isException = order.status === 'MATCH_EXCEPTION' && stage.key === 'MATCHED';
            const Icon = stage.icon;
            return (
              <div key={stage.key} className="flex-1 min-w-[88px] flex flex-col items-center text-center relative">
                {i > 0 && (
                  <div style={{
                    position: 'absolute', top: 16, right: '50%', width: '100%', height: 2,
                    background: done ? (isException ? '#ef4444' : '#4C3AE3') : '#e2e8f0',
                    zIndex: 0,
                  }} />
                )}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', position: 'relative', zIndex: 1,
                  background: isException ? '#ef4444' : done ? '#4C3AE3' : '#f1f5f9',
                  border: `2px solid ${isException ? '#ef4444' : done ? '#4C3AE3' : '#e2e8f0'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: active ? '0 0 0 4px rgba(30,58,138,0.12)' : 'none',
                }}>
                  <Icon style={{ width: 14, height: 14, color: done || isException ? '#fff' : '#cbd5e1' }} />
                </div>
                <p className="text-[10px] font-semibold mt-2 leading-tight px-1" style={{ color: done ? '#0f172a' : '#94a3b8' }}>
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>

        {order.status === 'FULFILLED' && (
          <div className="mt-4 pt-4 border-t flex items-center gap-1.5 text-xs font-semibold" style={{ borderColor: '#f1f5f9', color: '#059669' }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered — marked fulfilled by owner
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer */}
        <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4" style={{ color: '#4C3AE3' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Customer</p>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#0f172a' }}>{order.customerName}</p>
            <a href={`mailto:${order.customerEmail}`} className="text-xs hover:underline" style={{ color: '#4C3AE3' }}>{order.customerEmail}</a>
          </div>
          <div className="flex items-start gap-2 pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#94a3b8' }} />
            <p className="text-xs leading-snug" style={{ color: '#475569' }}>{order.deliveryAddress}</p>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4" style={{ color: '#4C3AE3' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Payment</p>
          </div>
          <div className="space-y-2">
            <Row label="Paid at" value={fmtDate(order.paidAt)} />
            {order.stripePaymentId && (
              <Row label="Stripe Payment" value={
                <span className="font-mono text-[10px] truncate block" style={{ color: '#64748b' }}>{order.stripePaymentId}</span>
              } />
            )}
            <div className="border-t pt-2 space-y-1.5" style={{ borderColor: '#f1f5f9' }}>
              <Row label="Subtotal" value={`${order.currency} ${fmt(order.subtotal)}`} />
              <Row label="GST (10%)" value={`${order.currency} ${fmt(order.taxTotal)}`} />
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-bold" style={{ color: '#0f172a' }}>Total Paid</span>
                <span className="text-sm font-black font-mono" style={{ color: '#0f172a' }}>{order.currency} {fmt(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#f1f5f9' }}>
          <Package className="w-4 h-4" style={{ color: '#4C3AE3' }} />
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Items Ordered</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>SKU</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Item</th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Qty</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Unit (ex GST)</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: i < order.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{item.itemCode}</td>
                  <td className="px-5 py-3 font-semibold text-xs" style={{ color: '#0f172a' }}>{item.itemName}</td>
                  <td className="px-5 py-3 text-center text-xs font-mono" style={{ color: '#0f172a' }}>{item.quantity}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs" style={{ color: '#0f172a' }}>{order.currency} {fmt(item.unitPrice)}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs font-bold" style={{ color: '#0f172a' }}>{order.currency} {fmt(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier / SO / PO / fulfilment */}
      {(order.salesOrder || order.myobPoNumber || order.poEmailSentTo || order.myobBillNumber || order.myobInvoiceNumber) && (
        <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-4 h-4" style={{ color: '#4C3AE3' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Supplier & Fulfilment</p>
          </div>
          <div className="space-y-2">
            {(order.myobSoNumber || order.salesOrder?.salesOrderNumber) && (
              <Row label="Sales Order #" value={
                <span className="font-mono text-xs" style={{ color: '#4C3AE3' }}>
                  {order.myobSoNumber || order.salesOrder?.salesOrderNumber}
                </span>
              } />
            )}
            {order.myobPoNumber && <Row label="Purchase Order #" value={order.myobPoNumber} mono />}
            {order.threeWayMatchNotes && (
              <Row label="3-Way Match" value={
                <span className="text-[11px] leading-snug" style={{ color: order.threeWayMatchResult === 'EXCEPTION' ? '#dc2626' : '#166534' }}>
                  {order.threeWayMatchNotes}
                </span>
              } />
            )}
            {order.myobBillNumber && (
              <Row label="Supplier Bill #" value={
                <span>
                  <span className="font-mono">{order.myobBillNumber}</span>
                  <span className="block text-[10px] font-normal mt-0.5" style={{ color: '#94a3b8' }}>
                    Our payable record — this is what we owe the supplier, created once their invoice is matched
                  </span>
                </span>
              } />
            )}
            {order.myobInvoiceNumber && <Row label="Customer Invoice #" value={order.myobInvoiceNumber} mono />}
            {order.monoovaTxnId && <Row label="Payment Reference" value={order.monoovaTxnId} mono />}
            {order.poEmailSentTo && (
              <Row label="PO Emailed to" value={
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" style={{ color: '#94a3b8' }} />
                  <a href={`mailto:${order.poEmailSentTo}`} className="text-xs hover:underline" style={{ color: '#4C3AE3' }}>{order.poEmailSentTo}</a>
                </span>
              } />
            )}
            {order.poEmailSentAt && <Row label="PO Sent at" value={fmtDate(order.poEmailSentAt)} />}
          </div>
          <div className="pt-3 border-t" style={{ borderColor: '#f1f5f9' }}>
            <Link
              href="/dashboard/owner/emails"
              className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
              style={{ color: '#4C3AE3' }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> View all sent emails (PO, confirmation)
            </Link>
          </div>
        </div>
      )}

      {showPayModal && (
        <PaySupplierModal
          orderId={order.id}
          onClose={() => setShowPayModal(false)}
          onPaid={() => { setShowPayModal(false); load(); }}
        />
      )}

      {showFulfillModal && (
        <MarkFulfilledModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          onClose={() => setShowFulfillModal(false)}
          onFulfilled={() => { setShowFulfillModal(false); load(); }}
        />
      )}
    </div>
  );
}

function ActionButton({
  onClick, loading, icon: Icon, color, label, loadingLabel,
}: {
  onClick: () => void; loading: boolean; icon: React.ComponentType<{ className?: string }>;
  color: string; label: string; loadingLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold transition-all disabled:opacity-60"
      style={{ background: color }}
    >
      <Icon className="w-3.5 h-3.5" />
      {loading ? loadingLabel : label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    PENDING_PAYMENT: { label: 'Pending Payment', bg: '#fafafa', color: '#71717a', border: '#e4e4e7' },
    PAID:             { label: 'Paid',             bg: '#EEF0FE', color: '#4C3AE3', border: '#D9D4FB' },
    SO_CREATED:       { label: 'SO Created',        bg: '#EEF0FE', color: '#4C3AE3', border: '#D9D4FB' },
    PO_SENT:          { label: 'PO Sent',           bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
    INVOICE_RECEIVED: { label: 'Invoice Received',  bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    MATCH_PENDING:    { label: 'Match Pending',     bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
    MATCHED:          { label: 'Matched ✓',         bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    MATCH_EXCEPTION:  { label: 'Match Exception',   bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
    BILL_CREATED:     { label: 'Bill Created',      bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
    PAYMENT_SCHEDULED:{ label: 'Payment Scheduled', bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
    SUPPLIER_PAID:    { label: 'Supplier Paid',     bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
    FULFILLED:        { label: 'Fulfilled',         bg: '#ecfdf5', color: '#15803d', border: '#86efac' },
    CANCELLED:        { label: 'Cancelled',         bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  };
  const s = map[status] ?? map.PENDING_PAYMENT;
  return (
    <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs shrink-0" style={{ color: '#94a3b8' }}>{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono' : 'font-semibold'}`} style={{ color: '#0f172a' }}>{value}</span>
    </div>
  );
}
