import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between p-8">
      {/* Header */}
      <header className="flex justify-between items-center border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/30">
            LQ
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">LogiQ-On Tech</h1>
            <p className="text-xs text-indigo-400 font-mono">Platform Staging Build — KAN-1 Active</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Environment: Staging Live
          </span>
        </div>
      </header>

      {/* Main Hero */}
      <main className="max-w-4xl mx-auto my-auto text-center py-12">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6">
          Supply Chain & Logistics Operational Engine
        </span>
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Unified Control Across <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">
            All 4 Core Business Pillars
          </span>
        </h2>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Platform Owner Governance, Vendor Management, Master Data (MDM), Warehouse Operations, and Customer CRM integrated into a 9-step end-to-end operational flow.
        </p>

        {/* Pillar Status Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left">
            <div className="text-xs text-slate-500 font-mono uppercase">Pillar 1</div>
            <div className="font-bold text-white text-sm mt-1">Vendor Management</div>
            <div className="text-[11px] text-indigo-400 mt-2 font-mono">Status: Ready (KAN-4/5)</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left">
            <div className="text-xs text-slate-500 font-mono uppercase">Pillar 2</div>
            <div className="font-bold text-white text-sm mt-1">Warehouse Point</div>
            <div className="text-[11px] text-indigo-400 mt-2 font-mono">Status: Ready (KAN-8/9)</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left">
            <div className="text-xs text-slate-500 font-mono uppercase">Pillar 3</div>
            <div className="font-bold text-white text-sm mt-1">Customer CRM</div>
            <div className="text-[11px] text-indigo-400 mt-2 font-mono">Status: Ready (KAN-11/12)</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left">
            <div className="text-xs text-slate-500 font-mono uppercase">Pillar 4</div>
            <div className="font-bold text-white text-sm mt-1">Master Data (MDM)</div>
            <div className="text-[11px] text-indigo-400 mt-2 font-mono">Status: Ready (KAN-6/7)</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-between items-center border-t border-slate-800 pt-6 text-xs text-slate-500">
        <div>LogiQ-On Tech © 2026. All rights reserved.</div>
        <div className="font-mono">Branch: feature/KAN-1-env-and-schema | Commit: KAN-1-SCHEMA</div>
      </footer>
    </div>
  );
}
