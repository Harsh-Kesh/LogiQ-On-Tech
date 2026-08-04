'use client';

import { useSession } from 'next-auth/react';
import { Warehouse, Package, Truck, Layers } from 'lucide-react';

export default function WarehouseDashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Warehouse className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Pillar 2: Warehouse Stock &amp; Movement Ledger</h1>
            <p className="text-xs text-slate-500 font-mono">Bin Allocations, RFID Ingestion &amp; 3PL Movement Ledgers</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
          WH-SYD-01 Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase font-bold">Total SKUs On Hand</div>
          <div className="text-2xl font-extrabold text-slate-900">14,250 Units</div>
          <p className="text-xs text-slate-500">Allocated across 12 Aisle Bins</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase font-bold">Dispatched Today</div>
          <div className="text-2xl font-extrabold text-slate-900">320 Shipments</div>
          <p className="text-xs text-emerald-600 font-medium">3PL Express Courier Sync</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase font-bold">Stock Reconciliation</div>
          <div className="text-2xl font-extrabold text-slate-900">100% Matched</div>
          <p className="text-xs text-slate-500">Zero Discrepancy Ledger</p>
        </div>
      </div>
    </div>
  );
}
