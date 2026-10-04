'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Package, Truck, ShoppingBag, ShoppingCart, GitBranch, FileText,
  RefreshCw, ArrowRight, LayoutDashboard,
} from 'lucide-react';

export default function PlatformOwnerDashboard() {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [productCount, setProductCount] = useState<number | null>(null);
  const [supplierCount, setSupplierCount] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [productsRes, vendorsRes, ordersRes] = await Promise.all([
        fetch('/api/store/products').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/vendors').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/fulfillment/orders').then((r) => (r.ok ? r.json() : null)),
      ]);

      const products = productsRes?.products ?? productsRes ?? [];
      const vendors = vendorsRes?.vendors ?? vendorsRes ?? [];
      const orders = ordersRes?.orders ?? ordersRes ?? [];

      setProductCount(Array.isArray(products) ? products.length : 0);
      setSupplierCount(Array.isArray(vendors) ? vendors.filter((v: any) => v.status === 'APPROVED').length : 0);
      setOrderCount(Array.isArray(orders) ? orders.length : 0);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => { loadData(); }, []);

  const stat = (val: number | null) => (loading ? '—' : val !== null ? val : '—');

  const metrics = [
    {
      label: 'Products in Shop',
      value: stat(productCount),
      unit: 'published',
      icon: ShoppingBag,
      href: '/dashboard/owner/items',
      color: '#1e3a8a',
      bg: '#eff6ff',
      border: '#bfdbfe',
    },
    {
      label: 'Suppliers',
      value: stat(supplierCount),
      unit: 'approved',
      icon: Truck,
      href: '/dashboard/owner/vendor-master',
      color: '#b45309',
      bg: '#fffbeb',
      border: '#fde68a',
    },
    {
      label: 'Orders',
      value: stat(orderCount),
      unit: 'total',
      icon: ShoppingCart,
      href: '/dashboard/owner/b2b-orders',
      color: '#065f46',
      bg: '#ecfdf5',
      border: '#a7f3d0',
    },
  ];

  const quickLinks = [
    { label: 'Item Master Data', desc: 'Manage the 5 products in your shop catalogue', href: '/dashboard/owner/items', icon: Package },
    { label: 'Vendor Master Data', desc: 'Supplier contact directory and details', href: '/dashboard/owner/vendor-master', icon: Truck },
    { label: 'Customer Master Data', desc: 'Customers from shop purchases', href: '/dashboard/owner/customer-master', icon: ShoppingCart },
    { label: 'Order Pipeline', desc: 'Track orders through the fulfilment chain', href: '/dashboard/owner/pipeline', icon: GitBranch },
    { label: 'Audit Logs', desc: 'Platform activity and security events', href: '/dashboard/owner/audit-logs', icon: FileText },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e3a8a' }}>
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1e3a8a' }}>Platform Console</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#0f172a' }}>
            Welcome back, {session?.user?.name?.split(' ')[0] || 'Owner'}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Here&apos;s an overview of your LogiQ-On platform.</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
            style={{ background: '#fff', borderColor: '#e2e8f0', color: '#475569' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {lastRefreshed && (
            <span className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>
              {lastRefreshed.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.label}
              href={m.href}
              className="group block bg-white rounded-2xl p-6 border transition-all hover:shadow-md"
              style={{ borderColor: '#e2e8f0' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>{m.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono" style={{ color: '#0f172a' }}>{m.value}</span>
                    <span className="text-xs font-semibold" style={{ color: m.color }}>{m.unit}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: m.bg, border: `1px solid ${m.border}` }}>
                  <Icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex items-center gap-1 text-xs font-semibold transition-colors" style={{ borderColor: '#f1f5f9', color: m.color }}>
                View details <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#94a3b8' }}>Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="group flex items-start gap-3 bg-white rounded-2xl p-4 border transition-all hover:shadow-sm hover:border-blue-200"
                style={{ borderColor: '#e2e8f0' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f8fafc' }}>
                  <Icon className="w-4 h-4" style={{ color: '#1e3a8a' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug" style={{ color: '#0f172a' }}>{l.label}</p>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: '#94a3b8' }}>{l.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" style={{ color: '#1e3a8a' }} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
