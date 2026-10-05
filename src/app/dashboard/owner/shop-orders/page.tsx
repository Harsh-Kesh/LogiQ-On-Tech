'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag, RefreshCw, Search, ArrowRight, AlertTriangle, DollarSign,
  FileText, Truck, Download, RotateCcw, Settings, Inbox,
  ShieldAlert,
} from 'lucide-react';
import PaySupplierModal from '@/components/orders/PaySupplierModal';
import MarkFulfilledModal from '@/components/orders/MarkFulfilledModal';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: string | number;
  currency: string;
  status: string;
  createdAt: string;
  stripePaymentId?: string;
  myobSoNumber: string | null;
  myobPoNumber: string | null;
  myobBillNumber: string | null;
  myobInvoiceNumber: string | null;
  monoovaTxnId: string | null;
  threeWayMatchResult: string | null;
  sektorStatus: string | null;
  salesOrder?: { salesOrderNumber: string; status: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-slate-100 text-slate-600' },
  PAID: { label: 'Paid', color: 'bg-blue-100 text-blue-700' },
  SO_CREATED: { label: 'SO Created', color: 'bg-blue-100 text-blue-700' },
  PO_SENT: { label: 'PO Sent', color: 'bg-[#EEF0FE] text-[#4C3AE3]' },
  INVOICE_RECEIVED: { label: 'Invoice Received', color: 'bg-violet-100 text-violet-700' },
  MATCH_PENDING: { label: 'Match Pending', color: 'bg-amber-100 text-amber-700' },
  MATCHED: { label: 'Matched ✓', color: 'bg-green-100 text-green-700' },
  MATCH_EXCEPTION: { label: 'Match Exception', color: 'bg-red-100 text-red-700' },
  BILL_CREATED: { label: 'Bill Created', color: 'bg-teal-100 text-teal-700' },
  PAYMENT_SCHEDULED: { label: 'Payment Scheduled', color: 'bg-cyan-100 text-cyan-700' },
  SUPPLIER_PAID: { label: 'Supplier Paid', color: 'bg-green-100 text-green-800' },
  FULFILLED: { label: 'Fulfilled', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-50 text-red-500' },
};

const PAY_ELIGIBLE = new Set(['MATCHED', 'BILL_CREATED']);
const FULFILL_ELIGIBLE = new Set(['SUPPLIER_PAID']);
const FORCE_MATCH_ELIGIBLE = new Set(['MATCH_EXCEPTION', 'MATCHED', 'INVOICE_RECEIVED', 'BILL_CREATED']);

const PIPELINE_STEPS = ['PAID', 'SO_CREATED', 'PO_SENT', 'INVOICE_RECEIVED', 'MATCHED', 'BILL_CREATED', 'SUPPLIER_PAID', 'FULFILLED'];
const PIPELINE_STEP_LABELS = [
  { key: 'PAID', label: 'Paid' },
  { key: 'SO_CREATED', label: 'SO' },
  { key: 'PO_SENT', label: 'PO Sent' },
  { key: 'INVOICE_RECEIVED', label: 'Invoice' },
  { key: 'MATCHED', label: 'Matched' },
  { key: 'BILL_CREATED', label: 'Bill' },
  { key: 'SUPPLIER_PAID', label: 'Paid Out' },
  { key: 'FULFILLED', label: 'Done' },
];

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [payOrderId, setPayOrderId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [fulfillOrder, setFulfillOrder] = useState<{ id: string; orderNumber: string } | null>(null);
  const [retryingPoId, setRetryingPoId] = useState<string | null>(null);
  const [forceMatchId, setForceMatchId] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/storefront/orders');
      if (res.ok) setOrders(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSetupDemo = async () => {
    if (!confirm('This will patch all vendors and items with demo data (bank details, warranty periods, supplier emails). Run once before the demo.')) return;
    setSettingUp(true);
    const res = await fetch('/api/demo/setup', { method: 'POST' });
    setSettingUp(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert(`Demo setup complete!\n\n${(data.patched || []).join('\n')}`);
    } else {
      alert(`Setup failed: ${data.error || res.statusText}`);
    }
  };

  const handleForceMatch = async (orderId: string, status: string) => {
    const label = status === 'MATCH_EXCEPTION' ? 'override the exception and force-match' : 'force the order through bill/payment';
    if (!confirm(`This will ${label} for this order. Continue?`)) return;
    setForceMatchId(orderId);
    const res = await fetch('/api/demo/force-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefrontOrderId: orderId }),
    });
    setForceMatchId(null);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert(`Force match complete!\nNew status: ${data.orderStatus}\n${data.notes || ''}`);
      load();
    } else {
      alert(`Failed: ${data.error || res.statusText}`);
    }
  };

  const handleSimulateInvoice = async (orderId: string) => {
    if (!confirm('Simulate a supplier invoice arriving for this order? This will trigger the 3-way match immediately.')) return;
    setSimulatingId(orderId);
    const res = await fetch('/api/demo/simulate-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefrontOrderId: orderId }),
    });
    setSimulatingId(null);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert(`Invoice simulated! ${data.matched ? '✓ 3-way match PASSED' : '⚠ Match exception — check variance'}\n${data.notes}`);
      load();
    } else {
      alert(`Simulation failed: ${data.error || res.statusText}`);
    }
  };

  const handleRetryPo = async (orderId: string) => {
    if (!confirm('Retry creating the MYOB Purchase Order for this order?')) return;
    setRetryingPoId(orderId);
    const res = await fetch('/api/myob/po', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefrontOrderId: orderId }),
    });
    setRetryingPoId(null);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert(`PO created: ${data.poNumber}`);
      load();
    } else {
      alert(`Failed: ${data.error || res.statusText}`);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Order #', 'Customer', 'Email', 'Total', 'Status', 'SO #', 'PO #', 'Bill #', 'Txn ID', 'Created'];
    const rows = filtered.map((o) => [
      o.orderNumber, o.customerName, o.customerEmail,
      `${o.currency} ${Number(o.totalAmount).toFixed(2)}`,
      o.status, o.myobSoNumber || o.salesOrder?.salesOrderNumber || '', o.myobPoNumber || '', o.myobBillNumber || '',
      o.monoovaTxnId || '', new Date(o.createdAt).toLocaleDateString('en-AU'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'shop-orders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const bySearch = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  });
  const filtered = statusFilter === 'ALL' ? bySearch : bySearch.filter((o) => o.status === statusFilter);
  const statuses = ['ALL', ...Array.from(new Set(orders.map((o) => o.status)))];

  const fmt = (v: string | number) => Number(v).toFixed(2);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-5 h-5" style={{ color: '#4C3AE3' }} />
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Shop Orders</h1>
          </div>
          <p className="text-sm max-w-2xl" style={{ color: '#64748b' }}>
            Every order placed through the online store — customer details, sales/purchase order
            references, supplier invoice matching, payment and delivery, all in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link
            href="/dashboard/owner/emails"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition"
          >
            <Inbox className="w-3.5 h-3.5" />
            Email Inbox
          </Link>
          <button
            onClick={handleSetupDemo}
            disabled={settingUp}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EEF0FE] hover:bg-[#dbeafe] text-[#4C3AE3] border border-[#D9D4FB] text-xs font-semibold transition disabled:opacity-60"
          >
            <Settings className="w-3.5 h-3.5" />
            {settingUp ? 'Setting up…' : 'Setup Demo Data'}
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: '#e2e8f0' }}>
        <Search className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number, customer name or email…"
          className="flex-1 text-sm outline-none bg-transparent placeholder-slate-400"
          style={{ color: '#0f172a' }}
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Clear</button>
        )}
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
              statusFilter === s
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {s === 'ALL' ? 'All Orders' : (STATUS_LABELS[s]?.label || s)}
          </button>
        ))}
      </div>

      {/* Order cards */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: '#e2e8f0' }}>
          <ShoppingBag className="w-8 h-8 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>
            {search || statusFilter !== 'ALL' ? 'No orders match your filters.' : 'No orders yet.'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Orders placed in the shop will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const badge = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-slate-100 text-slate-600' };
            const canPay = PAY_ELIGIBLE.has(order.status);
            const canFulfill = FULFILL_ELIGIBLE.has(order.status);
            const canForceMatch = FORCE_MATCH_ELIGIBLE.has(order.status);
            // Only a legacy (pre-unification) order has an SO number that differs from
            // its order number — new orders share one number, so nothing extra to show.
            const rawSoNumber = order.myobSoNumber || order.salesOrder?.salesOrderNumber;
            const soNumber = rawSoNumber && rawSoNumber !== order.orderNumber ? rawSoNumber : null;
            return (
              <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link href={`/dashboard/owner/shop-orders/${order.id}`} className="font-bold text-slate-900 hover:underline hover:text-[#4C3AE3]">
                        {order.orderNumber}
                      </Link>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                      {order.threeWayMatchResult === 'EXCEPTION' && (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Match Exception
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      {order.customerName} · {order.customerEmail}
                    </div>
                    {soNumber && <div className="text-xs text-slate-400">SO: <span className="font-mono text-slate-600">{soNumber}</span></div>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {order.currency} {fmt(order.totalAmount)}
                    </span>
                    {order.status === 'PAID' && (
                      <button
                        onClick={() => handleRetryPo(order.id)}
                        disabled={retryingPoId === order.id}
                        title="Order is stuck at PAID — create Sales Order + Purchase Order"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition disabled:opacity-60"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {retryingPoId === order.id ? 'Creating…' : 'Fix: Create SO + PO'}
                      </button>
                    )}
                    {order.status === 'SO_CREATED' && (
                      <button
                        onClick={() => handleRetryPo(order.id)}
                        disabled={retryingPoId === order.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition disabled:opacity-60"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {retryingPoId === order.id ? 'Retrying…' : 'Retry PO'}
                      </button>
                    )}
                    {canForceMatch && (
                      <button
                        onClick={() => handleForceMatch(order.id, order.status)}
                        disabled={forceMatchId === order.id}
                        title={order.status === 'MATCH_EXCEPTION' ? 'Override the match exception and force through' : 'Force bill creation, payment, and warranty records'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition disabled:opacity-60"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {forceMatchId === order.id ? 'Forcing…' : order.status === 'MATCH_EXCEPTION' ? 'Override Match' : 'Force Through'}
                      </button>
                    )}
                    {order.status === 'PO_SENT' && (
                      <button
                        onClick={() => handleSimulateInvoice(order.id)}
                        disabled={simulatingId === order.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition disabled:opacity-60"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {simulatingId === order.id ? 'Simulating…' : 'Simulate Invoice'}
                      </button>
                    )}
                    {canPay && (
                      <button
                        onClick={() => setPayOrderId(order.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Pay Supplier
                      </button>
                    )}
                    {canFulfill && (
                      <button
                        onClick={() => setFulfillOrder({ id: order.id, orderNumber: order.orderNumber })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Mark as Fulfilled
                      </button>
                    )}
                    <Link
                      href={`/dashboard/owner/shop-orders/${order.id}`}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-[#4C3AE3] hover:bg-[#EEF0FE] transition"
                    >
                      Details <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Pipeline progress trail */}
                <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-semibold text-slate-400">
                  {PIPELINE_STEP_LABELS.map((step, i, arr) => {
                    const orderIdx = PIPELINE_STEPS.indexOf(order.status);
                    const stepIdx = PIPELINE_STEPS.indexOf(step.key);
                    const done = stepIdx <= orderIdx;
                    const current = stepIdx === orderIdx;
                    const isException = order.status === 'MATCH_EXCEPTION' && step.key === 'MATCHED';
                    return (
                      <span key={step.key} className="flex items-center gap-1 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            isException
                              ? 'bg-red-100 text-red-600'
                              : done
                              ? 'bg-[#4C3AE3] text-white'
                              : current
                              ? 'bg-[#EEF0FE] text-[#4C3AE3]'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                        {i < arr.length - 1 && <span className="text-slate-300">→</span>}
                      </span>
                    );
                  })}
                </div>

                {/* Reference numbers */}
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                  {order.myobPoNumber && <span>PO: <strong className="text-slate-700">{order.myobPoNumber}</strong></span>}
                  {order.myobBillNumber && <span>Bill: <strong className="text-slate-700">{order.myobBillNumber}</strong></span>}
                  {order.myobInvoiceNumber && <span>Inv: <strong className="text-emerald-700">{order.myobInvoiceNumber}</strong></span>}
                  {order.monoovaTxnId && <span>Payment Ref: <strong className="text-slate-700">{order.monoovaTxnId}</strong></span>}
                  <span className="ml-auto">{fmtDate(order.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
          {filtered.length} order{filtered.length !== 1 ? 's' : ''} {search || statusFilter !== 'ALL' ? 'found' : 'total'}
        </p>
      )}

      {payOrderId && (
        <PaySupplierModal
          orderId={payOrderId}
          onClose={() => setPayOrderId(null)}
          onPaid={() => { setPayOrderId(null); load(); }}
        />
      )}

      {fulfillOrder && (
        <MarkFulfilledModal
          orderId={fulfillOrder.id}
          orderNumber={fulfillOrder.orderNumber}
          onClose={() => setFulfillOrder(null)}
          onFulfilled={() => { setFulfillOrder(null); load(); }}
        />
      )}
    </div>
  );
}
