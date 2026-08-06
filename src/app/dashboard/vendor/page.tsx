'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Building, FileText, CheckCircle2, Upload, ShieldCheck, AlertCircle, AlertTriangle, XCircle,
  Trash2, FileCheck, Lock, Info, Package, Plus, Search, Edit2, TrendingUp, Clock, Star, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';

interface ComplianceDoc {
  id: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
}

interface VendorProfile {
  id: string;
  companyName: string;
  abnAcn: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  rejectionReason?: string;
  fulfillmentRate?: number;
  onTimeDeliveryRate?: number;
  qualityRating?: number;
  ordersFulfilled?: number;
  docs: ComplianceDoc[];
}

interface Product {
  id: string;
  sku: string;
  barcode: string;
  itemName: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  status: 'ACTIVE' | 'DRAFT' | 'DISCONTINUED';
  createdAt: string;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function VendorDashboardPage() {
  const { data: session } = useSession();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [companyName, setCompanyName] = useState('');
  const [abnAcn, setAbnAcn] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Document Upload State
  const [docType, setDocType] = useState('ATO ABN Registration Certificate');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Products & Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Product Form State
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodSelling, setProdSelling] = useState('');
  const [prodStatus, setProdStatus] = useState<'ACTIVE' | 'DRAFT' | 'DISCONTINUED'>('ACTIVE');
  const [prodDesc, setProdDesc] = useState('');
  const [prodFormError, setProdFormError] = useState('');
  const [prodSubmitting, setProdSubmitting] = useState(false);

