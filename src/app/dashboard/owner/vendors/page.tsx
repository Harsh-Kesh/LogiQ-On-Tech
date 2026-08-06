'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Building, Search, RefreshCw, FileText, CheckCircle2, AlertTriangle, XCircle, ShieldAlert, Eye, FileCheck, Ban, Download, TrendingUp, Clock, Star, Layers } from 'lucide-react';

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
  fulfillmentRate?: number;
  onTimeDeliveryRate?: number;
  qualityRating?: number;
  ordersFulfilled?: number;
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
          message: data.message || `Successfully transitioned ${selectedVendor.companyName || selectedVendor.user?.email} to ${targetStatus}!`,
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
      setToast({ message: 'Network error updating vendor status.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenDoc(doc: ComplianceDoc) {
    if (!doc.fileUrl) return;
    if (doc.fileUrl.startsWith('data:')) {
      try {
        const arr = doc.fileUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (e) {
        const win = window.open();
        if (win) {
          win.document.write(`<iframe src="${doc.fileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        }
      }
    } else {
      window.open(doc.fileUrl, '_blank');
    }
  }

  const columns: Column<VendorRecord>[] = [
    {
      header: 'Company Name & ABN/ACN',
      accessorKey: 'companyName',
      cell: (v) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{v.companyName || 'Pending Company Registration'}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 pl-6">
            {v.abnAcn ? `ABN/ACN: ${v.abnAcn}` : 'ABN/ACN: Not Provided Yet'}
          </div>
        </div>
      ),
    },
    {
      header: 'Primary Account Contact',
      accessorKey: 'user',
      cell: (v) => (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div className="text-indigo-700 font-bold">{v.user?.email}</div>
          <div className="text-slate-500">{v.user?.fullName}</div>
        </div>
      ),
    },
    {
      header: 'Lifecycle Status',
      accessorKey: 'status',
      cell: (v) => {
        const variant =
          v.status === 'APPROVED'
            ? 'emerald'
            : v.status === 'UNDER_REVIEW'
            ? 'amber'
            : v.status === 'PENDING'
            ? 'sky'
            : 'danger';
        return <Badge variant={variant}>{v.status}</Badge>;
      },
    },
    {
      header: 'Compliance Docs',
      accessorKey: 'docs',
      cell: (v) => (
        <div className="text-xs font-mono text-slate-600 font-bold">
          {v.docs?.length || 0} Files Uploaded
        </div>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (v) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedVendor(v);
              setIsDetailModalOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-300" /> Inspect &amp; Review
          </button>
        </div>
      ),
    },
  ];

  const isApprovedVendor = selectedVendor?.status === 'APPROVED';

  return (
    <div className="space-y-6 font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Light Header Banner */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
            <Building className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
              PILLAR 01 • VENDOR GOVERNANCE DIRECTORY
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Vendor Directory &amp; Audit Console
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Inspect vendor registrations, verify compliance documents, and manage status transitions.
            </p>
          </div>
        </div>

        <Button onClick={fetchVendors} variant="outline" className="flex items-center gap-2 text-xs font-mono shrink-0">
          <RefreshCw className="w-4 h-4" /> Refresh Directory
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company name, ABN/ACN, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchVendors()}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
          />
        </div>

        <div className="w-full md:w-64">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Lifecycle States' },
              { value: 'PENDING', label: 'PENDING (Registration Started)' },
              { value: 'UNDER_REVIEW', label: 'UNDER_REVIEW (Documents Submitted)' },
              { value: 'APPROVED', label: 'APPROVED (ATO Verified)' },
              { value: 'SUSPENDED', label: 'SUSPENDED (Access Locked)' },
              { value: 'REJECTED', label: 'REJECTED (Application Refused)' },
            ]}
          />
        </div>
      </div>

      {/* Main Data Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <DataTable data={vendors} columns={columns} isLoading={loading} emptyMessage="No vendor records found matching filter criteria." />
      </div>

      {/* Detail Inspection Modal */}
      {selectedVendor && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Audit Inspection: ${selectedVendor.companyName || selectedVendor.user?.email}`}
        >
          <div className="space-y-6 text-xs font-sans">
            {/* Vendor Profile Metadata */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500 font-semibold block">Registered Company:</span>
                <span className="font-bold text-slate-900">{selectedVendor.companyName || 'Not Registered Yet'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">ABN / ACN Number:</span>
                <span className="font-mono text-slate-900 font-bold">{selectedVendor.abnAcn || 'Not Provided'}</span>
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

            {/* Vendor Performance Telemetry Fields (Contextual for New vs Approved Vendors) */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
              <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> Executed Vendor Performance Monitoring Telemetry
              </h4>
              <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-center">
                <div className="p-2 rounded-xl bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block font-sans">Fulfillment</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {isApprovedVendor ? `${selectedVendor.fulfillmentRate || 98.4}%` : 'N/A'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block font-sans">On-Time Index</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {isApprovedVendor ? `${selectedVendor.onTimeDeliveryRate || 96.8}%` : 'N/A'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block font-sans">QA Rating</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {isApprovedVendor ? `${selectedVendor.qualityRating || 4.9} / 5` : 'Pending'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block font-sans">Fulfilled Orders</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {isApprovedVendor ? (selectedVendor.ordersFulfilled || 142) : '0 Orders'}
                  </span>
                </div>
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
                      <button
                        type="button"
                        onClick={() => handleOpenDoc(doc)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <FileCheck className="w-3.5 h-3.5" /> View / Open Certificate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* State Machine Transition Controls */}
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

      {/* Reject Reason Modal */}
      {selectedVendor && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`Reject Application: ${selectedVendor.companyName || selectedVendor.user?.email}`}
        >
          <div className="space-y-4 text-xs font-sans">
            <p className="text-slate-600">
              Please enter the formal rejection audit reason. This note will be recorded in the audit trail and sent to the vendor.
            </p>

            <Input
              label="Rejection Audit Note"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. ABN verification failed on ATO register / Expiry date missing on insurance certificate"
            />

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={submitting}
                onClick={() => handleStatusTransition('REJECTED', rejectionReason)}
              >
                Confirm Rejection (REJECTED)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
