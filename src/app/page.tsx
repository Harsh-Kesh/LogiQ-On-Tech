import Link from 'next/link';
import HeroVideo from '@/components/HeroVideo';
import Header from '@/components/Header';
import { getAssetPath } from '@/lib/nav';

export default function HomePage() {
  return (
    <div className="relative bg-white text-slate-950 min-h-screen font-sans">
      {/* Site Header matching Senura's exact liquid glass design */}
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
                  className="btn btn-primary btn-lg"
                  style={{ background: "#4c3ae3", color: "#ffffff", borderColor: "rgba(255,255,255,0.4)" }}
                >
                  Request Demo &rarr;
                </Link>
                <Link
                  href="/auth/login"
                  className="btn btn-ghost btn-lg"
                  style={{ background: "rgba(255, 255, 255, 0.15)", color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.4)", backdropFilter: "blur(12px)" }}
                >
                  Explore Solutions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Expertise Centers / Core Business Pillars matching Senura's UI cards */}
      <section className="py-24 px-6 sm:px-10 md:px-16 lg:px-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600 block font-mono">
              EXPERT CENTERS
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-950 tracking-tight">
              Core Business Pillars
            </h2>
            <p className="text-base text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Four capabilities, one accountable partner — delivering specialized end-to-end solutions that bridge the gap between physical operations and digital intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    alt="Vendor Management"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    src={getAssetPath("/images/stitch/95c0fb7eb215.png")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    01
                  </span>
                  <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <span className="material-symbols-outlined text-base text-slate-950 font-bold">domain</span>
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">
                    Governance
                  </span>
                  <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">
                    Vendor Management &amp; ATO Compliance
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">
                    ATO statutory ABN/ACN verification, trade document compliance, and vendor catalog isolation.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link
                  href="/dashboard/owner/users"
                  className="w-fit flex items-center gap-2 text-xs font-bold text-slate-950 hover:text-indigo-600 transition-colors"
                >
                  Explore Pillar
                  <span className="w-7 h-7 rounded-full bg-white text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">
                    <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                  </span>
                </Link>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    alt="Warehouse Ledger"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    src={getAssetPath("/images/pexels/home-warehouse-aisle.jpg")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    02
                  </span>
                  <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <span className="material-symbols-outlined text-base text-slate-950 font-bold">warehouse</span>
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">
                    Operations
                  </span>
                  <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">
                    Warehouse Stock &amp; Movement Ledger
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">
                    Multi-warehouse stock balances, bin location allocations, and immutable audit ledgers.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link
                  href="/dashboard/warehouse"
                  className="w-fit flex items-center gap-2 text-xs font-bold text-slate-950 hover:text-indigo-600 transition-colors"
                >
                  Explore Pillar
                  <span className="w-7 h-7 rounded-full bg-white text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">
                    <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                  </span>
                </Link>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    alt="Customer CRM"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    src={getAssetPath("/images/stitch/ea517d840311.png")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    03
                  </span>
                  <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <span className="material-symbols-outlined text-base text-slate-950 font-bold">shopping_cart</span>
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">
                    CRM
                  </span>
                  <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">
                    Customer Orders &amp; Retail CRM
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">
                    Retail buyer sales order creation, real-time shipment tracking, and customer lifecycle invoicing.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link
                  href="/dashboard/customer"
                  className="w-fit flex items-center gap-2 text-xs font-bold text-slate-950 hover:text-indigo-600 transition-colors"
                >
                  Explore Pillar
                  <span className="w-7 h-7 rounded-full bg-white text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">
                    <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                  </span>
                </Link>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    alt="Master Data"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    src={getAssetPath("/images/pexels/partners-server-hardware.jpg")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    04
                  </span>
                  <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <span className="material-symbols-outlined text-base text-slate-950 font-bold">database</span>
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">
                    Master Data
                  </span>
                  <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">
                    Master Data Management (MDM)
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">
                    SKU barcode registry, Unit of Measure (UOM) definitions, category taxonomy, and product masters.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link
                  href="/dashboard/owner"
                  className="w-fit flex items-center gap-2 text-xs font-bold text-slate-950 hover:text-indigo-600 transition-colors"
                >
                  Explore Pillar
                  <span className="w-7 h-7 rounded-full bg-white text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">
                    <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer matching reference design */}
      <footer className="border-t border-slate-200 py-8 px-6 sm:px-10 md:px-16 lg:px-20 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
        <div>LogiQ-On Tech &copy; 2026. All rights reserved. Industrial-grade logistics platform.</div>
        <div className="font-mono text-[11px] text-slate-500">
          Branch: <span className="text-indigo-600 font-bold">feature/KAN-2-auth-rbac-mfa</span> | Environment: <span className="text-emerald-600 font-bold">Staging</span>
        </div>
      </footer>
    </div>
  );
}
