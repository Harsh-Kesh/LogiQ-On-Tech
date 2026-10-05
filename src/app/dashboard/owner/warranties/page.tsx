'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ShieldCheck, AlertTriangle, Clock, RefreshCw, Download, X, Calendar, XCircle, Paperclip, Trash2, Upload } from 'lucide-react';

const NAVY = '#4C3AE3';

interface WarrantyRecord {
  id: string;
  warrantyNumber: string;
  partNumber: string;
  partDescription: string | null;
  serialNumber: string | null;
  batchNumber: string | null;
  customerName: string | null;
  salesOrderNumber: string | null;
  vendorName: string | null;
  warrantyStartDate: string | null;
  warrantyStartRule: string | null;
  warrantyExpiryDate: string | null;
  warrantyPeriodMonths: number;
  remainingDays: number | null;
  status: string;
  overrideReason: string | null;
  overriddenBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  _count: { evidence: number };
}

interface EvidenceFile {
  id: string;
  fileName: string;
  fileType: string;
  uploadedBy: string | null;
  uploadedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING_DATA:     { label: 'Pending Data',   bg: '#fafafa', color: '#71717a', border: '#e4e4e7' },
  ACTIVE:           { label: 'Active',         bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  FINAL_SIX_MONTHS: { label: 'Final 6 Months', bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  EXPIRING_SOON:    { label: 'Expiring Soon',  bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  EXPIRED:          { label: 'Expired',        bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  CLOSED:           { label: 'Closed',         bg: '#fafafa', color: '#71717a', border: '#e4e4e7' },
};

const START_RULE_LABELS: Record<string, string> = {
  DELIVERY_DATE:      'Delivery date',
  INSTALLATION_DATE:  'Installation date (overridden)',
  SUPPLIER_INVOICE:   'Supplier invoice date',
};

function DaysChip({ days }: { days: number | null }) {
  if (days === null) return null;
  if (days < 0)  return <span className="text-xs font-bold" style={{ color: '#991b1b' }}>Expired {Math.abs(days)}d ago</span>;
  if (days === 0) return <span className="text-xs font-bold" style={{ color: '#991b1b' }}>Expires Today</span>;
  const color = days <= 30 ? '#991b1b' : days <= 90 ? '#854d0e' : '#166534';
  return <span className="text-xs font-semibold" style={{ color }}>{days}d remaining</span>;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" style={{ color: '#64748b' }} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WarrantiesPage() {
  const [records, setRecords] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('ALL');

  // Close modal state
  const [closingRecord, setClosingRecord] = useState<WarrantyRecord | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [closing, setClosing] = useState(false);

  // Override start date modal state
  const [overrideRecord, setOverrideRecord] = useState<WarrantyRecord | null>(null);
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  // Evidence modal state
  const [evidenceRecord, setEvidenceRecord] = useState<WarrantyRecord | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/warranties');
      if (res.ok) {
        setRecords(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        setLoadError(body.error || `Failed to load warranties (HTTP ${res.status}).`);
      }
    } catch {
      setLoadError('Network error loading warranties.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const displayed = filter === 'ALL' ? records : records.filter((r) => r.status === filter);
  const statuses = ['ALL', 'ACTIVE', 'FINAL_SIX_MONTHS', 'EXPIRING_SOON', 'EXPIRED', 'CLOSED', 'PENDING_DATA'];

  const expiringCount = records.filter((r) => r.remainingDays !== null && r.remainingDays >= 0 && r.remainingDays <= 30).length;
  const expiredCount  = records.filter((r) => r.status === 'EXPIRED').length;

  const handleExportCsv = () => {
    const headers = ['Warranty #', 'Part #', 'Description', 'Serial', 'Batch', 'Customer', 'SO #', 'Vendor',
      'Start Date', 'Start Rule', 'Expiry Date', 'Period (mo)', 'Days Remaining', 'Status', 'Override Reason'];
    const rows = displayed.map((r) => [
      r.warrantyNumber, r.partNumber, r.partDescription || '', r.serialNumber || '', r.batchNumber || '',
      r.customerName || '', r.salesOrderNumber || '', r.vendorName || '',
      r.warrantyStartDate ? new Date(r.warrantyStartDate).toLocaleDateString('en-AU') : '',
      START_RULE_LABELS[r.warrantyStartRule || ''] || r.warrantyStartRule || '',
      r.warrantyExpiryDate ? new Date(r.warrantyExpiryDate).toLocaleDateString('en-AU') : '',
      r.warrantyPeriodMonths, r.remainingDays ?? '', r.status, r.overrideReason || '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'warranties.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Close warranty ──────────────────────────────────────────────────────────

  const openCloseModal = (rec: WarrantyRecord) => {
    setClosingRecord(rec);
    setCloseReason('');
  };

  const handleClose = async () => {
    if (!closingRecord || !closeReason.trim()) return;
    setClosing(true);
    const res = await fetch(`/api/admin/warranties/${closingRecord.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', reason: closeReason }),
    });
    setClosing(false);
    if (res.ok) {
      setClosingRecord(null);
      fetchRecords();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
  };

  // ── Override start date ─────────────────────────────────────────────────────

  const openOverrideModal = (rec: WarrantyRecord) => {
    setOverrideRecord(rec);
    // Pre-fill with current start date
    setOverrideDate(rec.warrantyStartDate ? rec.warrantyStartDate.split('T')[0] : '');
    setOverrideReason('');
  };

  const handleOverride = async () => {
    if (!overrideRecord || !overrideDate || !overrideReason.trim()) return;
    setOverriding(true);
    const res = await fetch(`/api/admin/warranties/${overrideRecord.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_start_date', startDate: overrideDate, reason: overrideReason }),
    });
    setOverriding(false);
    if (res.ok) {
      setOverrideRecord(null);
      fetchRecords();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
  };

  // ── Evidence files ──────────────────────────────────────────────────────────

  const openEvidenceModal = async (rec: WarrantyRecord) => {
    setEvidenceRecord(rec);
    setEvidenceLoading(true);
    const res = await fetch(`/api/admin/warranties/${rec.id}/evidence`);
    if (res.ok) setEvidenceFiles(await res.json());
    setEvidenceLoading(false);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!evidenceRecord || !e.target.files?.length) return;
    const file = e.target.files[0];
    if (file.size > 10_000_000) { alert('File must be under 10 MB'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const res = await fetch(`/api/admin/warranties/${evidenceRecord.id}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileData: base64 }),
      });
      setUploading(false);
      if (res.ok) {
        const created = await res.json();
        setEvidenceFiles((prev) => [...prev, created]);
        // Update the count in the records list
        setRecords((prev) => prev.map((r) =>
          r.id === evidenceRecord.id ? { ...r, _count: { evidence: r._count.evidence + 1 } } : r
        ));
      } else {
        const d = await res.json().catch(() => ({}));
        alert(`Upload failed: ${d.error || res.statusText}`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!evidenceRecord) return;
    if (!confirm('Delete this file?')) return;
    const res = await fetch(`/api/admin/warranties/${evidenceRecord.id}/evidence/${evidenceId}`, { method: 'DELETE' });
    if (res.ok) {
      setEvidenceFiles((prev) => prev.filter((f) => f.id !== evidenceId));
      setRecords((prev) => prev.map((r) =>
        r.id === evidenceRecord.id ? { ...r, _count: { evidence: Math.max(0, r._count.evidence - 1) } } : r
      ));
    }
  };

  const handleDownloadEvidence = async (evidenceId: string, fileName: string) => {
    if (!evidenceRecord) return;
    const res = await fetch(`/api/admin/warranties/${evidenceRecord.id}/evidence/${evidenceId}`);
    if (!res.ok) return;
    const { fileData, fileType } = await res.json();
    const blob = new Blob([Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0))], { type: fileType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5" style={{ color: NAVY }} />
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Warranty Management</h1>
          </div>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Track warranty periods, expiry alerts, and lifecycle actions for all sold items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-colors hover:bg-slate-50"
            style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={fetchRecords} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-colors hover:bg-slate-50 disabled:opacity-60"
            style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border shadow-sm" style={{ borderColor: '#e2e8f0' }}>
          <ShieldCheck className="w-4 h-4" style={{ color: '#166534' }} />
          <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>{records.filter(r => r.status !== 'CLOSED').length} Active records</span>
        </div>
        {expiringCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm" style={{ background: '#fefce8', borderColor: '#fde68a' }}>
            <Clock className="w-4 h-4" style={{ color: '#854d0e' }} />
            <span className="text-sm font-semibold" style={{ color: '#854d0e' }}>{expiringCount} expiring within 30 days</span>
          </div>
        )}
        {expiredCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: '#991b1b' }} />
            <span className="text-sm font-semibold" style={{ color: '#991b1b' }}>{expiredCount} expired</span>
          </div>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1 rounded-full text-xs font-semibold border transition"
            style={filter === s
              ? { background: NAVY, color: '#fff', borderColor: NAVY }
              : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }}>
            {s === 'ALL' ? 'All' : (STATUS_CONFIG[s]?.label || s)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loadError && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
          {loadError}
        </div>
      )}
      {loading ? (
        <div className="text-center py-20 text-sm" style={{ color: '#94a3b8' }}>Loading warranties…</div>
      ) : loadError ? null : displayed.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: '#e2e8f0' }}>
          <ShieldCheck className="w-8 h-8 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>No warranty records found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Warranty #', 'Part', 'Customer', 'Vendor', 'Period', 'Start Date', 'Expiry', 'Remaining', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
              {displayed.map((rec) => {
                const badge = STATUS_CONFIG[rec.status] || { label: rec.status, bg: '#fafafa', color: '#71717a', border: '#e4e4e7' };
                const isClosed = rec.status === 'CLOSED';
                const canAct = !isClosed;
                return (
                  <tr key={rec.id} className={`hover:bg-slate-50 transition-colors ${isClosed ? 'opacity-60' : ''}`} style={{ borderColor: '#f1f5f9' }}>
                    <td className="px-4 py-3 font-mono text-xs font-bold whitespace-nowrap" style={{ color: NAVY }}>{rec.warrantyNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold" style={{ color: '#0f172a' }}>{rec.partNumber}</div>
                      {rec.partDescription && <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{rec.partDescription}</div>}
                      {rec.serialNumber && <div className="text-xs font-mono mt-0.5" style={{ color: '#64748b' }}>S/N: {rec.serialNumber}</div>}
                      {rec.batchNumber && <div className="text-xs font-mono mt-0.5" style={{ color: '#64748b' }}>Batch: {rec.batchNumber}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div style={{ color: '#0f172a' }}>{rec.customerName || '—'}</div>
                      {rec.salesOrderNumber && <div className="text-xs" style={{ color: '#94a3b8' }}>{rec.salesOrderNumber}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#64748b' }}>{rec.vendorName || '—'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{rec.warrantyPeriodMonths}m</td>
                    <td className="px-4 py-3">
                      <div className="text-xs whitespace-nowrap" style={{ color: '#475569' }}>
                        {rec.warrantyStartDate ? new Date(rec.warrantyStartDate).toLocaleDateString('en-AU') : '—'}
                      </div>
                      {rec.warrantyStartRule && rec.warrantyStartRule !== 'DELIVERY_DATE' && (
                        <div className="text-[10px] mt-0.5" style={{ color: '#854d0e' }}>
                          {START_RULE_LABELS[rec.warrantyStartRule] || rec.warrantyStartRule}
                        </div>
                      )}
                      {rec.overrideReason && (
                        <div className="text-[10px] mt-0.5 max-w-[140px] truncate" style={{ color: '#94a3b8' }} title={rec.overrideReason}>
                          Override: {rec.overrideReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#475569' }}>
                      {rec.warrantyExpiryDate ? new Date(rec.warrantyExpiryDate).toLocaleDateString('en-AU') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <DaysChip days={rec.remainingDays} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                        {badge.label}
                      </span>
                      {isClosed && rec.closedBy && (
                        <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>by {rec.closedBy}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => openEvidenceModal(rec)}
                          title="View or upload evidence files"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition hover:opacity-80"
                          style={{ background: '#EEF0FE', color: NAVY, borderColor: '#D9D4FB' }}
                        >
                          <Paperclip className="w-3 h-3" />
                          Evidence{rec._count.evidence > 0 ? ` (${rec._count.evidence})` : ''}
                        </button>
                        {canAct && (
                          <>
                            <button
                              onClick={() => openOverrideModal(rec)}
                              title="Override warranty start date (e.g. installation date)"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition hover:opacity-80"
                              style={{ background: '#fefce8', color: '#854d0e', borderColor: '#fde68a' }}
                            >
                              <Calendar className="w-3 h-3" />
                              Start Date
                            </button>
                            <button
                              onClick={() => openCloseModal(rec)}
                              title="Close this warranty record"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                              style={{ background: '#fafafa', color: '#71717a', borderColor: '#e4e4e7' }}
                            >
                              <XCircle className="w-3 h-3" />
                              Close
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Close warranty modal */}
      {closingRecord && (
        <Modal title={`Close Warranty — ${closingRecord.warrantyNumber}`} onClose={() => setClosingRecord(null)}>
          <p className="text-sm mb-4" style={{ color: '#64748b' }}>
            Closing this record stops all future alerts and marks the warranty as inactive.
            Use this when the item has been returned, replaced, or the customer relationship has ended.
          </p>
          <div className="space-y-3">
            <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: '#f8fafc', color: '#64748b' }}>
              <div><strong style={{ color: '#0f172a' }}>Part:</strong> {closingRecord.partNumber} — {closingRecord.partDescription}</div>
              <div><strong style={{ color: '#0f172a' }}>Customer:</strong> {closingRecord.customerName || '—'}</div>
              <div><strong style={{ color: '#0f172a' }}>Expires:</strong> {closingRecord.warrantyExpiryDate ? new Date(closingRecord.warrantyExpiryDate).toLocaleDateString('en-AU') : '—'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#475569' }}>Reason for closing <span style={{ color: '#991b1b' }}>*</span></label>
              <textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="e.g. Item returned and replaced, customer requested closure, warranty claimed and resolved…"
                rows={3}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 resize-none"
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setClosingRecord(null)}
                className="px-4 py-2 rounded-xl border text-sm font-semibold hover:bg-slate-50 transition"
                style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
                Cancel
              </button>
              <button
                onClick={handleClose}
                disabled={!closeReason.trim() || closing}
                className="px-4 py-2 rounded-xl text-white text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#dc2626' }}
              >
                {closing ? 'Closing…' : 'Close Warranty'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Evidence files modal */}
      {evidenceRecord && (
        <Modal title={`Evidence Files — ${evidenceRecord.warrantyNumber}`} onClose={() => setEvidenceRecord(null)}>
          <p className="text-sm mb-4" style={{ color: '#64748b' }}>
            Attach supporting documents: supplier invoice PDF, delivery confirmation, warranty certificate, MYOB tax invoice.
          </p>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadFile}
            accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.csv" />
          <div className="mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition hover:opacity-90 disabled:opacity-60 w-full justify-center"
              style={{ background: NAVY }}
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading…' : 'Upload File'}
            </button>
            <p className="text-[11px] text-center mt-1" style={{ color: '#94a3b8' }}>PDF, JPG, PNG, DOCX, XLSX · max 10 MB</p>
          </div>
          {evidenceLoading ? (
            <div className="text-center py-6 text-sm" style={{ color: '#94a3b8' }}>Loading files…</div>
          ) : evidenceFiles.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: '#94a3b8' }}>No evidence files uploaded yet</div>
          ) : (
            <ul className="space-y-2">
              {evidenceFiles.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{f.fileName}</div>
                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>
                      {f.fileType} · {f.uploadedBy || 'owner'} · {new Date(f.uploadedAt).toLocaleDateString('en-AU')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDownloadEvidence(f.id, f.fileName)}
                      title="Download"
                      className="p-1.5 rounded-lg bg-white border hover:bg-[#EEF0FE] transition"
                      style={{ borderColor: '#e2e8f0', color: '#64748b' }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvidence(f.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg bg-white border hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition"
                      style={{ borderColor: '#e2e8f0', color: '#64748b' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {/* Override start date modal */}
      {overrideRecord && (
        <Modal title={`Override Start Date — ${overrideRecord.warrantyNumber}`} onClose={() => setOverrideRecord(null)}>
          <p className="text-sm mb-4" style={{ color: '#64748b' }}>
            Use this when the warranty should start from the installation or commissioning date
            rather than the delivery date. The expiry date will be recalculated automatically.
          </p>
          <div className="space-y-3">
            <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: '#f8fafc', color: '#64748b' }}>
              <div><strong style={{ color: '#0f172a' }}>Part:</strong> {overrideRecord.partNumber} — {overrideRecord.partDescription}</div>
              <div><strong style={{ color: '#0f172a' }}>Current start:</strong> {overrideRecord.warrantyStartDate ? new Date(overrideRecord.warrantyStartDate).toLocaleDateString('en-AU') : '—'}</div>
              <div><strong style={{ color: '#0f172a' }}>Current expiry:</strong> {overrideRecord.warrantyExpiryDate ? new Date(overrideRecord.warrantyExpiryDate).toLocaleDateString('en-AU') : '—'}</div>
              <div><strong style={{ color: '#0f172a' }}>Period:</strong> {overrideRecord.warrantyPeriodMonths} months</div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#475569' }}>New warranty start date <span style={{ color: '#991b1b' }}>*</span></label>
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#475569' }}>Reason for override <span style={{ color: '#991b1b' }}>*</span></label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Item commissioned on site 6 weeks after delivery, warranty should start from commissioning date…"
                rows={3}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 resize-none"
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setOverrideRecord(null)}
                className="px-4 py-2 rounded-xl border text-sm font-semibold hover:bg-slate-50 transition"
                style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
                Cancel
              </button>
              <button
                onClick={handleOverride}
                disabled={!overrideDate || !overrideReason.trim() || overriding}
                className="px-4 py-2 rounded-xl text-white text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#d97706' }}
              >
                {overriding ? 'Saving…' : 'Save Override'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
