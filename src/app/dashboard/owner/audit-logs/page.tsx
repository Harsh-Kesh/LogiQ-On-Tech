'use client';

import { useState, useEffect } from 'react';
import { FileText, RefreshCw, Filter, CheckCircle2 } from 'lucide-react';

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
    <div className="space-y-6 font-sans">
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Security Audit Logs Engine</h1>
            <p className="text-xs text-slate-500 font-mono">Acceptance Criteria #4 — Login, Role Change &amp; Security Events</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 border border-slate-800 transition-all shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 font-mono">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            Audit Records Stream (PostgreSQL audit_logs)
          </div>
          <span className="text-xs font-mono text-emerald-700 flex items-center gap-1 font-bold">
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
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                  <th className="py-3.5 px-4 font-bold">Timestamp</th>
                  <th className="py-3.5 px-4 font-bold">Action Event</th>
                  <th className="py-3.5 px-4 font-bold">Module</th>
                  <th className="py-3.5 px-4 font-bold">Triggered By</th>
                  <th className="py-3.5 px-4 font-bold">Role</th>
                  <th className="py-3.5 px-4 font-bold">Payload Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => {
                  const isRoleChange = log.action === 'ROLE_CHANGED';
                  const isLogin = log.action.includes('LOGIN');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isRoleChange
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isLogin
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 font-bold">{log.module}</td>
                      <td className="py-3.5 px-4 text-slate-800">{log.user?.fullName || log.user?.email || 'System'}</td>
                      <td className="py-3.5 px-4 text-slate-600">{log.role || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
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
