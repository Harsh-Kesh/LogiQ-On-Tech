'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ShieldCheck, Users, Activity, FileText, ArrowRight, CheckCircle2, TrendingUp, Building, Database } from 'lucide-react';

export default function PlatformOwnerDashboard() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      {/* Light Welcome Banner */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold font-mono">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            PLATFORM OWNER EXECUTIVE CONSOLE
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {session?.user?.name || 'Platform Owner'}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Multi-tenant system metrics, role-based access controls (RBAC), user suspension engine, and audit logging.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/owner/users"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Users className="w-4 h-4" /> Manage Users &amp; Roles
          </Link>
        </div>
      </div>

      {/* 4 Light Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">System Uptime</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">99.98%</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> All 4 Pillars Operational
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Active Users</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">1,248</div>
          <p className="text-xs text-slate-500 font-medium">RBAC Roles Enforced</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Approved Vendors</span>
            <Building className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">84</div>
          <p className="text-xs text-amber-700 font-medium">ATO ABN Compliant</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Audit Records</span>
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">14,892</div>
          <p className="text-xs text-slate-500 font-medium">Tamper-Proof Ledger</p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">User Directory &amp; RBAC</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Provision users, assign roles (PLATFORM_OWNER, VENDOR, WAREHOUSE, CUSTOMER), and toggle account suspensions.
          </p>
          <Link
            href="/dashboard/owner/users"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Open User Directory <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Security Audit Logs</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Real-time event logging capturing login attempts, MFA challenges, account suspensions, and administrative actions.
          </p>
          <Link
            href="/dashboard/owner/audit-logs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            View Audit Logs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Multi-Tenant Portals</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Test role isolation across Vendor Management, Warehouse Stock Ledgers, and Customer Sales Orders.
          </p>
          <Link
            href="/dashboard/vendor"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors"
          >
            Access Vendor Portal <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
