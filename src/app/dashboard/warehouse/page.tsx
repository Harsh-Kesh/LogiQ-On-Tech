'use client';

import { Warehouse, Boxes, History } from 'lucide-react';

export default function WarehouseDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pillar 2: Warehouse Point Operations</h1>
            <p className="text-xs text-slate-400 font-mono">Facility Management, Stock Balances & Immutable Ledger</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Boxes className="w-4 h-4" /> Stock Balances (WH-SYD-01)
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
            <div>
              <div className="font-bold text-white">LOGIQ-SCN-001</div>
              <div className="text-slate-500 font-mono">Barcode Scanner HD-900</div>
            </div>
            <div className="text-right font-mono text-emerald-400 font-bold">
              100 Units On Hand
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
            <History className="w-4 h-4" /> Immutable Movement Ledger
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono">
            <div className="text-emerald-400 font-bold">+100 RECEIPT | PO-2026-0001</div>
            <div className="text-slate-400 text-[10px]">Aisle 2 - Bin B-04 | Initial Stock Receipt</div>
          </div>
        </div>
      </div>
    </div>
  );
}
