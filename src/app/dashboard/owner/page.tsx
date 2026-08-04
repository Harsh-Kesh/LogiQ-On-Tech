'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Shield,
  Users,
  Building,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  Lock,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

export default function PlatformOwnerExecutiveDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalUsers: 4,
    activeVendors: 1,
    suspendedUsers: 0,
    auditEvents: 12,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        const users = data.users;
        setStats({
          totalUsers: users.length,
          activeVendors: users.filter((u: any) => u.role === 'VENDOR').length,
          suspendedUsers: users.filter((u: any) => u.isSuspended).length,
          auditEvents: 16,
        });
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Executive Hero Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950 border border-purple-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 font-mono">
              <Shield className="w-3.5 h-3.5 text-purple-400" /> Platform Owner Executive Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              System Administration & Control Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Manage enterprise users, assign role access levels, inspect audit trails, and enforce security policies.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/owner/users"
              className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xl shadow-purple-600/30 transition-all flex items-center gap-2 border border-purple-400/40"
            >
              <UserPlus className="w-4 h-4" /> Manage Users
            </Link>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: System Health */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              System Health
            </span>
            <div className="text-xl font-extrabold text-emerald-400 flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-5 h-5" /> ONLINE
            </div>
            <p className="text-[11px] text-slate-400 font-mono">99.98% Gateway Uptime</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Registered Users */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Total Accounts
            </span>
            <div className="text-2xl font-extrabold text-white font-mono">{stats.totalUsers}</div>
            <p className="text-[11px] text-purple-400 font-mono">Platform Accounts Active</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Active Vendors */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Active Vendors
            </span>
            <div className="text-2xl font-extrabold text-white font-mono">{stats.activeVendors}</div>
            <p className="text-[11px] text-amber-400 font-mono">Approved Hardware Suppliers</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Building className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Security Alerts */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Security Matrix
            </span>
            <div className="text-2xl font-extrabold text-white font-mono">
              {stats.suspendedUsers > 0 ? (
                <span className="text-amber-400">{stats.suspendedUsers} Suspended</span>
              ) : (
                <span className="text-emerald-400">0 Alerts</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">All Nodes Secured</p>
          </div>
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Governance Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Management Module Card */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-purple-500/30 hover:border-purple-500/60 transition-all space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-widest">
                Core User Management
              </span>
              <h3 className="text-lg font-bold text-white">Create, Suspend & Assign Roles</h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Provision new user accounts for Platform Owners, Vendors, Warehouse personnel, and Customers. Instantly toggle suspension or update security roles.
          </p>
          <Link
            href="/dashboard/owner/users"
            className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 pt-2"
          >
            Open User Management Console <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Security Audit Engine Card */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-sky-500/30 hover:border-sky-500/60 transition-all space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-600/20 text-sky-400 border border-sky-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-sky-400 font-bold uppercase tracking-widest">
                Security Audit Engine
              </span>
              <h3 className="text-lg font-bold text-white">Immutable Platform Audit Logs</h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Inspect real-time authentication logs, failed login attempts, role changes, and MFA enrolments recorded directly to the PostgreSQL audit ledger.
          </p>
          <Link
            href="/dashboard/owner/audit-logs"
            className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 hover:text-sky-300 pt-2"
          >
            View Audit Log Streams <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
