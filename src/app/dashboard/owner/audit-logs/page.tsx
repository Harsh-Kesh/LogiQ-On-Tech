'use client';

import { useState, useEffect } from 'react';
import { FileText, RefreshCw, Filter, CheckCircle2, Search, Eye, X } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Audit log fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesModule = moduleFilter === 'ALL' || log.module === moduleFilter;
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      !searchQuery ||
      (log.action || '').toLowerCase().includes(query) ||
      (log.module || '').toLowerCase().includes(query) ||
      (log.user?.email || '').toLowerCase().includes(query) ||
      (log.user?.fullName || '').toLowerCase().includes(query) ||
      (log.payloadJson || '').toLowerCase().includes(query);

    return matchesModule && matchesQuery;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Security Audit Logs Engine</h1>
            <p className="text-xs text-slate-500 font-mono">Security Audit Stream &amp; Forensic Logging</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 border border-slate-800 transition-all shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Stream
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 font-mono">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            Audit Stream Controls
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search logs by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">All Modules Fleet</option>
              <option value="GOVERNANCE">Governance &amp; RBAC</option>
              <option value="VENDOR_MANAGEMENT">Vendor Directory</option>
              <option value="WAREHOUSE_OPERATIONS">Warehouse &amp; Stock</option>
              <option value="MASTER_DATA_MDM">Master Data (MDM)</option>
            </select>

            <span className="text-xs font-mono text-emerald-700 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> {filteredLogs.length} / {logs.length} Filtered
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">
            Fetching security audit log stream...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">
            No security audit log entries match the current filter selection.
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
                  <th className="py-3.5 px-4 font-bold">Payload Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredLogs.map((log) => {
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
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedPayload(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3 text-sky-600" /> View Payload
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formatted Payload Inspection Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Security Event Payload Data</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedPayload.action} • {selectedPayload.module}</p>
              </div>
              <button
                onClick={() => setSelectedPayload(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-2xl overflow-x-auto max-h-80 border border-slate-800">
              <pre>
                {(() => {
                  try {
                    return JSON.stringify(
                      typeof selectedPayload.payloadJson === 'string'
                        ? JSON.parse(selectedPayload.payloadJson)
                        : selectedPayload.payloadJson || {},
                      null,
                      2
                    );
                  } catch (e) {
                    return selectedPayload.payloadJson || '{}';
                  }
                })()}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
