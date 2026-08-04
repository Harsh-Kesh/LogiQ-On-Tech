'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ShoppingCart, PackageCheck, Clock, FileCheck, ArrowRight, ShieldCheck, Truck, TrendingUp, CreditCard } from 'lucide-react';

export default function CustomerDashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6 font-sans">
      {/* Light Welcome Banner matching Owner Console */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 shrink-0">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              PILLAR 03 • CUSTOMER CRM &amp; INVOICING PORTAL
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Induja Retail Buyers Portal
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Account ID: CUST-AU-9081 • Account: {session?.user?.email || 'customer@logiqon.com'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono flex items-center gap-1.5">
            <PackageCheck className="w-4 h-4 text-emerald-600" /> Active Account
          </div>
          <button className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer">
            <ShoppingCart className="w-4 h-4" /> Create Sales Order
          </button>
        </div>
      </div>

      {/* 4 Metric Cards matching Owner Console layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Active Orders</span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">4 In Transit</div>
          <p className="text-xs text-sky-600 font-semibold flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" /> Tracked via Australia Post 3PL
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Total Spend</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">$24,850 AUD</div>
          <p className="text-xs text-slate-500 font-medium">GST Tax Invoices Issued</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Delivery SLA</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">99.4% On Time</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Guaranteed SLA Met
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Invoices Paid</span>
            <FileCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">18 Invoices</div>
          <p className="text-xs text-slate-500 font-medium">Zero Outstanding Arrears</p>
        </div>
      </div>

      {/* 3 Action & Telemetry Cards matching Owner Console styling */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Live Shipment Telemetry</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Real-time GPS tracking for active dispatches, estimated arrival times (ETA), and proof of delivery (POD) signatures.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-700">
            <span>Tracking: 4 Active Waybills</span>
            <span className="w-6 h-6 rounded-full bg-sky-50 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Invoices &amp; Tax Statements</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Download PDF ATO tax invoices, monthly statement summaries, and automated payment receipts.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Latest: INV-2026-8812</span>
            <span className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Order Re-Order &amp; Catalog</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Reorder frequently purchased logistics hardware, barcode scanners, and RFID tags with 1-click reorder templates.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
            <span>Saved Templates: 3 Active</span>
            <span className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
