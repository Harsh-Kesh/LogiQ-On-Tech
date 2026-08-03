'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Shield, UserCheck, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function OwnerDashboardPage() {
  const { data: session, update } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [newRole, setNewRole] = useState('VENDOR');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data.logs) {
        // extract user list if available
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const res = await fetch('/api/auth/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser || (session?.user as any)?.id,
          newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg(`❌ Error: ${data.error}`);
      } else {
        setMsg(`✅ Role changed successfully to ${newRole}! Audit entry logged.`);
        await update({ role: newRole });
      }
    } catch (e: any) {
      setMsg('❌ Failed to update role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-500/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Platform Owner Governance & Control</h1>
            <p className="text-xs text-slate-400 font-mono">System Ownership, Vendor Approvals & RBAC Administration</p>
          </div>
        </div>
      </div>

      {/* Role Management Tool (Acceptance Criteria #2 & Audit Entries #4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <UserCheck className="w-4 h-4" />
            Role Change & Permission Modifier (Triggers Audit Log)
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Test modifying user roles dynamically. Every role change writes an immutable audit record to the <code className="text-indigo-300 font-mono">audit_logs</code> table.
          </p>

          {msg && (
            <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs font-mono text-indigo-300">
              {msg}
            </div>
          )}

          <form onSubmit={handleRoleChange} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target User ID (Leave blank for current account)</label>
              <input
                type="text"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                placeholder="Current User Session ID"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Select New Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="PLATFORM_OWNER">PLATFORM_OWNER (Full Governance)</option>
                <option value="VENDOR">VENDOR (Pillar 1 Vendor Management)</option>
                <option value="WAREHOUSE">WAREHOUSE (Pillar 2 Warehouse Operations)</option>
                <option value="CUSTOMER">CUSTOMER (Pillar 3 Customer CRM)</option>
                <option value="MDM">MDM (Pillar 4 Master Data Management)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Executing Role Update...' : 'Execute Role Change & Log Audit Hook'}
            </button>
          </form>
        </div>

        {/* Audit Log Quick Access */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm mb-2">
              <FileText className="w-4 h-4" />
              Security Audit Logs Engine (Acceptance Criteria #4)
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              All sensitive security events (Logins, Failed Auth Attempts, Role Changes, MFA Enrolments) write structured JSON payloads to the <code className="text-sky-300 font-mono">audit_logs</code> PostgreSQL table.
            </p>
          </div>

          <Link
            href="/dashboard/owner/audit-logs"
            className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs text-center transition-all block shadow-md shadow-sky-600/20"
          >
            View Live Security Audit Logs Table $\rightarrow$
          </Link>
        </div>
      </div>
    </div>
  );
}
