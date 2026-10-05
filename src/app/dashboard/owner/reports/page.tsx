'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import {
  BarChart2, Truck, GitMerge, CreditCard, AlertTriangle,
  Package, Clock, CheckCircle2,
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

// Semantic color tokens — statuses stay scannable by meaning, not brand chrome.
const SUCCESS = { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };
const WARNING = { background: '#fefce8', color: '#854d0e', border: '1px solid #fde68a' };
const DANGER = { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' };
const NEUTRAL = { background: '#fafafa', color: '#71717a', border: '1px solid #e4e4e7' };
const INFO = { background: '#EEF0FE', color: '#4C3AE3', border: '1px solid #D9D4FB' };

const ORDER_STATUS_STYLE: Record<string, { background: string; color: string; border: string }> = {
  PAID: INFO,
  SO_CREATED: INFO,
  PO_SENT: INFO,
  INVOICE_RECEIVED: WARNING,
  MATCHED: SUCCESS,
  MATCH_EXCEPTION: DANGER,
  BILL_CREATED: INFO,
  SUPPLIER_PAID: SUCCESS,
  FULFILLED: SUCCESS,
  CANCELLED: NEUTRAL,
};

function StatusBadge({ status }: { status: string }) {
  const style = ORDER_STATUS_STYLE[status] || NEUTRAL;
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={style}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, color = '#0f172a' }: { label: string; value: React.ReactNode; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border px-4 py-4" style={{ borderColor: '#e2e8f0' }}>
      <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>{label}</div>
      <div className="text-xl font-black font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{sub}</div>}
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
      <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: '#0f172a' }}>Orders by Status</h3>
        <div className="space-y-2">
          {data.byStatus.sort((a, b) => b.count - a.count).map((s) => {
            const pct = data.totalCount > 0 ? (s.count / data.totalCount) * 100 : 0;
            return (
              <div key={s.status} className="flex items-center gap-3">
                <StatusBadge status={s.status} />
                <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: '#f1f5f9' }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${Math.max(pct, 1)}%`, background: '#4C3AE3' }}
                  />
                </div>
                <span className="text-xs font-mono w-6 text-right" style={{ color: '#64748b' }}>{s.count}</span>
                <span className="text-xs w-24 text-right" style={{ color: '#94a3b8' }}>{aud(s.value)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top customers */}
      {data.topCustomers.length > 0 && (
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#0f172a' }}>Top Customers by Value</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: '#f1f5f9' }}>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Customer</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Orders</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Total Value</th>
              </tr>
            </thead>
            <tbody>
              {data.topCustomers.map((c) => (
                <tr key={c.name} className="border-b" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-2 font-semibold" style={{ color: '#0f172a' }}>{c.name}</td>
                  <td className="py-2 text-right" style={{ color: '#64748b' }}>{c.count}</td>
                  <td className="py-2 text-right font-bold" style={{ color: '#0f172a' }}>{aud(c.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: '#0f172a' }}>Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: '#f1f5f9' }}>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Order #</th>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Customer</th>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Status</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Amount</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Placed</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Fulfilled</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id} className="border-b hover:bg-slate-50 transition-colors" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-2 font-mono font-bold" style={{ color: '#4C3AE3' }}>{o.orderNumber}</td>
                  <td className="py-2" style={{ color: '#0f172a' }}>{o.customerName}</td>
                  <td className="py-2"><StatusBadge status={o.status} /></td>
                  <td className="py-2 text-right font-bold" style={{ color: '#0f172a' }}>{aud(o.totalAmount)}</td>
                  <td className="py-2 text-right" style={{ color: '#64748b' }}>{fmt(o.createdAt)}</td>
                  <td className="py-2 text-right" style={{ color: '#64748b' }}>{fmt(o.fulfilledAt)}</td>
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
        <KPI label="Open POs" value={data.openCount} sub={aud(data.openValue)} color={data.openCount > 0 ? '#4C3AE3' : '#0f172a'} />
        <KPI label="Avg PO Age" value={`${data.avgAgeDays} days`} />
        <KPI label="Overdue (&gt;14 days)" value={data.overdueCount} color={data.overdueCount > 0 ? '#991b1b' : '#0f172a'} />
        <KPI label="Total Orders in Pipeline" value={data.orders.length} />
      </div>

      {data.byVendor.length > 0 && (
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#0f172a' }}>Orders by Vendor / Supplier</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: '#f1f5f9' }}>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Vendor Email</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Orders</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Total Value</th>
              </tr>
            </thead>
            <tbody>
              {data.byVendor.map((v) => (
                <tr key={v.vendor} className="border-b" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-2 truncate max-w-[220px]" style={{ color: '#0f172a' }}>{v.vendor}</td>
                  <td className="py-2 text-right" style={{ color: '#64748b' }}>{v.count}</td>
                  <td className="py-2 text-right font-bold" style={{ color: '#0f172a' }}>{aud(v.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: '#0f172a' }}>Procurement Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: '#f1f5f9' }}>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Order #</th>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Customer</th>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>PO #</th>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Status</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Amount</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>PO Age</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id} className="border-b hover:bg-slate-50 transition-colors" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-2 font-mono font-bold" style={{ color: '#4C3AE3' }}>{o.orderNumber}</td>
                  <td className="py-2" style={{ color: '#0f172a' }}>{o.customerName}</td>
                  <td className="py-2 font-mono" style={{ color: '#64748b' }}>{o.myobPoNumber || '—'}</td>
                  <td className="py-2"><StatusBadge status={o.status} /></td>
                  <td className="py-2 text-right font-bold" style={{ color: '#0f172a' }}>{aud(o.totalAmount)}</td>
                  <td className="py-2 text-right font-mono font-bold" style={{ color: o.ageDays && o.ageDays > 14 ? '#991b1b' : '#64748b' }}>
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
        <KPI label="Auto-Matched" value={data.matchedCount} sub={aud(data.matchedValue)} color="#166534" />
        <KPI label="Exceptions" value={data.exceptionCount} sub={aud(data.exceptionValue)} color={data.exceptionCount > 0 ? '#991b1b' : '#0f172a'} />
        <KPI label="Match Rate" value={`${matchPct}%`} sub={`${total} total`} color={matchPct >= 90 ? '#166534' : '#854d0e'} />
        <KPI label="Held Value" value={aud(data.exceptionValue)} color={data.exceptionValue > 0 ? '#991b1b' : '#0f172a'} />
      </div>

      {/* Visual split */}
      {total > 0 && (
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#0f172a' }}>Match Result Split</h3>
          <div className="flex rounded-full overflow-hidden h-4">
            <div
              className="flex items-center justify-center text-[9px] text-white font-bold"
              style={{ width: `${matchPct}%`, background: '#22c55e' }}
              title={`Matched: ${data.matchedCount}`}
            >
              {matchPct > 15 && `${matchPct}%`}
            </div>
            <div
              className="flex-1 flex items-center justify-center text-[9px] text-white font-bold"
              style={{ background: '#ef4444' }}
              title={`Exceptions: ${data.exceptionCount}`}
            >
              {100 - matchPct > 15 && `${100 - matchPct}%`}
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-xs" style={{ color: '#64748b' }}>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded inline-block" style={{ background: '#22c55e' }} /> Matched ({data.matchedCount})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded inline-block" style={{ background: '#ef4444' }} /> Exception ({data.exceptionCount})</span>
          </div>
        </div>
      )}

      {data.exceptions.length > 0 && (
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#0f172a' }}>Active Exceptions</h3>
          <div className="space-y-2">
            {data.exceptions.map((e) => (
              <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#991b1b' }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs" style={{ color: '#0f172a' }}>{e.orderNumber}</span>
                    <StatusBadge status={e.status} />
                    <span className="text-xs" style={{ color: '#64748b' }}>{aud(e.totalAmount)}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{e.customerName}</div>
                  {e.threeWayMatchNotes && (
                    <div className="text-[10px] mt-1" style={{ color: '#991b1b' }}>{e.threeWayMatchNotes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.exceptions.length === 0 && (
        <div className="bg-white rounded-2xl border p-8 text-center" style={{ borderColor: '#e2e8f0' }}>
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: '#166534' }} />
          <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>No active match exceptions</p>
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
        <KPI label="Approved / Owing" value={aud(data.totalOwed)} color={data.totalOwed > 0 ? '#854d0e' : '#0f172a'} />
        <KPI label="Invoice Statuses" value={data.byStatus.length} sub="distinct statuses" />
      </div>

      <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: '#0f172a' }}>Invoices by Status</h3>
        <div className="space-y-2">
          {data.byStatus.sort((a, b) => b.count - a.count).map((s) => (
            <div key={s.status} className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold w-32 shrink-0" style={NEUTRAL}>
                {s.status.replace(/_/g, ' ')}
              </span>
              <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: '#f1f5f9' }}>
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${data.totalInvoiceCount > 0 ? Math.max((s.count / data.totalInvoiceCount) * 100, 1) : 0}%`, background: '#4C3AE3' }}
                />
              </div>
              <span className="text-xs font-mono w-6 text-right" style={{ color: '#64748b' }}>{s.count}</span>
              <span className="text-xs w-28 text-right" style={{ color: '#94a3b8' }}>{aud(s.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: '#0f172a' }}>Supplier Invoices</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: '#f1f5f9' }}>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Invoice #</th>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Vendor</th>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>PO #</th>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Status</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Amount</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Due Date</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Match</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((i) => (
                <tr key={i.id} className="border-b hover:bg-slate-50 transition-colors" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-2 font-mono font-bold" style={{ color: '#0f172a' }}>{i.vendorInvoiceNumber}</td>
                  <td className="py-2" style={{ color: '#0f172a' }}>{i.vendorName}</td>
                  <td className="py-2 font-mono" style={{ color: '#64748b' }}>{i.linkedPoNumber || '—'}</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={NEUTRAL}>
                      {i.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2 text-right font-bold" style={{ color: '#0f172a' }}>{aud(i.invoiceAmount)}</td>
                  <td className="py-2 text-right" style={{ color: '#64748b' }}>{fmt(i.dueDate)}</td>
                  <td className="py-2 text-right">
                    {i.threeWayMatchResult === 'MATCHED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 ml-auto" style={{ color: '#166534' }} />
                    ) : i.threeWayMatchResult === 'EXCEPTION' ? (
                      <XCircle className="w-3.5 h-3.5 ml-auto" style={{ color: '#991b1b' }} />
                    ) : (
                      <Clock className="w-3.5 h-3.5 ml-auto" style={{ color: '#cbd5e1' }} />
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
          color={data.total > 0 ? '#991b1b' : '#166534'}
        />
        <KPI label="Match Exceptions" value={data.matchExceptions.length} color={data.matchExceptions.length > 0 ? '#991b1b' : '#0f172a'} />
        <KPI label="Stuck at PAID" value={data.stuckAtPaid.length} color={data.stuckAtPaid.length > 0 ? '#854d0e' : '#0f172a'} />
      </div>

      {/* Warranty status */}
      {data.warrantyByStatus.length > 0 && (
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#0f172a' }}>Warranty Record Status</h3>
          <div className="flex flex-wrap gap-2">
            {data.warrantyByStatus.map((w) => {
              const style =
                w.status === 'ACTIVE' ? SUCCESS
                : w.status === 'PENDING_DATA' ? NEUTRAL
                : w.status === 'EXPIRING_SOON' ? WARNING
                : w.status === 'EXPIRED' ? DANGER
                : w.status === 'FINAL_SIX_MONTHS' ? WARNING
                : NEUTRAL;
              return (
                <span key={w.status} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={style}>
                  {w.status.replace(/_/g, ' ')} — {w.count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {data.matchExceptions.length > 0 && (
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#0f172a' }}>
            <XCircle className="w-4 h-4" style={{ color: '#991b1b' }} /> Three-Way Match Exceptions
          </h3>
          <div className="space-y-2">
            {data.matchExceptions.map((e) => (
              <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs" style={{ color: '#0f172a' }}>{e.orderNumber}</span>
                    <span className="text-xs font-semibold" style={{ color: '#991b1b' }}>{aud(e.totalAmount)}</span>
                  </div>
                  <div className="text-xs" style={{ color: '#64748b' }}>{e.customerName}</div>
                  {e.threeWayMatchNotes && (
                    <div className="text-[10px] mt-1 truncate" style={{ color: '#991b1b' }}>{e.threeWayMatchNotes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.stuckAtPaid.length > 0 && (
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Clock className="w-4 h-4" style={{ color: '#854d0e' }} /> Orders Stuck at PAID (&gt;24h)
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: '#f1f5f9' }}>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Order #</th>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Customer</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Amount</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Age</th>
              </tr>
            </thead>
            <tbody>
              {data.stuckAtPaid.map((o) => (
                <tr key={o.id} className="border-b hover:bg-slate-50 transition-colors" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-2 font-mono font-bold" style={{ color: '#854d0e' }}>{o.orderNumber}</td>
                  <td className="py-2" style={{ color: '#0f172a' }}>{o.customerName}</td>
                  <td className="py-2 text-right font-bold" style={{ color: '#0f172a' }}>{aud(o.totalAmount)}</td>
                  <td className="py-2 text-right font-bold" style={{ color: '#854d0e' }}>{o.ageDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.pendingWarranties.length > 0 && (
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#0f172a' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: '#854d0e' }} /> Warranties Missing Data
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: '#f1f5f9' }}>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Warranty #</th>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Part</th>
                <th className="text-left py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Customer</th>
                <th className="text-right py-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#94a3b8' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.pendingWarranties.map((w) => (
                <tr key={w.id} className="border-b hover:bg-slate-50 transition-colors" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-2 font-mono font-bold" style={{ color: '#0f172a' }}>{w.warrantyNumber}</td>
                  <td className="py-2" style={{ color: '#0f172a' }}>{w.partNumber}</td>
                  <td className="py-2" style={{ color: '#64748b' }}>{w.customerName || '—'}</td>
                  <td className="py-2 text-right" style={{ color: '#94a3b8' }}>{fmt(w.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.total === 0 && (
        <div className="bg-white rounded-2xl border p-10 text-center" style={{ borderColor: '#e2e8f0' }}>
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#166534' }} />
          <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>No active exceptions</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>All orders are processing normally</p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5" style={{ color: '#4C3AE3' }} />
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Management Reports</h1>
          </div>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Live operational dashboards across the full supply chain pipeline
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border hover:bg-slate-50 text-sm font-semibold transition-all disabled:opacity-50"
          style={{ borderColor: '#e2e8f0', color: '#64748b' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: '#f1f5f9' }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                isActive ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
              }`}
              style={{ color: isActive ? '#0f172a' : '#64748b' }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? '#4C3AE3' : '#94a3b8' }} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3" style={{ color: '#94a3b8' }}>
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#4C3AE3', borderTopColor: 'transparent' }} />
            <span className="text-sm">Loading report data…</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border p-4 text-sm" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>{error}</div>
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
