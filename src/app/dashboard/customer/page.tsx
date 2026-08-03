'use client';

import { ShoppingCart, PackageCheck, Clock } from 'lucide-react';

export default function CustomerDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pillar 3: Customer CRM & Order Management</h1>
            <p className="text-xs text-slate-400 font-mono">Storefront Ordering, Status Tracking & Customer Support</p>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-sky-400" /> Recent Customer Orders
          </div>
          <span className="text-xs text-slate-500 font-mono">1 Active Order</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
          <div>
            <div className="font-bold text-white font-mono">Order #ORD-2026-8801</div>
            <div className="text-slate-400">1x Barcode Scanner HD-900</div>
          </div>
          <div className="text-right">
            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold font-mono text-[10px]">
              Status: DISPATCHED
            </span>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">Tracking: AUS-POST-9921</div>
          </div>
        </div>
      </div>
    </div>
  );
}
