'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, RefreshCw, Search, ArrowRight } from 'lucide-react';

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
  salesOrder?: { salesOrderNumber: string; status: string } | null;
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PAID:        { label: 'Paid',        bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  SO_CREATED:  { label: 'SO Created',  bg: '#eff6ff', color: '#1e3a8a', border: '#bfdbfe' },
  PO_SENT:     { label: 'PO Sent',     bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  SHIPPED:     { label: 'Shipped',     bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  DELIVERED:   { label: 'Delivered',   bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  CANCELLED:   { label: 'Cancelled',   bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  PENDING_PAYMENT: { label: 'Pending', bg: '#fafafa', color: '#71717a', border: '#e4e4e7' },
};

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/storefront/orders');
      if (res.ok) setOrders(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  });

  const fmt = (v: string | number) => Number(v).toFixed(2);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-5 h-5" style={{ color: '#1e3a8a' }} />
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Shop Orders</h1>
          </div>
          <p className="text-sm" style={{ color: '#64748b' }}>All orders placed through the online store.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all self-start sm:self-auto"
          style={{ background: '#fff', borderColor: '#e2e8f0', color: '#475569' }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
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
          <button onClick={() => setSearch('')} className="text-xs" style={{ color: '#94a3b8' }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        {loading ? (
          <div className="py-20 text-center text-sm" style={{ color: '#94a3b8' }}>Loading orders…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <ShoppingBag className="w-8 h-8 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
            <p className="text-sm font-semibold" style={{ color: '#475569' }}>
              {search ? 'No orders match your search.' : 'No orders yet.'}
            </p>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Orders placed in the shop will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Order</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Date</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Status</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>SO #</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => {
                  const s = STATUS_STYLE[o.status] ?? STATUS_STYLE.PENDING_PAYMENT;
                  return (
                    <tr
                      key={o.id}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/owner/shop-orders/${o.id}`}
                          className="font-bold font-mono text-xs hover:underline"
                          style={{ color: '#1e3a8a' }}
                        >
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-xs" style={{ color: '#0f172a' }}>{o.customerName}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{o.customerEmail}</p>
                      </td>
                      <td className="px-5 py-4 text-xs" style={{ color: '#64748b' }}>{fmtDate(o.createdAt)}</td>
                      <td className="px-5 py-4 text-right font-bold font-mono text-xs" style={{ color: '#0f172a' }}>
                        {o.currency} {fmt(o.totalAmount)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono" style={{ color: '#64748b' }}>
                        {o.salesOrder?.salesOrderNumber ?? '—'}
                      </td>
                      <td className="px-2 py-4">
                        <Link href={`/dashboard/owner/shop-orders/${o.id}`} style={{ color: '#1e3a8a' }}>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
          {filtered.length} order{filtered.length !== 1 ? 's' : ''} {search ? 'found' : 'total'}
        </p>
      )}
    </div>
  );
}
