import Link from 'next/link';
import { ArrowRight, Shield, Building, Warehouse, ShoppingCart, Database, LogIn, UserPlus } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between">
      {/* Glass Header */}
      <header className="glass-header sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-extrabold text-xl text-white shadow-lg shadow-indigo-600/30">
              LQ
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">LogiQ-On Tech</h1>
              <p className="text-[10px] text-indigo-400 font-mono">Platform Staging Build — KAN-2 Live</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mr-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Staging Active
            </span>

            <Link
              href="/auth/register"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs border border-slate-800 transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Register Account</span>
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

      {/* Hero Section matching LogiQ UI */}
      <main className="max-w-5xl mx-auto my-auto text-center px-6 py-16">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-white/10 text-white border border-white/20 backdrop-blur-md mb-6 shadow-sm">
          Industrial Precision At Scale
        </span>

        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          The Intelligent Pulse of <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">
            Modern Logistics
          </span>
        </h2>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          LogiQ-On Tech orchestrates the world's most complex supply chains with real-time AI insights, seamless multi-tenant connectivity, and industrial-grade reliability.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            href="/auth/login"
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl border border-indigo-400/50 shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 text-sm"
          >
            Sign In to Demo Accounts <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/register"
            className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 backdrop-blur-md transition-all text-sm flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-indigo-400" />
            Create New Account
          </Link>
        </div>

        {/* 4 Core Business Pillars Section */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 block mb-2">Expertise Centers</span>
          <h3 className="text-2xl font-extrabold text-white tracking-tight">Core Business Pillars</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {/* Pillar 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Building className="w-5 h-5" />
            </div>
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1 font-mono">Pillar 1</div>
            <h4 className="font-bold text-white text-base mb-2">Vendor Management</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">Onboarding verification, compliance document audits & catalog isolation.</p>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">Status: Ready (KAN-4/5)</span>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Warehouse className="w-5 h-5" />
            </div>
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 font-mono">Pillar 2</div>
            <h4 className="font-bold text-white text-base mb-2">Warehouse Operations</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">Stock balances, bin allocations & immutable movement ledger.</p>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">Status: Ready (KAN-8/9)</span>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1 font-mono">Pillar 3</div>
            <h4 className="font-bold text-white text-base mb-2">Customer CRM</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">Sales order creation, real-time tracking & customer lifecycle.</p>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">Status: Ready (KAN-11/12)</span>
          </div>

          {/* Pillar 4 */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Database className="w-5 h-5" />
            </div>
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 font-mono">Pillar 4</div>
            <h4 className="font-bold text-white text-base mb-2">Master Data (MDM)</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">SKU/Barcode registry, UOM definitions & category taxonomy.</p>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">Status: Ready (KAN-6/7)</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-8 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950">
        <div>LogiQ-On Tech © 2026. All rights reserved. Industrial-grade logistics platform.</div>
        <div className="font-mono text-[11px] text-slate-400">Branch: feature/KAN-2-auth-rbac-mfa | Environment: Staging</div>
      </footer>
    </div>
  );
}
