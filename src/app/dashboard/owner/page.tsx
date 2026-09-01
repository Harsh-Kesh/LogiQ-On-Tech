'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ShieldCheck,
  Building,
  Package,
  Truck,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export default function PlatformOwnerDashboard() {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Dynamic Data States
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [stockList, setStockList] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);

  const loadAllDashboardData = async () => {
    setRefreshing(true);
    try {
      const [vendorsRes, stockRes, itemsRes, ordersRes] = await Promise.all([
        fetch('/api/admin/vendors').then((r) => (r.ok ? r.json() : { vendors: [] })),
        fetch('/api/inventory/stock').then((r) => (r.ok ? r.json() : { stock: [] })),
        fetch('/api/mdm/items').then((r) => (r.ok ? r.json() : { items: [] })),
        fetch('/api/fulfillment/orders').then((r) => (r.ok ? r.json() : { orders: [] })),
      ]);

      const vList = Array.isArray(vendorsRes) ? vendorsRes : Array.isArray(vendorsRes?.vendors) ? vendorsRes.vendors : [];
      const sList = Array.isArray(stockRes) ? stockRes : Array.isArray(stockRes?.stock) ? stockRes.stock : Array.isArray(stockRes?.stockOnHand) ? stockRes.stockOnHand : [];
      const iList = Array.isArray(itemsRes) ? itemsRes : Array.isArray(itemsRes?.items) ? itemsRes.items : [];
      const oList = Array.isArray(ordersRes) ? ordersRes : Array.isArray(ordersRes?.orders) ? ordersRes.orders : [];

      setVendorsList(vList);
      setStockList(sList);
      setItemsList(iList);
      setOrdersList(oList);
    } catch (err) {
      console.error('Failed loading owner dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    loadAllDashboardData();
  }, []);

  // Metric Calculations
  const approvedVendorsCount = vendorsList.filter((v) => v.status === 'APPROVED').length;
  const pendingVendorsCount = vendorsList.filter((v) => v.status === 'PENDING' || v.status === 'UNDER_REVIEW').length;
  const totalStockUnits = stockList.reduce((sum, s) => sum + (s?.quantityOnHand || 0), 0);

  const totalStockValuation = stockList.reduce((sum, s) => {
    if (!s) return sum;
    const item = itemsList.find((i) => i && (i.id === s.itemMasterId || i.sku === s.sku));
    const price = item?.sellingPrice || 0;
    return sum + (s.quantityOnHand || 0) * price;
  }, 0);

  const lowStockCount = itemsList.filter((item) => {
    if (!item) return false;
    const totalStock = stockList
      .filter((s) => s && (s.itemMasterId === item.id || s.sku === item.sku))
      .reduce((sum, s) => sum + (s.quantityOnHand || 0), 0);
    const threshold = item.lowStockThreshold || 0;
    return totalStock <= threshold;
  }).length;

  const ordersSubmitted = ordersList.filter((o) => o.status === 'SUBMITTED').length;
  const ordersPicking = ordersList.filter((o) => o.status === 'IN_PICKING' || o.status === 'PICKED').length;
  const ordersPacked = ordersList.filter((o) => o.status === 'PACKED').length;
  const ordersDispatched = ordersList.filter((o) => o.status === 'DISPATCHED').length;

  const pendingVendors = vendorsList.filter((v) => v.status === 'PENDING' || v.status === 'UNDER_REVIEW');

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* 1. Light Welcome & Executive Header */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold font-mono">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            PLATFORM OWNER
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {session?.user?.name || 'Platform Owner'}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-3xl leading-relaxed">
            Vendor approvals, inventory valuation, and order fulfillment at a glance.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            onClick={loadAllDashboardData}
            disabled={refreshing}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-200 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
          {lastRefreshed && (
            <span className="text-[11px] text-slate-400 font-mono">
              Updated {lastRefreshed.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* 2. Dynamic Executive Metric Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Metric 1: Vendor Governance */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Vendor Network</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {loading ? '...' : vendorsList.length} <span className="text-xs font-normal text-slate-500">Vendors</span>
            </div>
            <div className="text-xs font-semibold text-indigo-700 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {approvedVendorsCount} Approved ({pendingVendorsCount} Pending)
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>ATO ABN Verification</span>
            <span className="font-bold text-slate-900">
              {loading ? '...' : `${vendorsList.filter((v: any) => v.abnAcnVerified).length} / ${vendorsList.length} Verified`}
            </span>
          </div>
        </div>

        {/* Metric 2: Inventory Valuation */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Inventory Valuation</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ${loading ? '...' : totalStockValuation.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1 font-mono">
              {loading ? '...' : totalStockUnits.toLocaleString()} units on hand
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500">Low-Stock Safety Deficits</span>
            <span className={`font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-indigo-600'}`}>
              {lowStockCount} SKUs Alert
            </span>
          </div>
        </div>

        {/* Metric 3: Outbound Fulfillment Operations */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Outbound Pipeline</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {loading ? '...' : ordersList.length} <span className="text-xs font-normal text-slate-500">Orders</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-bold border border-sky-200">
                {ordersSubmitted} Sub
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                {ordersPicking} Pick
              </span>
              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                {ordersPacked} Pack
              </span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                {ordersDispatched} Disp
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Vendor Directory & Compliance */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-amber-500" /> Needs Your Attention
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">Vendors Awaiting Approval</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Vendor registrations pending review or approval. See the full Vendor Directory for approved and rejected vendors too.
            </p>
          </div>

          <Link
            href="/dashboard/owner/vendors"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 shrink-0"
          >
            <Building className="w-4 h-4 text-amber-400" /> Open Vendor Directory
          </Link>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <th className="py-3.5 px-4 font-bold">Vendor Company</th>
                <th className="py-3.5 px-4 font-bold">ATO ABN / ACN</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">Compliance Docs</th>
                <th className="py-3.5 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading vendor directory...
                  </td>
                </tr>
              ) : pendingVendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No vendors currently awaiting approval.
                  </td>
                </tr>
              ) : (
                pendingVendors.map((vendor) => {
                  const isApproved = vendor.status === 'APPROVED';
                  const isPending = vendor.status === 'PENDING' || vendor.status === 'UNDER_REVIEW';

                  return (
                    <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-sans">
                        <div>{vendor.companyName || vendor.user?.fullName || 'Unnamed Vendor'}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">
                          {vendor.user?.email || vendor.email || '—'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">{vendor.abnAcn || '—'}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isApproved
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {vendor.status || 'PENDING'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {vendor.abnAcnVerified ? (
                          <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ATO Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                            {vendor.abnAcnMessage || 'Pending'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/dashboard/owner/vendors`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold inline-flex items-center gap-1 transition-colors font-sans"
                        >
                          Review <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
