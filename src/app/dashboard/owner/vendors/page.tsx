'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Building, Search, RefreshCw, FileText, CheckCircle2, AlertTriangle, XCircle, ShieldAlert, Eye, FileCheck, Ban } from 'lucide-react';

interface ComplianceDoc {
  id: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
}

interface VendorRecord {
  id: string;
  companyName: string;
  abnAcn: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  rejectionReason?: string;
  userId: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    isSuspended: boolean;
  };
  docs: ComplianceDoc[];
  createdAt: string;
  approvedAt?: string;
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Selection State
  const [selectedVendor, setSelectedVendor] = useState<VendorRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Toast Feedback State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchVendors();
  }, [statusFilter]);

  async function fetchVendors() {
    setLoading(true);
    try {
      const url = `/api/admin/vendors?status=${statusFilter}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVendors(Array.isArray(data?.vendors) ? data.vendors : []);
      } else {
        setToast({ message: 'Failed to fetch vendor records from database.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error fetching vendors.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusTransition(targetStatus: string, reason?: string) {
    if (!selectedVendor) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/vendors/${selectedVendor.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus, rejectionReason: reason }),
      });

      const data = await res.json();
      if (res.ok) {
        setToast({
          message: `Successfully transitioned ${selectedVendor.companyName} to ${targetStatus}!`,
          type: targetStatus === 'APPROVED' ? 'success' : targetStatus === 'REJECTED' || targetStatus === 'SUSPENDED' ? 'error' : 'info',
        });
        setIsDetailModalOpen(false);
        setIsRejectModalOpen(false);
        setRejectionReason('');
        fetchVendors();
      } else {
        setToast({ message: data.error || 'Failed to update vendor status.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error processing status change.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<VendorRecord>[] = [
    {
      header: 'Company Name & ABN/ACN',
      accessorKey: 'companyName',
      cell: (row) => (
        <div>
          <div className="font-extrabold text-slate-900">{row.companyName}</div>
          <div className="text-xs font-mono text-slate-500">ABN/ACN: {row.abnAcn}</div>
        </div>
      ),
    },
    {
      header: 'Primary Account Contact',
      accessorKey: 'user',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-800">{row.user?.fullName || 'N/A'}</div>
          <div className="text-xs font-mono text-slate-500">{row.user?.email}</div>
        </div>
      ),
    },
    {
      header: 'Lifecycle Status',
      accessorKey: 'status',
      cell: (row) => {
        let variant: 'indigo' | 'amber' | 'emerald' | 'sky' | 'danger' = 'indigo';
        if (row.status === 'APPROVED') variant = 'emerald';
        if (row.status === 'UNDER_REVIEW') variant = 'amber';
        if (row.status === 'PENDING') variant = 'sky';
        if (row.status === 'SUSPENDED' || row.status === 'REJECTED') variant = 'danger';
        return <Badge variant={variant}>{row.status}</Badge>;
      },
    },
    {
      header: 'Compliance Docs',
      accessorKey: 'docs',
      cell: (row) => (
        <span className="text-xs font-mono font-semibold text-slate-600">
          📄 {row.docs?.length || 0} Files Uploaded
        </span>
      ),
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setSelectedVendor(row);
            setIsDetailModalOpen(true);
          }}
          className="flex items-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" /> Inspect &amp; Review
        </Button>
      ),
    },
  ];

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.companyName.toLowerCase().includes(search.toLowerCase()) ||
      v.abnAcn.toLowerCase().includes(search.toLowerCase()) ||
      v.user?.email.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <Building className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Pillar 1: Vendor Directory Console</h1>
            <p className="text-xs text-slate-500 font-mono">Statutory ATO Compliance, File Auditing &amp; State Machine Lifecycle</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchVendors} isLoading={loading}>
            <RefreshCw className="w-4 h-4" /> Refresh Directory
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
          {['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'SUSPENDED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-96">
          <Input
            placeholder="Search by company name, ABN/ACN, or email..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Vendor Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredVendors}
          isLoading={loading}
          emptyMessage="No matching vendor records found."
        />
      </div>

      {/* Vendor Inspection & Transition Modal */}
      {selectedVendor && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Review Vendor: ${selectedVendor.companyName}`}
          subtitle={`ABN/ACN: ${selectedVendor.abnAcn} • ID: ${selectedVendor.id}`}
          maxWidth="lg"
        >
          <div className="space-y-6 text-slate-900 font-sans">
            {/* Vendor Profile Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Company Name:</span>
                <span className="font-extrabold text-slate-900">{selectedVendor.companyName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Australian ABN/ACN:</span>
                <span className="font-mono font-bold text-slate-900">{selectedVendor.abnAcn}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Primary Account:</span>
                <span className="font-mono text-indigo-700 font-bold">{selectedVendor.user?.email}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Current Lifecycle Status:</span>
                <Badge variant={selectedVendor.status === 'APPROVED' ? 'emerald' : selectedVendor.status === 'UNDER_REVIEW' ? 'amber' : 'danger'}>
                  {selectedVendor.status}
                </Badge>
              </div>
            </div>

            {selectedVendor.rejectionReason && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                ⚠️ Rejection Reason: {selectedVendor.rejectionReason}
              </div>
            )}

            {/* Compliance Docs Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Submitted Compliance Documents
              </h4>

              {selectedVendor.docs?.length === 0 ? (
                <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 text-center text-xs text-amber-800 font-medium">
                  ⚠️ No compliance documents uploaded by vendor yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedVendor.docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{doc.docType}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {doc.fileName} • {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] flex items-center gap-1"
                      >
                        <FileCheck className="w-3.5 h-3.5" /> View Certificate
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Allowed State Machine Transition Controls */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                State Machine Controls (Allowed Transitions from {selectedVendor.status})
              </h4>

              <div className="flex flex-wrap gap-3">
                {selectedVendor.status === 'PENDING' && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleStatusTransition('UNDER_REVIEW')}
                      isLoading={submitting}
                    >
                      Start Document Review (UNDER_REVIEW)
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setIsRejectModalOpen(true)}
                    >
                      Reject Application (REJECTED)
                    </Button>
                  </>
                )}

                {selectedVendor.status === 'UNDER_REVIEW' && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleStatusTransition('APPROVED')}
                      isLoading={submitting}
                    >
                      Approve &amp; Grant ATO Status (APPROVED)
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setIsRejectModalOpen(true)}
                    >
                      Reject Application (REJECTED)
                    </Button>
                  </>
                )}

                {selectedVendor.status === 'APPROVED' && (
                  <>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleStatusTransition('SUSPENDED')}
                      isLoading={submitting}
                    >
                      Suspend Access (SUSPENDED)
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusTransition('UNDER_REVIEW')}
                      isLoading={submitting}
                    >
                      Re-Audit Vendor (UNDER_REVIEW)
                    </Button>
                  </>
                )}

                {selectedVendor.status === 'SUSPENDED' && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleStatusTransition('APPROVED')}
                      isLoading={submitting}
                    >
                      Reactivate Vendor (APPROVED)
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setIsRejectModalOpen(true)}
                    >
                      Revoke Permanently (REJECTED)
                    </Button>
                  </>
                )}

                {selectedVendor.status === 'REJECTED' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleStatusTransition('PENDING')}
                    isLoading={submitting}
                  >
                    Allow Re-Application (PENDING)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Rejection Reason Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Vendor Application"
      >
        <div className="space-y-4 text-slate-900 font-sans">
          <p className="text-xs text-slate-600">
            Please enter a formal rejection reason for <span className="font-extrabold text-slate-900">{selectedVendor?.companyName}</span>.
          </p>

          <Input
            label="Rejection Reason & Audit Notes"
            required
            placeholder="e.g. Invalid ATO ABN certificate or failed background check"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => handleStatusTransition('REJECTED', rejectionReason)}
              isLoading={submitting}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
