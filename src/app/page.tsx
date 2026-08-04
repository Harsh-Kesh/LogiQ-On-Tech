import Link from 'next/link';
import HeroVideo from '@/components/HeroVideo';
import Header from '@/components/Header';
import { getAssetPath } from '@/lib/nav';
import { ShieldCheck, Users, Lock, FileCheck2, Database, Warehouse, ShoppingCart, ArrowRight, CheckCircle2, Server, Layers } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative bg-slate-950 text-white min-h-screen font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header />

      {/* Hero Section matching Senura's layout */}
      <section className="relative min-h-screen flex items-end overflow-hidden bg-slate-950 pt-36 pb-16 md:pb-20">
        <div className="absolute inset-0 z-0">
          <HeroVideo />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/30 pointer-events-none" />
        </div>

        <div className="w-full px-6 sm:px-10 md:px-16 lg:px-20 relative z-20">
          <div className="max-w-3xl">
            <div className="mb-8 md:mb-10">
              <span className="inline-block text-xs font-bold text-white bg-white/20 border border-white/40 px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest backdrop-blur-md shadow-sm">
                INDUSTRIAL PRECISION AT SCALE • DAY 3 BUILD
              </span>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white leading-tight drop-shadow-xl">
                The Intelligent Pulse of <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-sky-200 to-purple-300">Modern Logistics</span>
              </h1>
              <p className="text-base md:text-lg text-white/90 max-w-lg drop-shadow-lg mt-6 font-normal leading-relaxed">
                LogiQ-On Tech orchestrates complex supply chains with real-time AI insights, multi-tenant RBAC security, TOTP MFA authentication, and enterprise-grade reliability.
              </p>
            </div>

            <div className="mt-8 md:mt-12">
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/auth/login"
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl border border-indigo-400/50 shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  Launch App & Sign In <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/dashboard/owner"
                  className="px-8 py-4 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl border border-white/40 backdrop-blur-md transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5 text-indigo-400" /> Platform Owner Shell
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Business Pillars - Senura Design System */}
      <section className="py-24 px-6 sm:px-10 md:px-16 lg:px-20 bg-slate-900/60 border-t border-slate-800">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400 block font-mono">
              PROJECT ARCHITECTURE
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              4 Core Business Pillars
            </h2>
            <p className="text-base text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Engineered to support full multi-tenant logistics operations across Australian statutory compliance, warehouse ledgers, CRM sales orders, and master data management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 01 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 hover:shadow-2xl hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    alt="Vendor Management"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    src={getAssetPath("/images/stitch/95c0fb7eb215.png")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-md">
                    01
                  </span>
                  <div className="absolute bottom-3 left-4 w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <Server className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-2 font-mono">
                    GOVERNANCE
                  </span>
                  <h3 className="text-lg font-bold text-white leading-snug mb-2.5 min-h-[52px]">
                    Vendor Governance &amp; ATO Compliance
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4 min-h-[44px]">
                    ATO statutory ABN/ACN verification, trade document compliance uploads, and vendor catalog isolation.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link
                  href="/dashboard/owner/users"
                  className="w-fit flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Manage Users &amp; Vendors
                  <span className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 border border-slate-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Pillar 02 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 hover:shadow-2xl hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    alt="Warehouse Ledger"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    src={getAssetPath("/images/pexels/home-warehouse-aisle.jpg")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-md">
                    02
                  </span>
                  <div className="absolute bottom-3 left-4 w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <Warehouse className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2 font-mono">
                    OPERATIONS
                  </span>
                  <h3 className="text-lg font-bold text-white leading-snug mb-2.5 min-h-[52px]">
                    Warehouse Stock &amp; Movement Ledger
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4 min-h-[44px]">
                    Multi-warehouse stock balances, bin location allocations, 3PL assignments, and movement ledgers.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link
                  href="/dashboard/warehouse"
                  className="w-fit flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  View Warehouse Console
                  <span className="w-7 h-7 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Pillar 03 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 hover:shadow-2xl hover:border-sky-500/50 transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    alt="Customer CRM"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    src={getAssetPath("/images/stitch/ea517d840311.png")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-md">
                    03
                  </span>
                  <div className="absolute bottom-3 left-4 w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <ShoppingCart className="w-4 h-4 text-sky-600" />
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block mb-2 font-mono">
                    CUSTOMER CRM
                  </span>
                  <h3 className="text-lg font-bold text-white leading-snug mb-2.5 min-h-[52px]">
                    Customer Sales Orders &amp; Invoicing
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4 min-h-[44px]">
                    Retail buyer sales order creation, real-time shipment tracking, customer lifecycle, and invoicing.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link
                  href="/dashboard/customer"
                  className="w-fit flex items-center gap-2 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  View Customer Portal
                  <span className="w-7 h-7 rounded-full bg-slate-800 text-sky-400 border border-slate-700 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-slate-950 transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Pillar 04 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 hover:shadow-2xl hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    alt="Master Data"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    src={getAssetPath("/images/pexels/partners-server-hardware.jpg")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-md">
                    04
                  </span>
                  <div className="absolute bottom-3 left-4 w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <Database className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-2 font-mono">
                    MASTER DATA
                  </span>
                  <h3 className="text-lg font-bold text-white leading-snug mb-2.5 min-h-[52px]">
                    Master Data Management (MDM)
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4 min-h-[44px]">
                    SKU barcode registry, Unit of Measure (UOM) definitions, category taxonomy, and product masters.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link
                  href="/dashboard/owner"
                  className="w-fit flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View Executive Shell
                  <span className="w-7 h-7 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-slate-950 transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Day 3 Delivered Capability Showcase */}
      <section className="py-20 px-6 sm:px-10 md:px-16 lg:px-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400 block font-mono mb-2">
                DAY 3 DELIVERABLES
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Implemented Features &amp; UI Library
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              100% Day 3 Scope Completed
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">4-Role RBAC &amp; TOTP MFA</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Full-stack role enforcement across Platform Owner, Vendor, Warehouse, and Customer with TOTP 2FA interceptors.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Account Suspension Engine
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Real-time Audit Logging
                </li>
              </ul>
            </div>

            <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">User Directory Console</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Administrative user provisioning, dynamic role assignment, account suspension modal, and data search filtering.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Interactive Modal Dialogs
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Typed DataTable Component
                </li>
              </ul>
            </div>

            <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Base UI Component Library</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Shared production component library (`DataTable`, `Modal`, `FileUpload`, `Toast`, `Button`, `Input`, `Select`, `Badge`).
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Senura UI Color Tokens
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Drag &amp; Drop File Upload Zone
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6 sm:px-10 md:px-16 lg:px-20 text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950">
        <div>LogiQ-On Tech &copy; 2026. All rights reserved. Industrial-grade logistics platform.</div>
        <div className="font-mono text-[11px] text-slate-400">
          Branch: <span className="text-indigo-400 font-bold">feature/KAN-2-auth-rbac-mfa</span> | Environment: <span className="text-emerald-400 font-bold">Staging</span>
        </div>
      </footer>
    </div>
  );
}
