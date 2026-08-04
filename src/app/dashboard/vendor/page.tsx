'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Building, FileText, CheckCircle2, Package, ArrowRight, ShieldCheck, Upload, Truck, TrendingUp, AlertCircle } from 'lucide-react';

export default function VendorDashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6 font-sans">
      {/* Light Welcome Banner matching Owner Console */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <Building className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              PILLAR 01 • VENDOR GOVERNANCE PORTAL
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Apex Hardware &amp; Logistics Ltd
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              ABN: 51 824 753 910 • ATO Compliance Verified • Account: {session?.user?.email || 'vendor@logiqon.com'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ATO ABN Approved
          </div>
          <button className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> Upload Compliance Cert
          </button>
        </div>
      </div>

      {/* 4 Metric Cards matching Owner Console layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Profile Status</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">APPROVED</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Australian Statutory Compliant
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Compliance Documents</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">4 Active</div>
          <p className="text-xs text-slate-500 font-medium">Insurance &amp; ACN Certificates</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Assigned Warehouse</span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">WH-SYD-01</div>
          <p className="text-xs text-indigo-600 font-medium">Sydney Central Logistics Hub</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Catalog SKUs</span>
            <Package className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">142 Products</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +18 Added This Month
          </p>
        </div>
      </div>

      {/* 3 Action & Telemetry Cards matching Owner Console styling */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Compliance &amp; Tax Audits</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Manage annual ATO ABN renewals, public liability insurance policies, and ISO 9001 quality certificates.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
            <span>Next Review: 15 Oct 2026</span>
            <span className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Catalog &amp; Price Lists</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Maintain wholesale price points, minimum order quantities (MOQ), and barcode SKU mappings for 3PL warehouses.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Sync Status: Live</span>
            <span className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Inbound Delivery Schedules</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Schedule dock appointment times, pallet dispatch notifications, and advance shipping notices (ASN).
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
            <span>Upcoming: 3 Shipments</span>
            <span className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
