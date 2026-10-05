'use client';

import { useEffect, useState } from 'react';
import { Users, Search, RefreshCw, Mail, MapPin, ShoppingBag, TrendingUp } from 'lucide-react';

interface ShopCustomer {
  email: string;
  name: string;
  location?: string;
  orderCount: number;
  totalSpend: number;
  currency: string;
  lastOrderDate: string;
}

export default function CustomerMasterDataPage() {
  const [customers, setCustomers] = useState<ShopCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/storefront/orders');
      const data = res.ok ? await res.json() : [];
      const orders: any[] = Array.isArray(data) ? data : Array.isArray(data.orders) ? data.orders : [];

      // Only real, confirmed shop orders count — excludes cancelled and any
      // stray sales-order records that never became an actual storefront order.
      const validOrders = orders.filter((o) => o.customerEmail && o.status !== 'CANCELLED');
      const map = new Map<string, ShopCustomer>();

      for (const o of validOrders) {
        const key = o.customerEmail.toLowerCase().trim();
        const existing = map.get(key);
        if (existing) {
          existing.orderCount += 1;
          existing.totalSpend += Number(o.totalAmount) || 0;
          if (new Date(o.createdAt) > new Date(existing.lastOrderDate)) {
            existing.lastOrderDate = o.createdAt;
          }
        } else {
          map.set(key, {
            email: o.customerEmail,
            name: o.customerName || o.customerEmail,
            location: o.deliveryAddress || '',
            orderCount: 1,
            totalSpend: Number(o.totalAmount) || 0,
            currency: o.currency || 'AUD',
            lastOrderDate: o.createdAt || new Date().toISOString(),
          });
        }
      }

      setCustomers(Array.from(map.values()).sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()));
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.location || '').toLowerCase().includes(q);
  });

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpend, 0);
  const totalOrders = customers.reduce((s, c) => s + c.orderCount, 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5" style={{ color: '#4C3AE3' }} />
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Customer Directory</h1>
          </div>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Customers who have purchased from the online shop.
          </p>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Customers', value: customers.length, icon: Users, color: '#4C3AE3', bg: '#EEF0FE' },
            { label: 'Total Orders', value: totalOrders, icon: ShoppingBag, color: '#065f46', bg: '#ecfdf5' },
            { label: 'Total Revenue', value: `AUD ${totalRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: '#b45309', bg: '#fffbeb' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-2xl border p-5 flex items-center gap-4" style={{ borderColor: '#e2e8f0' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>{s.label}</p>
                  <p className="text-xl font-black font-mono mt-0.5" style={{ color: '#0f172a' }}>{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: '#e2e8f0' }}>
        <Search className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers by name, email or location..."
          className="flex-1 text-sm outline-none bg-transparent placeholder-slate-400"
          style={{ color: '#0f172a' }}
        />
        <button onClick={load} className="p-1.5 rounded-lg transition-colors" style={{ color: '#64748b' }}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Customer list */}
      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>Loading customers…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border" style={{ borderColor: '#e2e8f0' }}>
          <ShoppingBag className="w-8 h-8 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>
            {search ? 'No customers match your search.' : 'No shop customers yet.'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
            Customers will appear here once they place orders in the online shop.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Customer', 'Email', 'Location', 'Orders', 'Total Spend', 'Last Order'].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.email || i} className="border-b transition-colors hover:bg-slate-50" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{ background: '#EEF0FE', color: '#4C3AE3' }}>
                        {c.name[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="font-semibold" style={{ color: '#0f172a' }}>{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:underline" style={{ color: '#4C3AE3' }}>
                        <Mail className="w-3.5 h-3.5" />
                        <span className="text-xs">{c.email}</span>
                      </a>
                    ) : <span className="text-xs" style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    {c.location ? (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
                        <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: '#94a3b8' }} />
                        <span className="truncate max-w-[160px]">{c.location}</span>
                      </div>
                    ) : <span className="text-xs" style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-xs font-bold font-mono" style={{ color: '#0f172a' }}>{c.orderCount}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-xs font-bold font-mono" style={{ color: '#4C3AE3' }}>
                      {c.currency} {c.totalSpend.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-xs" style={{ color: '#64748b' }}>
                      {new Date(c.lastOrderDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
          {filtered.length} customer{filtered.length !== 1 ? 's' : ''} from online shop purchases.
        </p>
      )}
    </div>
  );
}
