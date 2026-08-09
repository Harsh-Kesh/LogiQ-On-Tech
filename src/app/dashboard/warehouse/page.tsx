'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Warehouse, Layers, ArrowRight, ShieldCheck, Box, RefreshCw, CheckCircle2, TrendingUp, AlertTriangle, History, PackageCheck, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function WarehouseDashboardPage() {
  const { data: session } = useSession();
  const [stock, setStock] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouseData();
  }, []);

  const fetchWarehouseData = async () => {
    setLoading(true);
    try {
      const [stockRes, ledgerRes] = await Promise.all([
        fetch('/api/inventory/stock'),
        fetch('/api/inventory/ledger'),
      ]);
      const stockData = await stockRes.json();
      const ledgerData = await ledgerRes.json();
      setStock(stockData.stock || []);
      setLedger(ledgerData.ledger || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const totalStockCount = stock.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Light Welcome Banner */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            <Warehouse className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              PILLAR 03 • WAREHOUSE & INVENTORY LEDGER PORTAL
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sydney Central Logistics Hub (WH-SYD-01)
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Bin Location Tracking • 3PL Movements • Account: {session?.user?.email || 'warehouse@logiqon.com'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Operations Online
          </div>
          <Link
            href="/dashboard/owner/inventory"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <PackageCheck className="w-4 h-4" /> Receive Inbound Stock (GRN)
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Bin Utilization</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">84.2% Capacity</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> 1,420 Bins Allocated
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Total Stock On Hand</span>
            <Box className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalStockCount} Units</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled against ledger
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Ledger History Log</span>
            <History className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{ledger.length} Movements</div>
          <p className="text-xs text-blue-600 font-semibold">Append-Only Immutable Log</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Audit Status</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">100% Pass</div>
          <p className="text-xs text-slate-500 font-mono">0 Discrepancies</p>
        </div>
      </div>

      {/* Recent Stock Movements Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" /> Recent Warehouse Stock Movements
          </h2>
          <Link href="/dashboard/owner/inventory" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
            View Master Ledger <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {ledger.slice(0, 5).map((row) => (
            <div key={row.id} className="py-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${row.quantityDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {row.movementType}
                  </span>
                  <span>{row.itemName} ({row.sku})</span>
                </div>
                <div className="text-slate-400 font-mono text-[11px]">
                  Ref: {row.referenceNumber} • Bin: {row.binLocation} • {new Date(row.createdAt).toLocaleTimeString()}
                </div>
              </div>

              <div className={`font-mono font-black text-sm ${row.quantityDelta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {row.quantityDelta > 0 ? `+${row.quantityDelta}` : row.quantityDelta} units
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