  // Toast Feedback State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchVendorProfile();
    fetchVendorProducts();
  }, []);

  async function fetchVendorProfile() {
    setLoading(true);
    try {
      const res = await fetch('/api/vendor/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.vendor) {
          setVendor(data.vendor);
          setCompanyName(data.vendor.companyName || '');
          setAbnAcn(data.vendor.abnAcn || '');
        }
      }
    } catch {
      setToast({ message: 'Error loading vendor profile.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function fetchVendorProducts() {
    setProductsLoading(true);
    try {
      const res = await fetch('/api/vendor/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      setToast({ message: 'Error loading vendor products.', type: 'error' });
    } finally {
      setProductsLoading(false);
    }
  }

  async function handleRegisterProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileSubmitting(true);

    try {
      const res = await fetch('/api/vendor/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, abnAcn }),
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Vendor company profile saved successfully!', type: 'success' });
        if (data.vendor) {
          setVendor(data.vendor);
          setCompanyName(data.vendor.companyName || '');
          setAbnAcn(data.vendor.abnAcn || '');
        }
      } else {
        setProfileError(data.error || 'Failed to save vendor profile.');
        setToast({ message: data.error || 'Failed to save vendor profile.', type: 'error' });
      }
    } catch {
      setProfileError('Network error saving vendor profile.');
      setToast({ message: 'Network error saving vendor profile.', type: 'error' });
    } finally {
      setProfileSubmitting(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setFileValidationError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFileValidationError(`Invalid file format (${ext}). Only PDF, PNG, JPG, JPEG, DOC, and DOCX files are permitted.`);
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileValidationError(`File size (${sizeMB} MB) exceeds maximum allowed limit of 5.00 MB.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  async function handleUploadDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setFileValidationError('Please select a valid document file to upload.');
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileDataUrl = reader.result as string;
        const res = await fetch('/api/vendor/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docType,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            fileDataUrl,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setToast({ message: data.message || `Successfully uploaded ${selectedFile.name}!`, type: 'success' });
          setSelectedFile(null);
          setFileValidationError('');
          if (data.doc) {
            setVendor((prev) => {
              const existingDocs = prev?.docs || [];
              const filteredDocs = existingDocs.filter((d) => d.docType !== data.doc.docType);
              return {
                id: prev?.id || `vnd_${session?.user?.email}`,
                companyName: prev?.companyName || companyName,
                abnAcn: prev?.abnAcn || abnAcn,
                status: 'UNDER_REVIEW',
                docs: [data.doc, ...filteredDocs],
              };
            });
          }
        } else {
          setFileValidationError(data.error || 'Failed to upload document.');
          setToast({ message: data.error || 'Upload failed.', type: 'error' });
        }
        setUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch {
      setToast({ message: 'Error processing file upload.', type: 'error' });
      setUploading(false);
    }
  }

  async function handleDeleteDocument(docId: string) {
    try {
      const res = await fetch(`/api/vendor/documents?id=${docId}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: 'Compliance document deleted.', type: 'info' });
        setVendor((prev) => (prev ? { ...prev, docs: prev.docs.filter((d) => d.id !== docId) } : prev));
      }
    } catch {
      setToast({ message: 'Failed to delete document.', type: 'error' });
    }
  }

  // Product CRUD Handlers
  function openNewProductModal() {
    setEditingProductId(null);
    setProdName('');
    setProdSku('');
    setProdBarcode('');
    setProdCost('');
    setProdSelling('');
    setProdStatus('ACTIVE');
    setProdDesc('');
    setProdFormError('');
    setShowProductModal(true);
  }

  function openEditProductModal(p: Product) {
    setEditingProductId(p.id);
    setProdName(p.itemName);
    setProdSku(p.sku);
    setProdBarcode(p.barcode);
    setProdCost(p.costPrice.toString());
    setProdSelling(p.sellingPrice.toString());
    setProdStatus(p.status);
    setProdDesc(p.description || '');
    setProdFormError('');
    setShowProductModal(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setProdFormError('');
    setProdSubmitting(true);

    const payload = {
      id: editingProductId,
      itemName: prodName,
      sku: prodSku,
      barcode: prodBarcode,
      costPrice: prodCost,
      sellingPrice: prodSelling,
      status: prodStatus,
      description: prodDesc,
    };

    try {
      const res = await fetch('/api/vendor/products', {
        method: editingProductId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message || 'Product saved successfully!', type: 'success' });
        setShowProductModal(false);
        fetchVendorProducts();
      } else {
        setProdFormError(data.error || 'Failed to save product.');
        setToast({ message: data.error || 'Failed to save product.', type: 'error' });
      }
    } catch {
      setProdFormError('Network error saving product.');
      setToast({ message: 'Network error saving product.', type: 'error' });
    } finally {
      setProdSubmitting(false);
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm('Are you sure you want to remove this item from your catalog?')) return;
    try {
      const res = await fetch(`/api/vendor/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: 'Product removed from catalog.', type: 'info' });
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to delete product.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error deleting product.', type: 'error' });
    }
  }

  const currentStatus = vendor?.status || 'PENDING';
  const isApproved = currentStatus === 'APPROVED';
  const existingDocOfType = vendor?.docs?.find((d) => d.docType === docType);

  const filteredProducts = products.filter(
    (p) =>
      p.itemName.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch)
  );

  return (
    <div className="space-y-6 font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Light Header Banner */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <Building className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              PILLAR 01 • VENDOR GOVERNANCE &amp; ATO COMPLIANCE
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {vendor?.companyName || 'Vendor Company Registration'}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              ABN/ACN: {vendor?.abnAcn || 'Pending Registration'} • Account: {session?.user?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge
            variant={
              currentStatus === 'APPROVED'
                ? 'emerald'
                : currentStatus === 'UNDER_REVIEW'
                ? 'amber'
                : currentStatus === 'PENDING'
                ? 'sky'
                : 'danger'
            }
          >
            Status: {currentStatus}
          </Badge>
        </div>
      </div>

      {/* Dynamic Lifecycle Status Alert Box */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          {currentStatus === 'APPROVED' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          {currentStatus === 'UNDER_REVIEW' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
          {currentStatus === 'PENDING' && <AlertCircle className="w-5 h-5 text-sky-600" />}
          {(currentStatus === 'SUSPENDED' || currentStatus === 'REJECTED') && <XCircle className="w-5 h-5 text-rose-600" />}
          
          <h2 className="text-base font-extrabold text-slate-900">
            {currentStatus === 'APPROVED' && 'Vendor Access Granted & ATO Compliant'}
            {currentStatus === 'UNDER_REVIEW' && 'Application Under Review by Platform Owner'}
            {currentStatus === 'PENDING' && 'Registration Pending — Compliance Uploads Required'}
            {currentStatus === 'SUSPENDED' && 'Vendor Account Suspended'}
            {currentStatus === 'REJECTED' && 'Application Rejected'}
          </h2>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed pl-7">
          {currentStatus === 'APPROVED' && 'Your company profile and statutory compliance documents are fully verified. Product catalog creation and 3PL warehouse allocations are active.'}
          {currentStatus === 'UNDER_REVIEW' && 'Your registration details and uploaded certificates have been submitted to Platform Administrators for statutory audit inspection.'}
          {currentStatus === 'PENDING' && 'Please complete your company details below and upload your required ATO ABN Registration Certificate and Insurance documents.'}
          {currentStatus === 'SUSPENDED' && 'Access has been suspended due to expired liability insurance or statutory non-compliance. Please contact support to resolve.'}
          {currentStatus === 'REJECTED' && `Reason: ${vendor?.rejectionReason || 'Document verification failed.'}`}
        </p>
      </div>

      {/* Executed Vendor Performance Monitoring & Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Fulfillment Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {vendor?.fulfillmentRate || 98.4}%
          </p>
          <span className="text-[10px] text-emerald-700 font-bold font-mono">Target: &gt;95.0% • Compliant</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>On-Time Delivery</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {vendor?.onTimeDeliveryRate || 96.8}%
          </p>
          <span className="text-[10px] text-indigo-700 font-bold font-mono">3PL SLA Index High</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Quality Rating</span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {vendor?.qualityRating || 4.9} / 5.0
          </p>
          <span className="text-[10px] text-amber-700 font-bold font-mono">QA Certified Vendor</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Active Catalog SKUs</span>
            <Layers className="w-4 h-4 text-slate-700" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {products.length} Items
          </p>
          <span className="text-[10px] text-slate-500 font-bold font-mono">Scoped to Vendor ID</span>
        </div>
      </div>

      {/* Main Grid: Registration Form & Compliance Document Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Company Profile Form */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-slate-900">Company Registration Details</h3>
            </div>
            {isApproved && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> ATO Locked
              </span>
            )}
          </div>

          {profileError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          {isApproved && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Statutory Lock Active: Approved vendor profiles cannot alter legal entity ABNs directly. To update registered company details, contact Support.</span>
            </div>
          )}

          <form onSubmit={handleRegisterProfile} className="space-y-4">
            <Input
              label="Registered Company Name"
              required
              disabled={isApproved}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Apex Hardware & Logistics Ltd"
            />

            <Input
              label="Australian ABN (11 digits) or ACN (9 digits)"
              required
              disabled={isApproved}
              value={abnAcn}
              onChange={(e) => setAbnAcn(e.target.value)}
              placeholder="e.g. 51 824 753 910"
              helperText="Australian Business Number statutory identity verification (Must be exactly 11 digits)"
            />

            {!isApproved && (
              <Button type="submit" isLoading={profileSubmitting} className="w-full">
                Save Company Profile
              </Button>
            )}
          </form>
        </div>

        {/* Card 2: Compliance Document Upload */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Upload className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">Upload Compliance Certificates</h3>
          </div>

          {fileValidationError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileValidationError}</span>
            </div>
          )}

          {existingDocOfType && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Replaces existing file ({existingDocOfType.fileName}). Uploading a new certificate will queue the file for review.
              </span>
            </div>
          )}

          <form onSubmit={handleUploadDocument} className="space-y-4">
            <Select
              label="Document Classification Type"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              options={[
                { value: 'ATO ABN Registration Certificate', label: 'ATO ABN Registration Certificate' },
                { value: 'Public Liability Insurance Policy', label: 'Public Liability Insurance Policy' },
                { value: 'ISO 9001 Quality Certificate', label: 'ISO 9001 Quality Certificate' },
                { value: 'Trade Compliance Agreement', label: 'Trade Compliance Agreement' },
              ]}
            />

            <div className="space-y-1.5 font-sans">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Compliance File (PDF, PNG, JPG, DOC, DOCX • Max 5MB)
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileSelect}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-600 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Supported: PDF, PNG, JPG, DOC, DOCX. Files over 5MB or executable formats (.exe, .zip) will be rejected.
              </p>
            </div>

            <Button type="submit" variant="success" isLoading={uploading} className="w-full">
              {existingDocOfType ? 'Replace Existing Certificate' : 'Upload Compliance Certificate'}
            </Button>
          </form>
        </div>
      </div>

      {/* Compliance Document Repository Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">Compliance Document Repository</h3>
          </div>
          <span className="text-xs font-mono text-slate-500 font-bold">
            {vendor?.docs?.length || 0} Files Uploaded
          </span>
        </div>

        {!vendor?.docs || vendor.docs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            No compliance documents uploaded yet. Select a file above to submit your ATO certificates.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                  <th className="py-3.5 px-4 font-bold">Document Type</th>
                  <th className="py-3.5 px-4 font-bold">File Name</th>
                  <th className="py-3.5 px-4 font-bold">Size</th>
                  <th className="py-3.5 px-4 font-bold">Uploaded Date</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {vendor.docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{doc.docType}</td>
                    <td className="py-3.5 px-4 text-slate-700">{doc.fileName}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={doc.status === 'APPROVED' ? 'emerald' : 'amber'}>
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                          title="View Document"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vendor Product & Catalog Management (CRUD Scoped to Owning Vendor) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Product &amp; Catalog Management (Item Master)</h3>
              <p className="text-xs text-slate-500">Manage products, pricing, barcodes, and statuses scoped strictly to your vendor account.</p>
            </div>
          </div>

          <Button onClick={openNewProductModal} className="flex items-center gap-2 text-xs">
            <Plus className="w-4 h-4" /> Add New Product
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search catalog by Item Name, SKU, or Barcode..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
            />
          </div>
        </div>

        {/* Products Table */}
        {productsLoading ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">Loading product catalog...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-200 rounded-2xl">
            No products found in your catalog. Click "Add New Product" above to create your first item!
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                  <th className="py-3.5 px-4 font-bold">Item Name</th>
                  <th className="py-3.5 px-4 font-bold">SKU</th>
                  <th className="py-3.5 px-4 font-bold">Barcode</th>
                  <th className="py-3.5 px-4 font-bold">Cost Price</th>
                  <th className="py-3.5 px-4 font-bold">Selling Price</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{p.itemName}</div>
                      {p.description && <div className="text-[10px] text-slate-400 font-sans truncate max-w-xs">{p.description}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-indigo-700 font-bold">{p.sku}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{p.barcode}</td>
                    <td className="py-3.5 px-4 text-slate-600">${Number(p.costPrice).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">${Number(p.sellingPrice).toFixed(2)}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={p.status === 'ACTIVE' ? 'emerald' : p.status === 'DRAFT' ? 'amber' : 'danger'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditProductModal(p)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProductId ? 'Edit Product Item' : 'Add New Product Item'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-600 font-mono text-sm"
              >
                ✕
              </button>
            </div>

            {prodFormError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{prodFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <Input
                label="Product / Item Name"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="e.g. Thermal Printer 300DPI"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SKU Code"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  placeholder="Auto-generated if blank"
                  helperText="e.g. SKU-HDW-9001"
                />
                <Input
                  label="Barcode (EAN / GTIN)"
                  value={prodBarcode}
                  onChange={(e) => setProdBarcode(e.target.value)}
                  placeholder="Auto-generated if blank"
                  helperText="e.g. 9312345000018"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Cost Price ($)"
                  type="number"
                  step="0.01"
                  required
                  value={prodCost}
                  onChange={(e) => setProdCost(e.target.value)}
                  placeholder="120.00"
                />
                <Input
                  label="Selling Price ($)"
                  type="number"
                  step="0.01"
                  required
                  value={prodSelling}
                  onChange={(e) => setProdSelling(e.target.value)}
                  placeholder="249.99"
                />
              </div>

              <Select
                label="Product Status"
                value={prodStatus}
                onChange={(e) => setProdStatus(e.target.value as any)}
                options={[
                  { value: 'ACTIVE', label: 'ACTIVE (Ready for Order Fulfillment)' },
                  { value: 'DRAFT', label: 'DRAFT (Internal Review)' },
                  { value: 'DISCONTINUED', label: 'DISCONTINUED (End of Life)' },
                ]}
              />

              <div className="space-y-1 font-sans">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Enter specifications, dimensions, or packaging details..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowProductModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={prodSubmitting}>
                  {editingProductId ? 'Save Product Changes' : 'Create Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
