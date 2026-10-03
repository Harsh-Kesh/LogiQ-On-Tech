'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, DollarSign, FileText, Truck, Download, RotateCcw, Settings, Rss, Inbox } from 'lucide-react';
import Link from 'next/link';

interface SFOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: string;
  currency: string;
  status: string;
  paidAt: string | null;
  myobSoNumber: string | null;
  myobPoNumber: string | null;
  myobBillNumber: string | null;
  myobInvoiceNumber: string | null;
  monoovaTxnId: string | null;
  supplierPaidAt: string | null;
  threeWayMatchResult: string | null;
  sektorStatus: string | null;
  sektorTrackingNumber: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-slate-100 text-slate-600' },
  PAID: { label: 'Paid', color: 'bg-blue-100 text-blue-700' },
  SO_CREATED: { label: 'SO Created', color: 'bg-blue-100 text-blue-700' },
  PO_SENT: { label: 'PO Sent', color: 'bg-indigo-100 text-indigo-700' },
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
const SEKTOR_STAGE_ELIGIBLE = new Set(['SUPPLIER_PAID']);

const SEKTOR_STAGES = ['PROCESSING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
const SEKTOR_STAGE_LABELS: Record<string, string> = {
  PROCESSING: 'Processing',
  DISPATCHED: 'Dispatched',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered → Fulfilled',
};
function nextSektorStage(current: string | null): string {
  if (!current) return 'PROCESSING';
  const idx = SEKTOR_STAGES.indexOf(current as any);
  if (idx === -1 || idx === SEKTOR_STAGES.length - 1) return 'DELIVERED';
  return SEKTOR_STAGES[idx + 1];
}

export default function PipelinePage() {
  const [orders, setOrders] = useState<SFOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [sektorStageId, setSektorStageId] = useState<string | null>(null);
  const [retryingPoId, setRetryingPoId] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [syncingSektor, setSyncingSektor] = useState(false);

  const handleSyncSektor = async () => {
    if (!confirm('Sync product data from Sektor catalog feed? This will update supplier codes, cost prices, and lead times on all matched items.')) return;
    setSyncingSektor(true);
    const res = await fetch('/api/sektor/sync', { method: 'POST' });
    setSyncingSektor(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const mode = data.demo ? '(DEMO MODE — simulated feed)' : '(Live Sektor API)';
      alert(`Sektor sync complete ${mode}\n\nUpdated: ${data.syncedCount}\nNo change: ${data.noChangeCount}\nSkipped: ${data.skippedCount}`);
    } else {
      alert(`Sync failed: ${data.error || res.statusText}`);
    }
  };

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
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchOrders = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/pipeline');
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

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
      fetchOrders();
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
      fetchOrders();
    } else {
      alert(`Failed: ${data.error || res.statusText}`);
    }
  };

  const handleSimulateSektorStage = async (order: SFOrder) => {
    const next = nextSektorStage(order.sektorStatus);
    const label = SEKTOR_STAGE_LABELS[next] || next;
    if (!confirm(`Simulate Sektor status → ${label}?\n\nThis will update the order status and email the customer.`)) return;
    setSektorStageId(order.id);
    const res = await fetch('/api/demo/simulate-sektor-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefrontOrderId: order.id }),
    });
    setSektorStageId(null);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const msg = data.fulfilled
        ? `Order FULFILLED! Customer has received their tax invoice.\nInvoice: ${data.myobInvoiceNumber || 'pending'}`
        : `Sektor status advanced to: ${data.stage}\nNext stage: ${data.nextStage || '—'}`;
      alert(msg);
      fetchOrders();
    } else {
      alert(`Failed: ${data.error || res.statusText}`);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Order #', 'Customer', 'Email', 'Total', 'Status', 'PO #', 'Bill #', 'Txn ID', 'Created'];
    const rows = orders.map((o) => [
      o.orderNumber, o.customerName, o.customerEmail,
      `${o.currency} ${Number(o.totalAmount).toFixed(2)}`,
      o.status, o.myobPoNumber || '', o.myobBillNumber || '',
      o.monoovaTxnId || '', new Date(o.createdAt).toLocaleDateString('en-AU'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pipeline.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePaySupplier = async (orderId: string) => {
    if (!confirm('Trigger bank transfer to supplier now? (Airwallex or Monoova, whichever is configured)')) return;
    setPayingId(orderId);
    const res = await fetch('/api/payments/supplier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefrontOrderId: orderId }),
    });
    setPayingId(null);
    if (res.ok) {
      alert('Payment initiated successfully.');
      fetchOrders();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Payment failed: ${data.error || res.statusText}`);
    }
  };

  const displayed = statusFilter === 'ALL' ? orders : orders.filter((o) => o.status === statusFilter);
  const statuses = ['ALL', ...Array.from(new Set(orders.map((o) => o.status)))];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Pipeline</h1>
          <p className="text-sm text-slate-500 mt-0.5">End-to-end supply chain status for every storefront order</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/owner/emails"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-sm font-semibold transition"
          >
            <Inbox className="w-4 h-4" />
            Email Inbox
          </Link>
          <button
            onClick={handleSyncSektor}
            disabled={syncingSektor}
            title="Pull latest product data from Sektor catalog API (simulated in demo mode)"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-semibold transition disabled:opacity-60"
          >
            <Rss className="w-4 h-4" />
            {syncingSektor ? 'Syncing…' : 'Sync Sektor Feed'}
          </button>
          <button
            onClick={handleSetupDemo}
            disabled={settingUp}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-sm font-semibold transition disabled:opacity-60"
          >
            <Settings className="w-4 h-4" />
            {settingUp ? 'Setting up…' : 'Setup Demo Data'}
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
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

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading pipeline…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No orders found</div>
      ) : (
        <div className="space-y-3">
          {displayed.map((order) => {
            const badge = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-slate-100 text-slate-600' };
            const canPay = PAY_ELIGIBLE.has(order.status);
            const canSektorStage = SEKTOR_STAGE_ELIGIBLE.has(order.status);
            return (
              <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-slate-900">{order.orderNumber}</span>
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
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {order.currency} {Number(order.totalAmount).toFixed(2)}
                    </span>
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
                        onClick={() => handlePaySupplier(order.id)}
                        disabled={payingId === order.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition disabled:opacity-60"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        {payingId === order.id ? 'Processing…' : 'Pay Supplier'}
                      </button>
                    )}
                    {canSektorStage && (
                      <button
                        onClick={() => handleSimulateSektorStage(order)}
                        disabled={sektorStageId === order.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition disabled:opacity-60 ${
                          nextSektorStage(order.sektorStatus) === 'DELIVERED'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-sky-600 hover:bg-sky-700'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        {sektorStageId === order.id
                          ? 'Updating…'
                          : `Sektor: ${SEKTOR_STAGE_LABELS[nextSektorStage(order.sektorStatus)] || 'Next Stage'}`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Pipeline progress trail */}
                <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-semibold text-slate-400">
                  {[
                    { key: 'PAID', label: 'Paid' },
                    { key: 'SO_CREATED', label: 'SO' },
                    { key: 'PO_SENT', label: 'PO Sent' },
                    { key: 'INVOICE_RECEIVED', label: 'Invoice' },
                    { key: 'MATCHED', label: 'Matched' },
                    { key: 'BILL_CREATED', label: 'Bill' },
                    { key: 'SUPPLIER_PAID', label: 'Paid Out' },
                    { key: 'FULFILLED', label: 'Done' },
                  ].map((step, i, arr) => {
                    const PIPELINE_STEPS = ['PAID', 'SO_CREATED', 'PO_SENT', 'INVOICE_RECEIVED', 'MATCHED', 'BILL_CREATED', 'SUPPLIER_PAID', 'FULFILLED'];
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
                              ? 'bg-indigo-600 text-white'
                              : current
                              ? 'bg-indigo-100 text-indigo-700'
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

                {/* Sektor delivery stage progress (visible once SUPPLIER_PAID) */}
                {(order.status === 'SUPPLIER_PAID' || order.status === 'FULFILLED') && (
                  <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px] font-semibold text-slate-400">
                    <span className="text-slate-400 mr-1 shrink-0">Sektor:</span>
                    {SEKTOR_STAGES.map((stage, i) => {
                      const currentIdx = order.sektorStatus ? SEKTOR_STAGES.indexOf(order.sektorStatus as any) : -1;
                      const stageIdx = SEKTOR_STAGES.indexOf(stage);
                      const done = stageIdx <= currentIdx;
                      const isCurrent = stageIdx === currentIdx;
                      const SEKTOR_COLORS: Record<string, string> = {
                        PROCESSING: done || isCurrent ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400',
                        DISPATCHED: done || isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400',
                        OUT_FOR_DELIVERY: done || isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400',
                        DELIVERED: done || isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400',
                      };
                      return (
                        <span key={stage} className="flex items-center gap-1 shrink-0">
                          <span className={`px-2 py-0.5 rounded ${SEKTOR_COLORS[stage] || 'bg-slate-100 text-slate-400'}`}>
                            {SEKTOR_STAGE_LABELS[stage] || stage}
                          </span>
                          {i < SEKTOR_STAGES.length - 1 && <span className="text-slate-300">→</span>}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Reference numbers */}
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                  {order.myobSoNumber && <span>SO: <strong className="text-indigo-700">{order.myobSoNumber}</strong></span>}
                  {order.myobPoNumber && <span>PO: <strong className="text-slate-700">{order.myobPoNumber}</strong></span>}
                  {order.myobBillNumber && <span>Bill: <strong className="text-slate-700">{order.myobBillNumber}</strong></span>}
                  {order.myobInvoiceNumber && <span>Inv: <strong className="text-emerald-700">{order.myobInvoiceNumber}</strong></span>}
                  {order.monoovaTxnId && <span>Payment Ref: <strong className="text-slate-700">{order.monoovaTxnId}</strong></span>}
                  {order.sektorTrackingNumber && <span>Tracking: <strong className="text-slate-700">{order.sektorTrackingNumber}</strong></span>}
                  <span className="ml-auto">{new Date(order.createdAt).toLocaleDateString('en-AU')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
