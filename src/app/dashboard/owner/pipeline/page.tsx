'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, DollarSign, FileText, Truck, Download, RotateCcw, Settings } from 'lucide-react';

interface SFOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: string;
  currency: string;
  status: string;
  paidAt: string | null;
  myobPoNumber: string | null;
  myobBillNumber: string | null;
  monoovaTxnId: string | null;
  supplierPaidAt: string | null;
  threeWayMatchResult: string | null;
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
const DELIVER_ELIGIBLE = new Set(['SUPPLIER_PAID']);

export default function PipelinePage() {
  const [orders, setOrders] = useState<SFOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [retryingPoId, setRetryingPoId] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(false);

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

  const handleSimulateDelivery = async (orderId: string) => {
    if (!confirm('Simulate Sektor confirming delivery? This will mark the order as FULFILLED and email the customer.')) return;
    setDeliveringId(orderId);
    const res = await fetch('/api/demo/simulate-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefrontOrderId: orderId }),
    });
    setDeliveringId(null);
    if (res.ok) {
      alert('Delivery confirmed! Order is now FULFILLED and customer notified.');
      fetchOrders();
    } else {
      const data = await res.json().catch(() => ({}));
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
            const canDeliver = DELIVER_ELIGIBLE.has(order.status);
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
                    {canDeliver && (
                      <button
                        onClick={() => handleSimulateDelivery(order.id)}
                        disabled={deliveringId === order.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition disabled:opacity-60"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        {deliveringId === order.id ? 'Confirming…' : 'Simulate Delivery'}
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

                {/* Reference numbers */}
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                  {order.myobPoNumber && <span>PO: <strong className="text-slate-700">{order.myobPoNumber}</strong></span>}
                  {order.myobBillNumber && <span>Bill: <strong className="text-slate-700">{order.myobBillNumber}</strong></span>}
                  {order.monoovaTxnId && <span>Monoova: <strong className="text-slate-700">{order.monoovaTxnId}</strong></span>}
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
