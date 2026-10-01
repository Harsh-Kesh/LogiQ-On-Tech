'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, Clock, RefreshCw, Download } from 'lucide-react';

interface WarrantyRecord {
  id: string;
  warrantyNumber: string;
  partNumber: string;
  partDescription: string | null;
  serialNumber: string | null;
  customerName: string | null;
  salesOrderNumber: string | null;
  vendorName: string | null;
  warrantyStartDate: string | null;
  warrantyExpiryDate: string | null;
  warrantyPeriodMonths: number;
  remainingDays: number | null;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_DATA: { label: 'Pending Data', color: 'bg-slate-100 text-slate-600' },
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700' },
  FINAL_SIX_MONTHS: { label: 'Final 6 Months', color: 'bg-amber-100 text-amber-700' },
  EXPIRING_SOON: { label: 'Expiring Soon', color: 'bg-orange-100 text-orange-700' },
  EXPIRED: { label: 'Expired', color: 'bg-red-100 text-red-700' },
  CLOSED: { label: 'Closed', color: 'bg-slate-100 text-slate-500' },
};

function DaysChip({ days }: { days: number | null }) {
  if (days === null) return null;
  if (days < 0) return <span className="text-xs font-bold text-red-600">Expired {Math.abs(days)}d ago</span>;
  if (days === 0) return <span className="text-xs font-bold text-red-600">Expires Today</span>;
  const color = days <= 14 ? 'text-red-600' : days <= 30 ? 'text-orange-600' : days <= 90 ? 'text-amber-600' : 'text-green-600';
  return <span className={`text-xs font-semibold ${color}`}>{days} days left</span>;
}

export default function WarrantiesPage() {
  const [records, setRecords] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchRecords = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/warranties');
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const displayed = filter === 'ALL' ? records : records.filter((r) => r.status === filter);
  const statuses = ['ALL', 'ACTIVE', 'FINAL_SIX_MONTHS', 'EXPIRING_SOON', 'EXPIRED', 'CLOSED', 'PENDING_DATA'];

  const expiringCount = records.filter((r) => r.remainingDays !== null && r.remainingDays >= 0 && r.remainingDays <= 30).length;
  const expiredCount = records.filter((r) => r.status === 'EXPIRED').length;

  const handleExportCsv = () => {
    const headers = ['Warranty #', 'Part #', 'Description', 'Serial', 'Customer', 'SO #', 'Vendor', 'Start Date', 'Expiry Date', 'Period (mo)', 'Days Remaining', 'Status'];
    const rows = displayed.map((r) => [
      r.warrantyNumber, r.partNumber, r.partDescription || '', r.serialNumber || '',
      r.customerName || '', r.salesOrderNumber || '', r.vendorName || '',
      r.warrantyStartDate ? new Date(r.warrantyStartDate).toLocaleDateString('en-AU') : '',
      r.warrantyExpiryDate ? new Date(r.warrantyExpiryDate).toLocaleDateString('en-AU') : '',
      r.warrantyPeriodMonths, r.remainingDays ?? '', r.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'warranties.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warranty Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track warranty periods and expiry alerts for all items</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={fetchRecords}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold text-slate-700">{records.length} Total</span>
        </div>
        {expiringCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-xl border border-orange-200 shadow-sm">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-700">{expiringCount} Expiring ≤30 days</span>
          </div>
        )}
        {expiredCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl border border-red-200 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">{expiredCount} Expired</span>
          </div>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
              filter === s
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {s === 'ALL' ? 'All' : (STATUS_CONFIG[s]?.label || s)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading warranties…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No warranty records found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 font-semibold border-b border-slate-200">
                <th className="pb-2 pr-4">Warranty #</th>
                <th className="pb-2 pr-4">Part</th>
                <th className="pb-2 pr-4">Serial</th>
                <th className="pb-2 pr-4">Customer</th>
                <th className="pb-2 pr-4">Vendor</th>
                <th className="pb-2 pr-4">Period</th>
                <th className="pb-2 pr-4">Expiry</th>
                <th className="pb-2 pr-4">Remaining</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((rec) => {
                const badge = STATUS_CONFIG[rec.status] || { label: rec.status, color: 'bg-slate-100 text-slate-600' };
                return (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-indigo-700 font-semibold">{rec.warrantyNumber}</td>
                    <td className="py-2.5 pr-4">
                      <div className="font-semibold text-slate-900">{rec.partNumber}</div>
                      {rec.partDescription && <div className="text-xs text-slate-400">{rec.partDescription}</div>}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{rec.serialNumber || '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-700">{rec.customerName || '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{rec.vendorName || '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{rec.warrantyPeriodMonths}m</td>
                    <td className="py-2.5 pr-4 text-slate-700">
                      {rec.warrantyExpiryDate ? new Date(rec.warrantyExpiryDate).toLocaleDateString('en-AU') : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <DaysChip days={rec.remainingDays} />
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
