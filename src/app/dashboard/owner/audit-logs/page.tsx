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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5" style={{ color: '#1e3a8a' }} />
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Audit Logs</h1>
          </div>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Track security events and account activity across the platform.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all hover:opacity-90 disabled:opacity-60 self-start sm:self-auto"
          style={{ background: '#1e3a8a', color: '#fff' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Stream
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border p-4 flex flex-col md:flex-row md:items-center gap-3" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-center gap-3 flex-1">
          <Search className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search logs by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent placeholder-slate-400"
            style={{ color: '#0f172a' }}
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Filter className="w-3.5 h-3.5 shrink-0" style={{ color: '#94a3b8' }} />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-white focus:outline-none"
            style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
          >
            <option value="ALL">All Modules</option>
            <option value="GOVERNANCE">Governance &amp; RBAC</option>
            <option value="VENDOR_MANAGEMENT">Vendor Directory</option>
            <option value="WAREHOUSE_OPERATIONS">Warehouse &amp; Stock</option>
            <option value="MASTER_DATA_MDM">Master Data (MDM)</option>
          </select>
          <span className="text-xs font-bold flex items-center gap-1 shrink-0" style={{ color: '#1e3a8a' }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> {filteredLogs.length} / {logs.length}
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>Fetching audit log stream…</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border" style={{ borderColor: '#e2e8f0' }}>
          <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>No audit log entries match the current filters.</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Security events and account activity will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Timestamp', 'Action Event', 'Module', 'Triggered By', 'Role', 'Payload'].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const isRoleChange = log.action === 'ROLE_CHANGED';
                const isLogin = log.action.includes('LOGIN');
                const badgeStyle = isRoleChange
                  ? { background: '#fefce8', color: '#854d0e', border: '1px solid #fde68a' }
                  : isLogin
                  ? { background: '#eff6ff', color: '#1e3a8a', border: '1px solid #bfdbfe' }
                  : { background: '#fafafa', color: '#71717a', border: '1px solid #e4e4e7' };

                return (
                  <tr key={log.id} className="border-b transition-colors hover:bg-slate-50" style={{ borderColor: '#f1f5f9' }}>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-xs" style={{ color: '#64748b' }}>{new Date(log.timestamp).toLocaleString()}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={badgeStyle}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-bold" style={{ color: '#0f172a' }}>{log.module}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs" style={{ color: '#0f172a' }}>{log.user?.fullName || log.user?.email || 'System'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs" style={{ color: '#64748b' }}>{log.role || 'N/A'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedPayload(log)}
                        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors hover:bg-slate-100"
                        style={{ color: '#1e3a8a' }}
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filteredLogs.length > 0 && (
        <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
          {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} shown.
        </p>
      )}

      {/* Payload Inspector Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl border" style={{ borderColor: '#e2e8f0' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#f1f5f9' }}>
              <div>
                <h3 className="font-extrabold text-sm" style={{ color: '#0f172a' }}>Security Event Payload</h3>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{selectedPayload.action} • {selectedPayload.module}</p>
              </div>
              <button
                onClick={() => setSelectedPayload(null)}
                className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                style={{ color: '#94a3b8' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="font-mono text-xs p-4 rounded-2xl overflow-x-auto max-h-80" style={{ background: '#0f172a', color: '#93c5fd' }}>
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
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{ background: '#1e3a8a', color: '#fff' }}
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
