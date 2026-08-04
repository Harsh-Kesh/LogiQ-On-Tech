import Link from 'next/link';
import HeroVideo from '@/components/HeroVideo';
import Header from '@/components/Header';
import { ArrowRight, Building, Warehouse, ShoppingCart, Database, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative bg-slate-950 text-white min-h-screen font-sans selection:bg-indigo-500 selection:text-white">
      {/* Site Header from senura-d/logiQ */}
      <Header />

      {/* Hero Section matching Senura's exact design */}
      <section className="relative min-h-screen flex items-end overflow-hidden bg-slate-950 pt-36 pb-16 md:pb-20">
        <div className="absolute inset-0 z-0">
          <HeroVideo />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/30 pointer-events-none" />
        </div>

        <div className="w-full px-6 sm:px-10 md:px-16 lg:px-20 relative z-20">
          <div className="max-w-3xl">
            <div className="mb-8 md:mb-10">
              <span className="inline-block text-xs font-bold text-white bg-white/20 border border-white/40 px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest backdrop-blur-md shadow-sm">
                INDUSTRIAL PRECISION AT SCALE
              </span>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white leading-tight drop-shadow-xl">
                The Intelligent Pulse of <br />
                <span>Modern Logistics</span>
              </h1>
              <p className="text-base md:text-lg text-white/90 max-w-lg drop-shadow-lg mt-6 font-normal leading-relaxed">
                LogiQ-On Tech orchestrates the world&apos;s most complex supply chains with real-time AI insights, seamless connectivity, and industrial-grade reliability.
              </p>
            </div>

            <div className="mt-8 md:mt-12">
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/auth/login"
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl border border-indigo-400/50 shadow-xl transition-all flex items-center gap-2"
                >
                  Request Demo <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/auth/login"
                  className="px-8 py-4 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl border border-white/40 backdrop-blur-md transition-all flex items-center gap-2"
                >
                  Explore Solutions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Expertise Centers / Core Business Pillars */}
      <section className="py-20 px-6 sm:px-10 md:px-16 lg:px-20 bg-slate-950 border-t border-slate-900">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400 block font-mono">
              Expertise Centers
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              Core Business Pillars
            </h2>
            <p className="text-base text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Four capabilities, one accountable partner — delivering specialized end-to-end solutions that bridge the gap between physical operations and digital intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 hover:shadow-2xl hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 h-full p-6">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Building className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block mb-2">
                  01 • Infrastructure
                </span>
                <h3 className="text-lg font-bold text-white mb-2.5">Vendor Management & Governance</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  ATO statutory ABN/ACN verification, trade document compliance, and vendor catalog isolation.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pillar Active
                </span>
                <Link href="/auth/login" className="text-xs font-bold text-white hover:text-indigo-400 flex items-center gap-1">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 hover:shadow-2xl hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 h-full p-6">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Warehouse className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block mb-2">
                  02 • Warehouse
                </span>
                <h3 className="text-lg font-bold text-white mb-2.5">Warehouse Stock & Ledger</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  Multi-warehouse stock balances, bin location allocations, 3PL assignments, and immutable movement ledger.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pillar Active
                </span>
                <Link href="/auth/login" className="text-xs font-bold text-white hover:text-indigo-400 flex items-center gap-1">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 hover:shadow-2xl hover:border-sky-500/50 transition-all duration-300 hover:-translate-y-1 h-full p-6">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest block mb-2">
                  03 • Customer CRM
                </span>
                <h3 className="text-lg font-bold text-white mb-2.5">Customer Orders & CRM</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  Retail buyer sales order creation, real-time shipment tracking, customer lifecycle, and invoicing.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pillar Active
                </span>
                <Link href="/auth/login" className="text-xs font-bold text-white hover:text-indigo-400 flex items-center gap-1">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 hover:shadow-2xl hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1 h-full p-6">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block mb-2">
                  04 • Master Data
                </span>
                <h3 className="text-lg font-bold text-white mb-2.5">Master Data Management (MDM)</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  SKU barcode registry, Unit of Measure (UOM) definitions, category taxonomy, and product masters.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pillar Active
                </span>
                <Link href="/auth/login" className="text-xs font-bold text-white hover:text-indigo-400 flex items-center gap-1">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer matching reference design */}
      <footer className="border-t border-slate-800 py-8 px-6 sm:px-10 md:px-16 lg:px-20 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950">
        <div>LogiQ-On Tech © 2026. All rights reserved. Industrial-grade logistics platform.</div>
        <div className="font-mono text-[11px] text-slate-400">
          Branch: <span className="text-indigo-400 font-bold">feature/KAN-2-auth-rbac-mfa</span> | Environment: <span className="text-emerald-400 font-bold">Staging</span>
        </div>
      </footer>
    </div>
  );
}
