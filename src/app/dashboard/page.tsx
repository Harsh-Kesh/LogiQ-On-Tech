'use client';

export const dynamic = 'force-dynamic';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Shield, Building, Warehouse, ShoppingCart, Lock, FileText, CheckCircle2, UserCheck, ArrowRight, Clock, Key } from 'lucide-react';

export default function MainDashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="py-12 text-center text-xs font-mono text-slate-400">
        Loading active session parameters...
      </div>
    );
  }

  const role = (session?.user as any)?.role || 'CUSTOMER';
  const email = session?.user?.email || 'N/A';
  const name = session?.user?.name || 'Authenticated User';
  const mfaEnabled = (session?.user as any)?.mfaEnabled || false;

  const rolePortalLinks: Record<string, { title: string; href: string; color: string; icon: any; desc: string }> = {
    PLATFORM_OWNER: {
      title: 'Platform Owner Governance',
      href: '/dashboard/owner',
      color: 'indigo',
      icon: Shield,
      desc: 'Role assignment, system settings & security audit inspection.',
    },
    VENDOR: {
      title: 'Vendor Management Portal',
      href: '/dashboard/vendor',
      color: 'amber',
      icon: Building,
      desc: 'Company profile, statutory compliance docs & product catalog.',
    },
    WAREHOUSE: {
      title: 'Warehouse Point Operations',
      href: '/dashboard/warehouse',
      color: 'emerald',
      icon: Warehouse,
      desc: 'Bin allocations, stock balances & immutable ledger feed.',
    },
    CUSTOMER: {
      title: 'Customer CRM & Storefront',
      href: '/dashboard/customer',
      color: 'sky',
      icon: ShoppingCart,
      desc: 'Sales orders, real-time tracking & customer lifecycle.',
    },
    MDM: {
      title: 'Master Data MDM Hub',
      href: '/dashboard/owner',
      color: 'purple',
      icon: Key,
      desc: 'SKU barcode registry, UOM definitions & category taxonomy.',
    },
  };

  const currentPortal = rolePortalLinks[role] || rolePortalLinks.CUSTOMER;
  const PortalIcon = currentPortal.icon;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Login Success Notification Hero Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" /> Authentication Successful
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome Back, {name}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-mono">
              Session Active • Logged in as <span className="text-indigo-400 font-bold uppercase">{role}</span> ({email})
            </p>
          </div>

          <Link
            href={currentPortal.href}
            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 border border-indigo-400/40 shrink-0"
          >
            Enter {currentPortal.title} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Active Session Info & Security Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Role & Access Level */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-400" /> Active Role & Access
          </div>
          <div className="text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <span>{role}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Scoped access verified via Next.js Edge Middleware and 4-Role Permission Matrix engine.
          </p>
        </div>

        {/* Card 2: Security & MFA Status */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" /> Security & 2FA Status
          </div>
          <div className="flex items-center gap-2">
            {mfaEnabled ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> 2FA MFA Active
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                MFA Pending Enrolment
              </span>
            )}
          </div>
          <Link href="/dashboard/mfa-enrol" className="text-xs text-indigo-400 font-bold hover:underline block pt-1">
            Configure MFA 2FA Enrolment $\rightarrow$
          </Link>
        </div>

        {/* Card 3: Session Timestamp */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" /> Session Timestamp
          </div>
          <div className="text-xs font-mono text-slate-200">
            {new Date().toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">
            JWT session token securely encrypted & verified.
          </p>
        </div>
      </div>

      {/* Quick Access Role Hub Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" /> Authorized Platform Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Scoped Module Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-indigo-500/30 hover:border-indigo-500/60 transition-all space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <PortalIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest">Your Assigned Portal</span>
                <h3 className="text-lg font-bold text-white">{currentPortal.title}</h3>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{currentPortal.desc}</p>
            <Link
              href={currentPortal.href}
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 pt-2"
            >
              Open Dashboard Portal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Audit Log Quick Link (Owner) */}
          {role === 'PLATFORM_OWNER' && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-sky-500/30 hover:border-sky-500/60 transition-all space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-sky-400 font-bold uppercase tracking-widest">Security Audit Engine</span>
                  <h3 className="text-lg font-bold text-white">System Audit Logs Stream</h3>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspect real-time security events, authentication attempts, and role modification history.
              </p>
              <Link
                href="/dashboard/owner/audit-logs"
                className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 hover:text-sky-300 pt-2"
              >
                View Audit Logs Table <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
