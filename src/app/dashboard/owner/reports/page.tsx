'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import {
  BarChart2, Truck, GitMerge, CreditCard, AlertTriangle,
  TrendingUp, TrendingDown, Package, Clock, CheckCircle2,
  XCircle, RefreshCw,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StatusBucket {
  status: string;
  count: number;
  value: number;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  fulfilledAt: string | null;
  paidAt: string | null;
}

interface ProcurementRow {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: number;
  myobPoNumber: string | null;
  poEmailSentTo: string | null;
  poEmailSentAt: string | null;
  ageDays: number | null;
}

interface MatchException {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  threeWayMatchNotes: string | null;
  matchedAt: string | null;
}

interface InvoiceRow {
  id: string;
  vendorInvoiceNumber: string;
  vendorName: string;
  linkedPoNumber: string;
  invoiceAmount: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  threeWayMatchResult: string | null;
  monoovaTxnId: string | null;
}

interface ReportsData {
  orderFulfilment: {
    byStatus: StatusBucket[];
    thisMonth: { count: number; value: number };
    avgDaysToFulfil: number | null;
    fulfilledCount: number;
    totalCount: number;
    totalValue: number;
    topCustomers: { name: string; count: number; value: number }[];
    recentOrders: OrderRow[];
  };
  procurement: {
    openCount: number;
    openValue: number;
    avgAgeDays: number;
    overdueCount: number;
    byVendor: { vendor: string; count: number; value: number }[];
    orders: ProcurementRow[];
  };
  matching: {
    matchedCount: number;
    matchedValue: number;
    exceptionCount: number;
    exceptionValue: number;
    exceptionRate: number;
    exceptions: MatchException[];
  };
  payables: {
    byStatus: StatusBucket[];
    totalOwed: number;
    totalInvoiceCount: number;
    invoices: InvoiceRow[];
  };
  exceptions: {
    matchExceptions: MatchException[];
    stuckAtPaid: { id: string; orderNumber: string; customerName: string; totalAmount: number; updatedAt: string; ageDays: number }[];
    pendingWarranties: { id: string; warrantyNumber: string; partNumber: string; customerName: string | null; createdAt: string }[];
    warrantyByStatus: { status: string; count: number }[];
    total: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function aud(v: number): string {
  return `AUD ${v.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ORDER_STATUS_COLOR: Record<string, string> = {
  PAID: 'bg-blue-100 text-blue-700',
  SO_CREATED: 'bg-cyan-100 text-cyan-700',
  PO_SENT: 'bg-violet-100 text-violet-700',
  INVOICE_RECEIVED: 'bg-amber-100 text-amber-700',
  MATCHED: 'bg-emerald-100 text-emerald-700',
  MATCH_EXCEPTION: 'bg-red-100 text-red-700',
  BILL_CREATED: 'bg-indigo-100 text-indigo-700',
  SUPPLIER_PAID: 'bg-teal-100 text-teal-700',
  FULFILLED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

function StatusBadge({ status }: { status: string }) {
  const color = ORDER_STATUS_COLOR[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, color = 'text-slate-900' }: { label: string; value: React.ReactNode; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-4">
      <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'orders', label: 'Order Fulfilment', icon: BarChart2 },
  { key: 'procurement', label: 'Procurement', icon: Truck },
  { key: 'matching', label: 'Three-Way Match', icon: GitMerge },
  { key: 'payables', label: 'Accounts Payable', icon: CreditCard },
  { key: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
] as const;

type TabKey = typeof TABS[number]['key'];

// ── Tab panels ────────────────────────────────────────────────────────────────

function OrderFulfilmentTab({ data }: { data: ReportsData['orderFulfilment'] }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Total Orders" value={data.totalCount} />
        <KPI label="Total Value" value={aud(data.totalValue)} />
        <KPI label="This Month" value={data.thisMonth.count} sub={aud(data.thisMonth.value)} />
        <KPI label="Avg Fulfilment" value={data.avgDaysToFulfil !== null ? `${data.avgDaysToFulfil.toFixed(1)} days` : '—'} sub={`${data.fulfilledCount} fulfilled`} />
      </div>

      {/* Status breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Orders by Status</h3>
        <div className="space-y-2">
          {data.byStatus.sort((a, b) => b.count - a.count).map((s) => {
            const pct = data.totalCount > 0 ? (s.count / data.totalCount) * 100 : 0;
            return (
              <div key={s.status} className="flex items-center gap-3">
                <StatusBadge status={s.status} />
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-indigo-400"
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-600 w-6 text-right">{s.count}</span>
                <span className="text-xs text-slate-400 w-24 text-right">{aud(s.value)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top customers */}
      {data.topCustomers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Customers by Value</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-1.5 font-semibold">Customer</th>
                <th className="text-right py-1.5 font-semibold">Orders</th>
                <th className="text-right py-1.5 font-semibold">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.topCustomers.map((c) => (
                <tr key={c.name}>
                  <td className="py-2 font-medium text-slate-800">{c.name}</td>
                  <td className="py-2 text-right text-slate-600">{c.count}</td>
                  <td className="py-2 text-right font-semibold text-slate-800">{aud(c.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-1.5 font-semibold">Order #</th>
                <th className="text-left py-1.5 font-semibold">Customer</th>
                <th className="text-left py-1.5 font-semibold">Status</th>
                <th className="text-right py-1.5 font-semibold">Amount</th>
                <th className="text-right py-1.5 font-semibold">Placed</th>
                <th className="text-right py-1.5 font-semibold">Fulfilled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="py-2 font-mono font-semibold text-indigo-700">{o.orderNumber}</td>
                  <td className="py-2 text-slate-700">{o.customerName}</td>
                  <td className="py-2"><StatusBadge status={o.status} /></td>
                  <td className="py-2 text-right font-semibold">{aud(o.totalAmount)}</td>
                  <td className="py-2 text-right text-slate-500">{fmt(o.createdAt)}</td>
                  <td className="py-2 text-right text-slate-500">{fmt(o.fulfilledAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProcurementTab({ data }: { data: ReportsData['procurement'] }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Open POs" value={data.openCount} sub={aud(data.openValue)} color={data.openCount > 0 ? 'text-violet-700' : 'text-slate-900'} />
        <KPI label="Avg PO Age" value={`${data.avgAgeDays} days`} />
        <KPI label="Overdue (&gt;14 days)" value={data.overdueCount} color={data.overdueCount > 0 ? 'text-red-600' : 'text-slate-900'} />
        <KPI label="Total Orders in Pipeline" value={data.orders.length} />
      </div>

      {data.byVendor.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Orders by Vendor / Supplier</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-1.5 font-semibold">Vendor Email</th>
                <th className="text-right py-1.5 font-semibold">Orders</th>
                <th className="text-right py-1.5 font-semibold">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.byVendor.map((v) => (
                <tr key={v.vendor}>
                  <td className="py-2 text-slate-700 truncate max-w-[220px]">{v.vendor}</td>
                  <td className="py-2 text-right">{v.count}</td>
                  <td className="py-2 text-right font-semibold">{aud(v.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Procurement Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-1.5 font-semibold">Order #</th>
                <th className="text-left py-1.5 font-semibold">Customer</th>
                <th className="text-left py-1.5 font-semibold">PO #</th>
                <th className="text-left py-1.5 font-semibold">Status</th>
                <th className="text-right py-1.5 font-semibold">Amount</th>
                <th className="text-right py-1.5 font-semibold">PO Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="py-2 font-mono font-semibold text-indigo-700">{o.orderNumber}</td>
                  <td className="py-2 text-slate-700">{o.customerName}</td>
                  <td className="py-2 font-mono text-slate-600">{o.myobPoNumber || '—'}</td>
                  <td className="py-2"><StatusBadge status={o.status} /></td>
                  <td className="py-2 text-right font-semibold">{aud(o.totalAmount)}</td>
                  <td className={`py-2 text-right font-mono ${o.ageDays && o.ageDays > 14 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                    {o.ageDays !== null ? `${o.ageDays}d` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MatchingTab({ data }: { data: ReportsData['matching'] }) {
  const total = data.matchedCount + data.exceptionCount;
  const matchPct = total > 0 ? Math.round((data.matchedCount / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Auto-Matched" value={data.matchedCount} sub={aud(data.matchedValue)} color="text-green-700" />
        <KPI label="Exceptions" value={data.exceptionCount} sub={aud(data.exceptionValue)} color={data.exceptionCount > 0 ? 'text-red-600' : 'text-slate-900'} />
        <KPI label="Match Rate" value={`${matchPct}%`} sub={`${total} total`} color={matchPct >= 90 ? 'text-green-700' : 'text-amber-600'} />
        <KPI label="Held Value" value={aud(data.exceptionValue)} color={data.exceptionValue > 0 ? 'text-red-600' : 'text-slate-900'} />
      </div>

      {/* Visual split */}
      {total > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Match Result Split</h3>
          <div className="flex rounded-full overflow-hidden h-4">
            <div
              className="bg-green-400 flex items-center justify-center text-[9px] text-white font-bold"
              style={{ width: `${matchPct}%` }}
              title={`Matched: ${data.matchedCount}`}
            >
              {matchPct > 15 && `${matchPct}%`}
            </div>
            <div
              className="bg-red-400 flex-1 flex items-center justify-center text-[9px] text-white font-bold"
              title={`Exceptions: ${data.exceptionCount}`}
            >
              {100 - matchPct > 15 && `${100 - matchPct}%`}
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-400 inline-block" /> Matched ({data.matchedCount})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400 inline-block" /> Exception ({data.exceptionCount})</span>
          </div>
        </div>
      )}

      {data.exceptions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Active Exceptions</h3>
          <div className="space-y-2">
            {data.exceptions.map((e) => (
              <div key={e.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-slate-800">{e.orderNumber}</span>
                    <StatusBadge status={e.status} />
                    <span className="text-xs text-slate-500">{aud(e.totalAmount)}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">{e.customerName}</div>
                  {e.threeWayMatchNotes && (
                    <div className="text-[10px] text-red-600 mt-1">{e.threeWayMatchNotes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.exceptions.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No active match exceptions</p>
        </div>
      )}
    </div>
  );
}

function PayablesTab({ data }: { data: ReportsData['payables'] }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KPI label="Total Invoices" value={data.totalInvoiceCount} />
        <KPI label="Approved / Owing" value={aud(data.totalOwed)} color={data.totalOwed > 0 ? 'text-amber-600' : 'text-slate-900'} />
        <KPI label="Invoice Statuses" value={data.byStatus.length} sub="distinct statuses" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Invoices by Status</h3>
        <div className="space-y-2">
          {data.byStatus.sort((a, b) => b.count - a.count).map((s) => (
            <div key={s.status} className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 w-32 shrink-0">
                {s.status.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-amber-400"
                  style={{ width: `${data.totalInvoiceCount > 0 ? Math.max((s.count / data.totalInvoiceCount) * 100, 1) : 0}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-600 w-6 text-right">{s.count}</span>
              <span className="text-xs text-slate-400 w-28 text-right">{aud(s.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Supplier Invoices</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-1.5 font-semibold">Invoice #</th>
                <th className="text-left py-1.5 font-semibold">Vendor</th>
                <th className="text-left py-1.5 font-semibold">PO #</th>
                <th className="text-left py-1.5 font-semibold">Status</th>
                <th className="text-right py-1.5 font-semibold">Amount</th>
                <th className="text-right py-1.5 font-semibold">Due Date</th>
                <th className="text-right py-1.5 font-semibold">Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.invoices.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="py-2 font-mono font-semibold text-slate-800">{i.vendorInvoiceNumber}</td>
                  <td className="py-2 text-slate-700">{i.vendorName}</td>
                  <td className="py-2 font-mono text-slate-500">{i.linkedPoNumber || '—'}</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                      {i.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2 text-right font-semibold">{aud(i.invoiceAmount)}</td>
                  <td className="py-2 text-right text-slate-500">{fmt(i.dueDate)}</td>
                  <td className="py-2 text-right">
                    {i.threeWayMatchResult === 'MATCHED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />
                    ) : i.threeWayMatchResult === 'EXCEPTION' ? (
                      <XCircle className="w-3.5 h-3.5 text-red-500 ml-auto" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-300 ml-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ExceptionsTab({ data }: { data: ReportsData['exceptions'] }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KPI
          label="Total Exceptions"
          value={data.total}
          color={data.total > 0 ? 'text-red-600' : 'text-green-700'}
        />
        <KPI label="Match Exceptions" value={data.matchExceptions.length} color={data.matchExceptions.length > 0 ? 'text-red-600' : 'text-slate-900'} />
        <KPI label="Stuck at PAID" value={data.stuckAtPaid.length} color={data.stuckAtPaid.length > 0 ? 'text-amber-600' : 'text-slate-900'} />
      </div>

      {/* Warranty status */}
      {data.warrantyByStatus.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Warranty Record Status</h3>
          <div className="flex flex-wrap gap-2">
            {data.warrantyByStatus.map((w) => {
              const color =
                w.status === 'ACTIVE' ? 'bg-green-100 text-green-700'
                : w.status === 'PENDING_DATA' ? 'bg-slate-100 text-slate-600'
                : w.status === 'EXPIRING_SOON' ? 'bg-orange-100 text-orange-700'
                : w.status === 'EXPIRED' ? 'bg-red-100 text-red-700'
                : w.status === 'FINAL_SIX_MONTHS' ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-500';
              return (
                <span key={w.status} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${color}`}>
                  {w.status.replace(/_/g, ' ')} — {w.count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {data.matchExceptions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" /> Three-Way Match Exceptions
          </h3>
          <div className="space-y-2">
            {data.matchExceptions.map((e) => (
              <div key={e.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-slate-800">{e.orderNumber}</span>
                    <span className="text-xs font-semibold text-red-600">{aud(e.totalAmount)}</span>
                  </div>
                  <div className="text-xs text-slate-600">{e.customerName}</div>
                  {e.threeWayMatchNotes && (
                    <div className="text-[10px] text-red-600 mt-1 truncate">{e.threeWayMatchNotes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.stuckAtPaid.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Orders Stuck at PAID (&gt;24h)
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-1.5 font-semibold">Order #</th>
                <th className="text-left py-1.5 font-semibold">Customer</th>
                <th className="text-right py-1.5 font-semibold">Amount</th>
                <th className="text-right py-1.5 font-semibold">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.stuckAtPaid.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="py-2 font-mono font-semibold text-amber-700">{o.orderNumber}</td>
                  <td className="py-2 text-slate-700">{o.customerName}</td>
                  <td className="py-2 text-right font-semibold">{aud(o.totalAmount)}</td>
                  <td className="py-2 text-right font-bold text-amber-600">{o.ageDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.pendingWarranties.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Warranties Missing Data
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="text-left py-1.5 font-semibold">Warranty #</th>
                <th className="text-left py-1.5 font-semibold">Part</th>
                <th className="text-left py-1.5 font-semibold">Customer</th>
                <th className="text-right py-1.5 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.pendingWarranties.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="py-2 font-mono font-semibold text-slate-800">{w.warrantyNumber}</td>
                  <td className="py-2 text-slate-700">{w.partNumber}</td>
                  <td className="py-2 text-slate-600">{w.customerName || '—'}</td>
                  <td className="py-2 text-right text-slate-400">{fmt(w.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.total === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No active exceptions</p>
          <p className="text-xs text-slate-400 mt-1">All orders are processing normally</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('orders');
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/reports');
    if (res.ok) {
      setData(await res.json());
    } else {
      setError('Failed to load report data');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Management Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Live operational dashboards across the full supply chain pipeline
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-sm">Loading report data…</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && data && (
        <>
          {activeTab === 'orders' && <OrderFulfilmentTab data={data.orderFulfilment} />}
          {activeTab === 'procurement' && <ProcurementTab data={data.procurement} />}
          {activeTab === 'matching' && <MatchingTab data={data.matching} />}
          {activeTab === 'payables' && <PayablesTab data={data.payables} />}
          {activeTab === 'exceptions' && <ExceptionsTab data={data.exceptions} />}
        </>
      )}
    </div>
  );
}
