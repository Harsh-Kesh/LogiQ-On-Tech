'use client';

import { useSession } from 'next-auth/react';
import { ShoppingCart, PackageCheck, Clock, FileCheck } from 'lucide-react';

export default function CustomerDashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Pillar 3: Customer Sales Orders &amp; Invoicing</h1>
            <p className="text-xs text-slate-500 font-mono">Retail Buyer Telemetry, Tracking &amp; Invoice Ledger</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold font-mono">
          Customer Portal Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase font-bold">Active Orders</div>
          <div className="text-2xl font-extrabold text-slate-900">4 Active</div>
          <p className="text-xs text-sky-600 font-medium">In Transit via Australia Post</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase font-bold">Total Purchases</div>
          <div className="text-2xl font-extrabold text-slate-900">$24,850 AUD</div>
          <p className="text-xs text-slate-500">GST Tax Invoices Issued</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase font-bold">Delivery SLA</div>
          <div className="text-2xl font-extrabold text-slate-900">99.4% On Time</div>
          <p className="text-xs text-emerald-600 font-medium">Guaranteed SLA Met</p>
        </div>
      </div>
    </div>
  );
}
