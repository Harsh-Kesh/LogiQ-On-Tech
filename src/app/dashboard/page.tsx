'use client';

export const dynamic = 'force-dynamic';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Shield, Building, Lock, FileText, CheckCircle2, UserCheck, ArrowRight, Clock } from 'lucide-react';

export default function MainDashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="py-12 text-center text-xs font-mono text-slate-500 flex items-center justify-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <span>Loading your dashboard…</span>
      </div>
    );
  }

  const role = (session?.user as any)?.role || 'VENDOR';
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
  };

  const currentPortal = rolePortalLinks[role] || rolePortalLinks.VENDOR;
  const PortalIcon = currentPortal.icon;

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans">
      {/* Welcome Banner */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Authentication Successful
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome Back, {name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-mono">
            Session Active • Logged in as <span className="text-indigo-600 font-bold uppercase">{role}</span> ({email})
          </p>
        </div>

        <Link
          href={currentPortal.href}
          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 border border-indigo-400/40 shrink-0"
        >
          Enter {currentPortal.title} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Active Session Info & Security Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Role & Access Level */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2 font-bold">
            <UserCheck className="w-4 h-4 text-indigo-600" /> Active Role &amp; Access
          </div>
          <div className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">
            {role}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Scoped access verified via Next.js Edge Middleware and the 2-Role Permission Matrix.
          </p>
        </div>

        {/* Card 2: Security & MFA Status */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2 font-bold">
            <Lock className="w-4 h-4 text-indigo-600" /> Security &amp; 2FA Status
          </div>
          <div className="flex items-center gap-2">
            {mfaEnabled ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> 2FA MFA Active
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                MFA Pending Enrolment
              </span>
            )}
          </div>
          {mfaEnabled ? (
            <div className="text-xs text-indigo-700 font-semibold pt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> MFA Active &amp; Secured
            </div>
          ) : (
            <Link href="/dashboard/mfa-enrol" className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 pt-1">
              Configure MFA 2FA Enrolment &rarr;
            </Link>
          )}
        </div>

        {/* Card 3: Session Timestamp */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2 font-bold">
            <Clock className="w-4 h-4 text-sky-600" /> Session Timestamp
          </div>
          <div className="text-xs font-mono text-slate-900 font-bold">
            {new Date().toLocaleString()}
          </div>
          <p className="text-xs text-slate-500">
            JWT session token securely encrypted &amp; verified.
          </p>
        </div>
      </div>

      {/* Quick Access Role Hub Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" /> Authorized Platform Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Scoped Module Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <PortalIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-widest">Your Assigned Portal</span>
                <h3 className="text-lg font-bold text-slate-900">{currentPortal.title}</h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{currentPortal.desc}</p>
            <Link
              href={currentPortal.href}
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 pt-2"
            >
              Open Dashboard Portal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Audit Log Quick Link (Owner) */}
          {role === 'PLATFORM_OWNER' && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-sky-600 font-bold uppercase tracking-widest">Security Audit Engine</span>
                  <h3 className="text-lg font-bold text-slate-900">System Audit Logs Stream</h3>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Inspect real-time security events, authentication attempts, and role modification history.
              </p>
              <Link
                href="/dashboard/owner/audit-logs"
                className="inline-flex items-center gap-2 text-xs font-bold text-sky-600 hover:text-sky-800 pt-2"
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
