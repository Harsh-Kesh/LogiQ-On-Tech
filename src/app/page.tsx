import Link from 'next/link';
import { ArrowRight, Shield, Building, Warehouse, ShoppingCart, Database, LogIn, UserPlus, Sparkles, CheckCircle2, Lock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Navbar matching senura-d/logiQ header */}
      <header className="glass-header sticky top-0 z-50 px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-extrabold text-xl text-white shadow-lg shadow-indigo-600/30">
              LQ
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                LogiQ-On Tech
              </h1>
              <p className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">Supply Chain & Warehouse Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mr-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Staging Operational
            </span>

            <Link
              href="/auth/register"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs border border-slate-800 transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Register Vendor</span>
            </Link>

            <Link
              href="/auth/login"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 border border-indigo-400/40"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section matching reference UI */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 bg-slate-950">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-white/10 text-white border border-white/20 backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Industrial Precision At Scale
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            The Intelligent Pulse of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-purple-400">
              Modern Logistics
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            LogiQ-On Tech orchestrates the world's most complex supply chains with real-time AI insights, multi-tenant RBAC security, and industrial-grade reliability.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl border border-indigo-400/50 shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 text-sm"
            >
              Sign In to Demo Accounts <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/register"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 backdrop-blur-md transition-all text-sm flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
              Apply as Vendor
            </Link>
          </div>
        </div>
      </section>

      {/* Core Business Pillars Section matching reference cards */}
      <section className="py-16 px-6 bg-slate-950/90 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400 block font-mono">
              Expertise Centers
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Core Business Pillars
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto">
              Four specialized capabilities, one accountable platform — bridging physical operations with digital intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Building className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  Pillar 1
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Vendor Management</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Vendor application processing, ATO ABN/ACN statutory verification, trade document compliance audits, and isolated product catalogs.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pillar Active
                </span>
                <Link href="/auth/register" className="text-xs font-bold text-amber-400 hover:underline">
                  Apply &rarr;
                </Link>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Warehouse className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                  Pillar 2
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Warehouse Operations</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Multi-warehouse stock balances, bin location allocations, 3PL assignments, and immutable movement ledger entries.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pillar Active
                </span>
                <Link href="/auth/login" className="text-xs font-bold text-emerald-400 hover:underline">
                  Explore &rarr;
                </Link>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest block mb-1">
                  Pillar 3
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Customer CRM & Orders</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Retail buyer order placement, real-time shipment tracking, customer relationship management, and invoice generation.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pillar Active
                </span>
                <Link href="/auth/login" className="text-xs font-bold text-sky-400 hover:underline">
                  Explore &rarr;
                </Link>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Database className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                  Pillar 4
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Master Data (MDM)</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  SKU barcode registry, Unit of Measure (UOM) definitions, category taxonomy, and centralized product master management.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pillar Active
                </span>
                <Link href="/auth/login" className="text-xs font-bold text-indigo-400 hover:underline">
                  Explore &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer matching reference design */}
      <footer className="border-t border-slate-800/80 py-8 px-8 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
            LQ
          </div>
          <span>LogiQ-On Tech © 2026. Industrial-grade logistics and warehouse platform.</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Branch: <span className="text-indigo-400 font-bold">feature/KAN-2-auth-rbac-mfa</span> | Environment: <span className="text-emerald-400 font-bold">Staging</span>
        </div>
      </footer>
    </div>
  );
}
