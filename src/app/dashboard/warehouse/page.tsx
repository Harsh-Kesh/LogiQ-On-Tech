'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Warehouse, Layers, ArrowRight, ShieldCheck, Box, RefreshCw, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

export default function WarehouseDashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6 font-sans">
      {/* Light Welcome Banner matching Owner Console */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            <Warehouse className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              PILLAR 02 • WAREHOUSE &amp; INVENTORY LEDGER PORTAL
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
          <button className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer">
            <Box className="w-4 h-4" /> Receive Inbound Stock
          </button>
        </div>
      </div>

      {/* 4 Metric Cards matching Owner Console layout */}
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
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Inbound Pallets</span>
            <Box className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">38 Pallets Today</div>
          <p className="text-xs text-slate-500 font-medium">12 Received &amp; Staged</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Dispatches Pending</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">14 Orders</div>
          <p className="text-xs text-indigo-600 font-medium">Pick &amp; Pack Queue Active</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Stock Discrepancies</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">0 Variance</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Audit Accurate
          </p>
        </div>
      </div>

      {/* 3 Action & Telemetry Cards matching Owner Console styling */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Box className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Inbound Staging &amp; Putaway</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Process supplier deliveries, scan pallet barcodes, and execute RF-guided bin putaway instructions.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Staging Queue: 5 Pallets</span>
            <span className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Pick, Pack &amp; Dispatch</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Generate wave pick lists, assign pickers, print shipping labels, and hand over to 3PL couriers.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
            <span>Wave Pick #102 Active</span>
            <span className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <RefreshCw className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Cycle Count &amp; Stock Audit</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Execute daily blind cycle counts, reconcile bin quantities, and log inventory adjustments to audit ledger.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
            <span>Daily Cycle: Aisle B Completed</span>
            <span className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
