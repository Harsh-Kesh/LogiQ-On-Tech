'use client';

import { useSession } from 'next-auth/react';
import { Building, FileText, Package, CheckCircle2 } from 'lucide-react';

export default function VendorDashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pillar 1: Vendor Management Portal</h1>
            <p className="text-xs text-slate-400 font-mono">Company Onboarding, Compliance Verification & Catalog Management</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase">Vendor Profile Status</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-sm font-bold text-white">Status: APPROVED</span>
          </div>
          <p className="text-xs text-slate-400">Apex Hardware & Logistics Ltd (ABN: 12345678901)</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase">Compliance Documents</div>
          <div className="text-sm font-bold text-white">2 Documents Verified</div>
          <p className="text-xs text-emerald-400">Insurance & ABN Certificates Active</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs font-mono text-slate-500 uppercase">Warehouse Point Access</div>
          <div className="text-sm font-bold text-white">Assigned: WH-SYD-01</div>
          <p className="text-xs text-slate-400">Sydney Central Logistics Hub</p>
        </div>
      </div>
    </div>
  );
}
