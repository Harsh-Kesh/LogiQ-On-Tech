'use client';

import { useSession } from 'next-auth/react';
import { Building, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function VendorDashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <Building className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Pillar 1: Vendor Management Portal</h1>
            <p className="text-xs text-slate-500 font-mono">Company Onboarding, Compliance Verification &amp; Catalog Management</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ATO ABN Approved
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase font-bold">Vendor Profile Status</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-bold text-slate-900">Status: APPROVED</span>
          </div>
          <p className="text-xs text-slate-500">Apex Hardware &amp; Logistics Ltd (ABN: 12345678901)</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase font-bold">Compliance Documents</div>
          <div className="text-sm font-bold text-slate-900">2 Documents Verified</div>
          <p className="text-xs text-emerald-600 font-medium">Insurance &amp; ABN Certificates Active</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase font-bold">Warehouse Point Access</div>
          <div className="text-sm font-bold text-slate-900">Assigned: WH-SYD-01</div>
          <p className="text-xs text-slate-500">Sydney Central Logistics Hub</p>
        </div>
      </div>
    </div>
  );
}
