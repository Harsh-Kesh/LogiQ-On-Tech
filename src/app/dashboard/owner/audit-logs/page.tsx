'use client';

import { useState, useEffect } from 'react';
import { FileText, Shield, RefreshCw, Filter, CheckCircle2 } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-500/20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Security Audit Logs Engine</h1>
            <p className="text-xs text-slate-400 font-mono">Acceptance Criteria #4 — Login, Role Change & Security Events</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            Audit Records Stream (PostgreSQL audit_logs)
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {logs.length} Security Logs Tracked
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">
            Fetching security audit log stream...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">
            No audit log entries found yet. Perform a login or role change to see events populate here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Action Event</th>
                  <th className="py-3 px-3">Module</th>
                  <th className="py-3 px-3">Triggered By</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Payload Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {logs.map((log) => {
                  const isRoleChange = log.action === 'ROLE_CHANGED';
                  const isLogin = log.action.includes('LOGIN');

                  return (
                    <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isRoleChange
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isLogin
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{log.module}</td>
                      <td className="py-3 px-3 text-slate-200">{log.user?.fullName || log.user?.email || 'System'}</td>
                      <td className="py-3 px-3 text-slate-400">{log.role || 'N/A'}</td>
                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                        {log.payloadJson || '{}'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
