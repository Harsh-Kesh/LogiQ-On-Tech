'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Building, FileText, CheckCircle2, Upload, ShieldCheck, AlertCircle, AlertTriangle, XCircle,
  Trash2, FileCheck, Lock, Info, Package, Plus, Search, Edit2, TrendingUp, Clock, Star, Layers,
  DollarSign, FolderTree, Tag, Ruler, Eye, RefreshCw, FileSpreadsheet, Truck, ClipboardList,
  Award, BarChart3, Target, ThumbsUp, Download, Printer, Route,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { FileUpload } from '@/components/ui/FileUpload';
import { CategoryItem } from '@/lib/categories';
import { UnitOfMeasureItem } from '@/lib/uom';
import { BarcodeRenderer } from '@/components/ui/BarcodeRenderer';

interface ComplianceDoc {
  id: string;
  docType: string;
  fileName: string;
  // Never present once returned to the vendor — documents are owner-review-only after
  // upload. Optional here purely because the API omits it for this role.
  fileUrl?: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
}

interface VendorProfile {
  id: string;
  email: string;
  fullName: string;
  companyName?: string;
  abnAcn?: string;
  businessRegisteredAddress?: string;
  businessLocation?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  totalOrders?: number;
  totalReturns?: number;
  damagedReturns?: number;
  abnAcnVerified?: boolean;
  abnAcnMessage?: string;
  docs: ComplianceDoc[];
}

interface Product {
  id: string;
  sku: string;
  barcode: string;
  itemName: string;
  description?: string;
  imageUrl?: string;
  costPrice: number;
  sellingPrice: number;
  marginPercent?: number;
  markupPercent?: number;
  moq?: number;
  status: 'ACTIVE' | 'DRAFT' | 'DISCONTINUED';
  categoryId?: string;
  categoryName?: string;
  uomId?: string;
  uomCode?: string;
  attributes?: Record<string, string>;
  statusHistory?: Array<{ from: string; to: string; changedBy: string; changedAt: string; reason?: string }>;
  createdAt: string;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function VendorDashboardPage() {
  const { data: session } = useSession();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Categories, UOM & Warehouses Taxonomies
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasureItem[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Statutory Registration Profile Form State
  const [companyName, setCompanyName] = useState('');
  const [abnAcn, setAbnAcn] = useState('');
  const [businessRegisteredAddress, setBusinessRegisteredAddress] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Compliance Document Upload State
  const [docType, setDocType] = useState('ATO ABN Registration Certificate');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Products & Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

  const [productSearch, setProductSearch] = useState('');

  // Vendor Outbound Shipping Orders State
  

  // Purchase Orders & Vendor Invoices State
  const [vendorPOs, setVendorPOs] = useState<any[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<any[]>([]);
  const [isViSubmitOpen, setIsViSubmitOpen] = useState(false);
  const [viSubmitForm, setViSubmitForm] = useState<any>({
    vendorInvoiceNumber: '', linkedPoNumber: '', invoiceAmount: 0, dueDate: '',
    attachment: null as { fileName: string; fileUrl: string } | null,
  });
  const [viSubmitting, setViSubmitting] = useState(false);
  const [poAllowedTransitions, setPoAllowedTransitions] = useState<Record<string, string[]>>({});
  const [viewPoModal, setViewPoModal] = useState<any | null>(null);

  // Transport Costs — a shipment can cover multiple POs/dispatches at once, so the
  // freight bill has to be split across them; the owner must approve a claim before
  // any PO total moves, and this vendor can't invoice a PO with a claim still pending.
  const [transportCosts, setTransportCosts] = useState<any[]>([]);
  const [vendorDispatchNotes, setVendorDispatchNotes] = useState<any[]>([]);
  const [isTcModalOpen, setIsTcModalOpen] = useState(false);
  const [tcForm, setTcForm] = useState<{ warehouseCode: string; trackingNumber: string; totalCost: string; dnNumbers: string[]; notes: string }>({
    warehouseCode: '', trackingNumber: '', totalCost: '', dnNumbers: [], notes: '',
  });
  const [tcSubmitting, setTcSubmitting] = useState(false);

  // Toast Feedback State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchVendorProfile();
    fetchVendorProducts();
    fetchTaxonomies();
    fetchVendorPOs();
    fetchVendorInvoices();
    fetchTransportCosts();
  }, []);

  useEffect(() => { if (vendorPOs.length > 0) fetchVendorDispatchNotes(); }, [vendorPOs]);

  async function fetchTransportCosts() {
    try {
      const res = await fetch('/api/transport-costs');
      if (res.ok) {
        const data = await res.json();
        setTransportCosts(data.transportCosts || []);
      }
    } catch {}
  }

  async function fetchVendorDispatchNotes() {
    try {
      const res = await fetch('/api/dispatch-notes');
      if (res.ok) {
        const data = await res.json();
        const myLinkedSoNumbers = new Set(vendorPOs.map((p) => p.linkedSalesOrderNumber).filter(Boolean));
        setVendorDispatchNotes((data.dispatchNotes || []).filter((d: any) => myLinkedSoNumbers.has(d.salesOrderNumber)));
      }
    } catch {}
  }

  useEffect(() => { if (vendor) fetchVendorPOs(); }, [vendor]);

  useEffect(() => {
    const loadAllowed = async () => {
      const statuses = [...new Set(vendorPOs.map((p) => p.status))];
      const map: Record<string, string[]> = {};
      for (const status of statuses) {
        try {
          const res = await fetch(`/api/lifecycle?entity=PURCHASE_ORDER&from=${status}`);
          const data = await res.json();
          map[status] = data.allowed || [];
        } catch { map[status] = []; }
      }
      setPoAllowedTransitions(map);
    };
    if (vendorPOs.length > 0) loadAllowed();
  }, [vendorPOs]);


  async function fetchVendorPOs() {
    try {
      const res = await fetch('/api/purchase-orders');
      if (res.ok) {
        const data = await res.json();
        const myName = vendor?.companyName || session?.user?.name || '';
        setVendorPOs((data.purchaseOrders || []).filter((p: any) =>
          p.vendorName?.toLowerCase() === myName.toLowerCase() ||
          ['SENT_TO_VENDOR', 'VENDOR_CONFIRMED', 'PARTIALLY_SUPPLIED', 'FULLY_SUPPLIED'].includes(p.status)
        ));
      }
    } catch {}
  }

  async function fetchVendorInvoices() {
    try {
      const res = await fetch('/api/vendor-invoices');
      if (res.ok) {
        const data = await res.json();
        setVendorInvoices(data.vendorInvoices || []);
      }
    } catch {}
  }

  async function handleSubmitVendorInvoice(e: React.FormEvent) {
    e.preventDefault();
    setViSubmitting(true);
    try {
      const po = vendorPOs.find((p) => p.poNumber === viSubmitForm.linkedPoNumber);
      const body: any = {
        vendorInvoiceNumber: viSubmitForm.vendorInvoiceNumber,
        linkedPoNumber: viSubmitForm.linkedPoNumber,
        vendorName: vendor?.companyName || session?.user?.name || '',
        invoiceAmount: Number(viSubmitForm.invoiceAmount),
        dueDate: viSubmitForm.dueDate,
        currency: po?.currency || 'AUD',
        status: 'SUBMITTED',
      };
      if (viSubmitForm.attachment) body.attachment = viSubmitForm.attachment;
      const res = await fetch('/api/vendor-invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: `Invoice ${data.vendorInvoice.vendorInvoiceNumber} submitted.`, type: 'success' });
      setIsViSubmitOpen(false);
      setViSubmitForm({ vendorInvoiceNumber: '', linkedPoNumber: '', invoiceAmount: 0, dueDate: '', attachment: null });
      fetchVendorInvoices();
    } catch (err: any) {
      setToast({ message: err.message || 'Submission failed.', type: 'error' });
    } finally { setViSubmitting(false); }
  }

  function handleViAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'Attachment file size exceeds 5MB limit.', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setViSubmitForm((prev: any) => ({
        ...prev,
        attachment: { fileName: file.name, fileUrl: reader.result as string },
      }));
      setToast({ message: `Attached: ${file.name}`, type: 'success' });
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmitTransportCost(e: React.FormEvent) {
    e.preventDefault();
    if (tcForm.dnNumbers.length === 0) {
      setToast({ message: 'Select at least one dispatch note this shipment covers.', type: 'error' });
      return;
    }
    setTcSubmitting(true);
    try {
      const res = await fetch('/api/transport-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber: tcForm.trackingNumber,
          totalCost: Number(tcForm.totalCost),
          relatedDnNumbers: tcForm.dnNumbers,
          notes: tcForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: `Transport cost claim ${data.transportCost.transportCostNumber} submitted for owner approval.`, type: 'success' });
      setIsTcModalOpen(false);
      setTcForm({ warehouseCode: '', trackingNumber: '', totalCost: '', dnNumbers: [], notes: '' });
      fetchTransportCosts();
    } catch (err: any) {
      setToast({ message: err.message || 'Submission failed.', type: 'error' });
    } finally {
      setTcSubmitting(false);
    }
  }

  function toggleTcDn(dnNumber: string) {
    setTcForm((prev) => ({
      ...prev,
      dnNumbers: prev.dnNumbers.includes(dnNumber) ? prev.dnNumbers.filter((n) => n !== dnNumber) : [...prev.dnNumbers, dnNumber],
    }));
  }

  // Same-warehouse, shipped, not-yet-claimed dispatch notes are the only ones a claim
  // can legitimately cover — mirrors the server-side validation exactly.
  const SHIPPED_STATUSES = ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'PARTIALLY_DELIVERED'];
  const claimedDnNumbers = new Set(
    transportCosts.filter((t) => t.status !== 'REJECTED').flatMap((t) => t.relatedDnNumbers || [])
  );
  const claimableDns = vendorDispatchNotes.filter(
    (d) => SHIPPED_STATUSES.includes(d.status) && !claimedDnNumbers.has(d.dispatchNumber)
  );
  const claimableWarehouses = Array.from(new Set(claimableDns.map((d) => d.warehouseCode)));
  const dnsForSelectedWarehouse = claimableDns.filter((d) => d.warehouseCode === tcForm.warehouseCode);

  // Client-side preview only — mirrors deriveRelatedPosAndWeights on the server, which
  // is what actually computes and validates the split on submit.
  const tcRelatedPoPreview = (() => {
    const selectedDns = dnsForSelectedWarehouse.filter((d) => tcForm.dnNumbers.includes(d.dispatchNumber));
    const weightByPo = new Map<string, number>();
    for (const dn of selectedDns) {
      const candidatePos = vendorPOs.filter((p) => p.linkedSalesOrderNumber === dn.salesOrderNumber);
      for (const line of dn.lines || []) {
        const qty = Math.abs(line.dispatchQty || 0);
        if (qty <= 0) continue;
        for (const po of candidatePos) {
          const poLine = (po.lines || []).find((l: any) => l.itemCode === line.itemCode);
          if (!poLine) continue;
          weightByPo.set(po.poNumber, (weightByPo.get(po.poNumber) || 0) + qty * (poLine.unitCost || 0));
        }
      }
    }
    const totalWeight = Array.from(weightByPo.values()).reduce((s, v) => s + v, 0);
    const cost = Number(tcForm.totalCost) || 0;
    return Array.from(weightByPo.entries()).map(([poNumber, weight]) => ({
      poNumber,
      amount: totalWeight > 0 ? (cost * weight) / totalWeight : 0,
    }));
  })();

  async function advanceVendorPoStatus(po: any, nextStatus: string) {
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: `Purchase order ${po.poNumber} → ${nextStatus.replace(/_/g, ' ')}`, type: 'success' });
      fetchVendorPOs();
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to update purchase order.', type: 'error' });
    }
  }


  async function fetchTaxonomies() {
    try {
      const [catRes, uomRes, whRes] = await Promise.all([
        fetch('/api/mdm/categories'),
        fetch('/api/mdm/uom'),
        fetch('/api/inventory/warehouses'),
      ]);
      const catData = await catRes.json();
      const uomData = await uomRes.json();
      const whData = await whRes.json();
      setCategories(catData.categories || []);
      setUoms(uomData.uoms || []);
      setWarehouses(whData.warehouses || []);
    } catch (e) {
      console.error('Failed to fetch taxonomies:', e);
    }
  }

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
          setBusinessRegisteredAddress(data.vendor.businessRegisteredAddress || '');
          setBusinessLocation(data.vendor.businessLocation || '');
        }
      }
    } catch {
      setToast({ message: 'Error loading vendor profile.', type: 'error' });
    } finally {
      setLoading(false);
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
        body: JSON.stringify({ companyName, abnAcn, businessRegisteredAddress, businessLocation }),
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Vendor registration details saved and submitted for review.', type: 'success' });
        if (data.vendor) {
          setVendor(data.vendor);
          setCompanyName(data.vendor.companyName || '');
          setAbnAcn(data.vendor.abnAcn || '');
          setBusinessRegisteredAddress(data.vendor.businessRegisteredAddress || '');
          setBusinessLocation(data.vendor.businessLocation || '');
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
      setFileValidationError(`File size exceeds maximum limit of 5MB (${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  async function handleUploadDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setFileValidationError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setFileValidationError('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const fileUrl = reader.result as string;

        const res = await fetch('/api/vendor/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docType,
            fileName: selectedFile.name,
            fileUrl,
            fileSize: selectedFile.size,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setToast({ message: `Compliance document (${docType}) uploaded successfully! It's now locked for Platform Owner review — you won't be able to view, download, or replace it unless it's rejected.`, type: 'success' });
          setSelectedFile(null);
          fetchVendorProfile();
        } else {
          setFileValidationError(data.error || 'Failed to upload document.');
          setToast({ message: data.error || 'Failed to upload document.', type: 'error' });
        }
        setUploading(false);
      };
    } catch {
      setFileValidationError('Network error uploading compliance document.');
      setToast({ message: 'Network error uploading compliance document.', type: 'error' });
      setUploading(false);
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


  const isApproved = vendor?.status === 'APPROVED';
  const existingDocOfType = vendor?.docs?.find((d) => d.docType === docType);
  // A document can only be uploaded once per type — re-upload is only allowed if the
  // Owner has rejected it, since that's the vendor's one path to correct and resubmit.
  const isLockedForType = !!existingDocOfType && existingDocOfType.status !== 'REJECTED';

  const filteredProducts = products.filter(
    (p) =>
      p.itemName.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Light Header Banner Card (Matching Owner Console UI Styling) */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
            <Building className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              VENDOR PORTAL • ATO COMPLIANCE & CATALOG
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Vendor Operations Portal
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Manage statutory registration, upload compliance documents, and publish products.
            </p>
          </div>
        </div>

        {vendor && (
          <div className="flex items-center gap-2 font-mono shrink-0">
            <span className="text-xs font-bold text-slate-500">Account Status:</span>
            <Badge
              variant={
                vendor.status === 'APPROVED'
                  ? 'indigo'
                  : vendor.status === 'UNDER_REVIEW'
                  ? 'amber'
                  : vendor.status === 'PENDING'
                  ? 'sky'
                  : 'danger'
              }
            >
              {vendor.status}
            </Badge>
          </div>
        )}
      </div>

      {/* Statutory registration + compliance document upload happen in-app, reviewed and
          approved by the Platform Owner from the Vendor Directory. Once a document is
          uploaded it's locked from the vendor's side — no view, no download, no delete —
          only the owner can see the file content during review. A vendor can only act on
          orders/invoices/dispatches once this whole registration is APPROVED. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Company Registration Details */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-mono">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Company Registration Details</h3>
            </div>
            {vendor && (
              <Badge
                variant={
                  vendor.status === 'APPROVED'
                    ? 'indigo'
                    : vendor.status === 'UNDER_REVIEW'
                    ? 'amber'
                    : vendor.status === 'PENDING'
                    ? 'sky'
                    : 'danger'
                }
              >
                {vendor.status}
              </Badge>
            )}
          </div>

          {vendor?.status === 'REJECTED' && vendor.rejectionReason && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>Rejected by Platform Owner: {vendor.rejectionReason}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleRegisterProfile} className="space-y-4 text-xs font-sans">
            <Input
              label="Registered Company / Entity Name"
              required
              disabled={isApproved}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Apex Hardware & Logistics Ltd"
            />
            <Input
              label="Australian Business Number (ABN 11-digits) or ACN (9-digits)"
              required
              disabled={isApproved}
              value={abnAcn}
              onChange={(e) => setAbnAcn(e.target.value)}
              placeholder="e.g. 51824753910"
              helperText="Must be exact numeric digits (e.g. 11 digits for ABN or 9 digits for ACN)."
            />
            <Input
              label="Business Registered Address"
              required
              disabled={isApproved}
              value={businessRegisteredAddress}
              onChange={(e) => setBusinessRegisteredAddress(e.target.value)}
              placeholder="e.g. 12 Industrial Ave, Eastern Creek NSW 2766"
              helperText="The official registered address on file with ASIC/ATO."
            />
            <Input
              label="Business Location (Trading Address, if different)"
              disabled={isApproved}
              value={businessLocation}
              onChange={(e) => setBusinessLocation(e.target.value)}
              placeholder="e.g. Warehouse — 45 Distribution Rd, Chullora NSW 2190"
            />

            {!isApproved ? (
              <Button type="submit" isLoading={profileSubmitting} className="w-full">
                Save &amp; Submit for Review
              </Button>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-mono flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Details Locked: Registration details can't be changed once approved. Contact Platform Support for changes.</span>
              </div>
            )}
          </form>
        </div>

        {/* Step 2: Compliance Certificate Upload */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-mono">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">Upload Compliance Documents</h3>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Each document type can only be uploaded once. Once submitted, it's locked for Platform Owner review — you won't be able to view, download, or replace it unless it's rejected. If it's rejected, you'll be able to upload a corrected file for that type.</span>
          </div>

          {fileValidationError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileValidationError}</span>
            </div>
          )}

          <form onSubmit={handleUploadDocument} className="space-y-4 text-xs font-sans">
            <Select
              label="Document Type"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              options={[
                { value: 'ATO ABN Registration Certificate', label: 'ATO ABN Registration Certificate' },
                { value: 'Public Liability Insurance Policy', label: 'Public Liability Insurance Policy' },
                { value: 'ISO Quality & Compliance Cert', label: 'ISO Quality & Compliance Cert' },
                { value: 'Trade License & Accreditation', label: 'Trade License & Accreditation' },
              ]}
            />

            {isLockedForType ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-mono flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Already submitted for this type — status: {existingDocOfType?.status}. {existingDocOfType?.status === 'PENDING' ? 'Awaiting Owner review.' : 'Locked, no further changes possible.'}</span>
              </div>
            ) : (
              <>
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
                </div>

                <Button type="submit" variant="success" isLoading={uploading} className="w-full">
                  {existingDocOfType ? 'Upload Corrected Certificate' : 'Upload Compliance Certificate'}
                </Button>
              </>
            )}
          </form>
        </div>
      </div>

      {/* Compliance Document Repository — status only, no file access from this side */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">Compliance Document Repository</h3>
          </div>
          <span className="text-xs font-mono text-slate-500 font-bold">
            {vendor?.docs?.length || 0} {(vendor?.docs?.length || 0) === 1 ? 'File' : 'Files'} Submitted
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {vendor.docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{doc.docType}</td>
                    <td className="py-3.5 px-4 text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400" /> {doc.fileName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {doc.fileSize ? (doc.fileSize / (1024 * 1024)).toFixed(2) : '1.05'} MB
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={doc.status === 'APPROVED' ? 'indigo' : doc.status === 'REJECTED' ? 'danger' : 'amber'}>
                        {doc.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vendor Product & Catalog Management (Item Master Entry Form matching Owner Console) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Product Catalog (Assigned to Your Vendor Account)</h3>
              <p className="text-xs text-slate-500 font-mono">Read-only view of the products the Platform Owner has assigned to you, with pricing and taxonomy details.</p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-2 font-sans">
          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Product Master Data is managed exclusively by the Platform Owner. Contact your account manager to add, change, or remove a catalog item.</span>
        </div>

        {/* Search Bar */}
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
            No products found in your catalog. Contact your account manager to have products added to your account.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                  <th className="py-3.5 px-4 font-bold">Item Name &amp; SKU</th>
                  <th className="py-3.5 px-4 font-bold">Category &amp; UOM</th>
                  <th className="py-3.5 px-4 font-bold">Retail Price</th>
                  <th className="py-3.5 px-4 font-bold">MOQ</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Cost of Goods</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-slate-900 text-xs">{p.itemName}</div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                            {p.sku}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">EAN: {p.barcode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="space-y-0.5">
                        <span className="inline-block text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {p.categoryName || 'General Hardware'}
                        </span>
                        <div className="text-[10px] text-slate-500">{p.uomCode || 'PCS'}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="font-bold text-slate-900">${Number(p.sellingPrice).toFixed(2)}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-800">
                      {p.moq || 1} units
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={p.status === 'ACTIVE' ? 'indigo' : p.status === 'DRAFT' ? 'amber' : 'neutral'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-700">
                      ${Number(p.costPrice || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setSelectedProduct(p); setIsProductDetailOpen(true); }}
                        leftIcon={<Eye className="w-3.5 h-3.5 text-indigo-600" />}
                      >
                        View Product Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Detail & GS1 Barcode Modal — read-only, same view the Platform Owner gets */}
      {selectedProduct && (
        <Modal
          isOpen={isProductDetailOpen}
          onClose={() => setIsProductDetailOpen(false)}
          title={`Item Master Detail & GS1 Barcode: ${selectedProduct.sku}`}
          maxWidth="3xl"
        >
          <div className="space-y-6 text-xs font-sans">
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 text-center uppercase tracking-widest font-mono">
                Scannable GS1 Barcode Label
              </div>
              <BarcodeRenderer value={selectedProduct.barcode} height={80} />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              {selectedProduct.imageUrl && (
                <div className="w-full h-48 rounded-xl overflow-hidden mb-4 border border-slate-200 bg-white flex items-center justify-center">
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.itemName} className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-base font-extrabold text-slate-900">{selectedProduct.itemName}</div>
                <Badge variant={selectedProduct.status === 'ACTIVE' ? 'indigo' : selectedProduct.status === 'DRAFT' ? 'amber' : 'neutral'}>
                  {selectedProduct.status}
                </Badge>
              </div>

              {selectedProduct.description && <div className="text-xs text-slate-600 leading-relaxed">{selectedProduct.description}</div>}

              <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-slate-200 pt-3">
                <div>
                  <span className="text-slate-400 block">SKU Code:</span>
                  <span className="font-bold text-indigo-700">{selectedProduct.sku}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Barcode EAN:</span>
                  <span className="font-bold text-slate-900">{selectedProduct.barcode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Retail Selling Price:</span>
                  <span className="font-bold text-slate-900">${Number(selectedProduct.sellingPrice).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Cost of Goods:</span>
                  <span className="font-bold text-slate-700">${Number(selectedProduct.costPrice).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Minimum Order Qty:</span>
                  <span className="font-bold text-slate-900">{selectedProduct.moq || 1} units</span>
                </div>
              </div>

              {selectedProduct.attributes && Object.keys(selectedProduct.attributes).length > 0 && (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                    Technical Specifications:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedProduct.attributes).map(([k, v]) => (
                      <span key={k} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold text-xs">
                        <span className="font-bold text-indigo-900">{k}:</span> {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedProduct.statusHistory && selectedProduct.statusHistory.length > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Lifecycle Status Change Audit History</span>
                </div>
                <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-1">
                  {selectedProduct.statusHistory.map((sh, idx) => (
                    <div key={idx} className="relative space-y-0.5">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white" />
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{sh.from} ➔ {sh.to}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(sh.changedAt).toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono">
                        Changed by <span className="font-bold">{sh.changedBy}</span> {sh.reason ? `• "${sh.reason}"` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsProductDetailOpen(false)}>
                Close Window
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Vendor Outbound Dispatch Requests & Fulfillment Tracker */}

      {/* Purchase Orders Assigned to this Vendor */}
      {vendor && vendor.status === 'APPROVED' && (
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-600" /> Procurement
            </div>
            <h3 className="text-lg font-bold text-slate-900">Purchase Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">Purchase orders assigned to your organisation. Confirm an order, then dispatch its stock from the warehouse — supply status updates automatically once you do.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">PO No.</th>
                  <th className="py-3 px-4 text-left font-bold">Linked SO</th>
                  <th className="py-3 px-4 text-left font-bold">Items</th>
                  <th className="py-3 px-4 text-right font-bold">Transport</th>
                  <th className="py-3 px-4 text-right font-bold">Total</th>
                  <th className="py-3 px-4 text-left font-bold">Payment Terms</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorPOs.map((p) => {
                  // Vendors only confirm the order itself. Supply progress (Partially Supplied /
                  // Fully Supplied) is derived automatically from dispatch activity against the
                  // linked sales order — the vendor's stock is already in the warehouse, so
                  // "supplying" happens the moment it's dispatched to the customer, not by a manual click.
                  const vendorSafeNext = (poAllowedTransitions[p.status] || []).filter((s) =>
                    ['VENDOR_CONFIRMED'].includes(s)
                  );
                  const awaitingDispatch = ['VENDOR_CONFIRMED', 'PARTIALLY_SUPPLIED'].includes(p.status);
                  const pendingTc = transportCosts.some((t) => t.status === 'PENDING_APPROVAL' && t.relatedPoNumbers.includes(p.poNumber));
                  return (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{p.poNumber}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{p.linkedSalesOrderNumber || '—'}</td>
                    <td className="py-3 px-4">
                      {(p.lines || []).map((l: any, i: number) => (
                        <div key={i} className="text-[11px]">
                          <span className="font-mono text-indigo-700 font-bold">{l.itemCode}</span> × {l.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px]">
                      {p.transportCost ? (
                        <span className="text-slate-600">{p.currency} {p.transportCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      ) : pendingTc ? (
                        <span className="text-amber-700 font-bold flex items-center justify-end gap-1"><AlertTriangle className="w-3 h-3" /> Pending approval</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{p.currency} {p.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-[11px]">{p.paymentTerms}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        p.status === 'APPROVED' || p.status === 'SENT_TO_VENDOR' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        p.status === 'VENDOR_CONFIRMED' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                        p.status === 'PARTIALLY_SUPPLIED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        p.status === 'FULLY_SUPPLIED' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        p.status === 'PAID' || p.status === 'CLOSED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>{p.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setViewPoModal(p)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600" title="View purchase order">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => window.open(`/api/purchase-orders/${p.id}/print`, '_blank')} className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600" title="Print / download purchase order">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {vendorSafeNext.length > 0 ? (
                          <select
                            value=""
                            onChange={(e) => e.target.value && advanceVendorPoStatus(p, e.target.value)}
                            className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700"
                          >
                            <option value="">Confirm Order</option>
                            {vendorSafeNext.map((s) => (
                              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                            ))}
                          </select>
                        ) : awaitingDispatch ? (
                          <span className="text-[10px] text-slate-400 italic">Awaiting dispatch</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {vendorPOs.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-400">No purchase orders assigned to your organisation.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Purchase Order — item-wise cost breakdown + print/download */}
      <Modal isOpen={!!viewPoModal} onClose={() => setViewPoModal(null)} title={`Purchase Order — ${viewPoModal?.poNumber || ''}`} maxWidth="2xl">
        {viewPoModal && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Linked Sales Order</div>
                <div className="font-extrabold text-slate-900">{viewPoModal.linkedSalesOrderNumber || '—'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Status</div>
                <div className="mt-0.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">{viewPoModal.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Payment Terms: <span className="font-bold text-slate-700">{viewPoModal.paymentTerms}</span></div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-mono uppercase">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Cost</th>
                    <th className="py-2 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewPoModal.lines || []).map((l: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 px-3">
                        <div className="font-mono font-bold text-slate-900">{l.itemCode}</div>
                        <div className="text-[11px] text-slate-500">{l.itemName}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{l.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono">{viewPoModal.currency} {l.unitCost.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{viewPoModal.currency} {l.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {viewPoModal.transportCost > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <span className="font-bold flex items-center gap-1.5"><Route className="w-3.5 h-3.5" /> Approved Transport Cost (included in total)</span>
                <span className="font-mono font-bold">{viewPoModal.currency} {viewPoModal.transportCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <div className="mr-auto text-sm font-black text-indigo-700 font-mono">
                Total: {viewPoModal.currency} {viewPoModal.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <Button type="button" variant="outline" onClick={() => setViewPoModal(null)}>Close</Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => window.open(`/api/purchase-orders/${viewPoModal.id}/print`, '_blank')}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download / Print
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transport Costs — freight claims covering multiple POs/dispatches */}
      {vendor && vendor.status === 'APPROVED' && (
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Route className="w-4 h-4 text-indigo-600" /> Freight
              </div>
              <h3 className="text-lg font-bold text-slate-900">Transport Costs</h3>
              <p className="text-xs text-slate-500 mt-0.5">A claim covers one shipment: pick the dispatch notes that went out together from one warehouse, enter the tracking number and total freight cost, and it splits across whichever POs those dispatches belong to. The Platform Owner reviews and approves before it's added to those PO totals; you can't invoice a PO until it's fully supplied and free of a pending claim.</p>
            </div>
            <Button onClick={() => setIsTcModalOpen(true)} variant="primary" leftIcon={<Plus className="w-4 h-4" />}>Submit Transport Cost</Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Claim No.</th>
                  <th className="py-3 px-4 text-left font-bold">Warehouse</th>
                  <th className="py-3 px-4 text-left font-bold">Tracking No.</th>
                  <th className="py-3 px-4 text-left font-bold">Related POs</th>
                  <th className="py-3 px-4 text-right font-bold">Total Cost</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transportCosts.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{t.transportCostNumber}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">{t.warehouseCode}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">{t.trackingNumber}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{(t.relatedPoNumbers || []).join(', ')}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{t.currency} {t.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        t.status === 'APPROVED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        t.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>{t.status.replace(/_/g, ' ')}</span>
                      {t.status === 'REJECTED' && t.rejectionReason && (
                        <div className="text-[10px] text-rose-600 mt-1 max-w-[220px]">{t.rejectionReason}</div>
                      )}
                    </td>
                  </tr>
                ))}
                {transportCosts.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No transport cost claims submitted yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Modal isOpen={isTcModalOpen} onClose={() => setIsTcModalOpen(false)} title="Submit Transport Cost Claim" maxWidth="lg">
            <form onSubmit={handleSubmitTransportCost} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">Warehouse *</label>
                <select
                  value={tcForm.warehouseCode}
                  onChange={(e) => setTcForm({ ...tcForm, warehouseCode: e.target.value, dnNumbers: [] })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="">-- Select the warehouse this shipment left from --</option>
                  {claimableWarehouses.map((wh) => (
                    <option key={wh} value={wh}>{wh}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">A claim can only cover dispatches that physically shipped together — from one warehouse.</p>
              </div>

              {tcForm.warehouseCode && (
                <div>
                  <label className="font-bold block mb-1">Dispatch Notes in This Shipment * ({dnsForSelectedWarehouse.length} available)</label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {dnsForSelectedWarehouse.map((d) => (
                      <label key={d.dispatchNumber} className="flex items-center gap-2 px-3 py-2 text-[11px] cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={tcForm.dnNumbers.includes(d.dispatchNumber)} onChange={() => toggleTcDn(d.dispatchNumber)} className="rounded border-slate-300" />
                        <span className="font-mono font-bold text-slate-900">{d.dispatchNumber}</span>
                        <span className="text-slate-500">{d.salesOrderNumber}</span>
                      </label>
                    ))}
                    {dnsForSelectedWarehouse.length === 0 && <div className="px-3 py-4 text-center text-slate-400">No un-claimed dispatched notes at this warehouse.</div>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Tracking / Consignment No. *</label>
                  <Input value={tcForm.trackingNumber} onChange={(e) => setTcForm({ ...tcForm, trackingNumber: e.target.value })} required placeholder="e.g. ST-998822-AU" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Total Transport Cost ({vendorPOs[0]?.currency || 'AUD'}) *</label>
                  <Input type="number" step="0.01" min="0.01" value={tcForm.totalCost} onChange={(e) => setTcForm({ ...tcForm, totalCost: e.target.value })} required />
                </div>
              </div>

              {tcForm.dnNumbers.length > 0 && (
                <div>
                  <label className="font-bold block mb-1">Related Purchase Orders (auto-detected from the dispatches above)</label>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                    {tcRelatedPoPreview.map((p) => (
                      <div key={p.poNumber} className="flex items-center justify-between px-3 py-2 text-[11px]">
                        <span className="font-mono font-bold text-slate-900">{p.poNumber}</span>
                        <span className="text-indigo-700 font-bold">≈ {vendorPOs[0]?.currency || 'AUD'} {p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {tcRelatedPoPreview.length === 0 && (
                      <div className="px-3 py-3 text-center text-slate-400">Couldn't match these dispatches to a purchase order.</div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold block mb-1">Notes (optional)</label>
                <Input value={tcForm.notes} onChange={(e) => setTcForm({ ...tcForm, notes: e.target.value })} placeholder="Consolidated shipment covering these three orders..." />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setIsTcModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={tcSubmitting}>{tcSubmitting ? 'Submitting...' : 'Submit for Approval'}</Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* Vendor Invoice Submission */}
      {vendor && vendor.status === 'APPROVED' && (
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Invoicing
              </div>
              <h3 className="text-lg font-bold text-slate-900">Invoice Submission</h3>
              <p className="text-xs text-slate-500 mt-0.5">Submit invoices against confirmed purchase orders. Track approval and payment status.</p>
            </div>
            <Button onClick={() => setIsViSubmitOpen(true)} variant="primary" leftIcon={<Plus className="w-4 h-4" />}>Submit Invoice</Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Invoice No.</th>
                  <th className="py-3 px-4 text-left font-bold">Linked PO</th>
                  <th className="py-3 px-4 text-right font-bold">Amount</th>
                  <th className="py-3 px-4 text-left font-bold">Due Date</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Paid</th>
                  <th className="py-3 px-4 text-left font-bold">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorInvoices.map((v) => {
                  const lastPayment = v.payments && v.payments.length > 0 ? v.payments[v.payments.length - 1] : null;
                  return (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{v.vendorInvoiceNumber}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{v.linkedPoNumber}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{v.currency} {v.invoiceAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-[11px]">{v.dueDate ? new Date(v.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        v.status === 'APPROVED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        v.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        v.status === 'PAID' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                        v.status === 'ON_HOLD' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        v.status === 'DISPUTED' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' :
                        v.status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>{v.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-700 font-bold">{v.currency} {(v.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4">
                      {lastPayment?.receiptAttachment?.fileUrl ? (
                        <a
                          href={lastPayment.receiptAttachment.fileUrl}
                          download={lastPayment.receiptAttachment.fileName}
                          className="text-[11px] text-indigo-700 font-bold hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> View
                        </a>
                      ) : (<span className="text-slate-400 text-[11px]">—</span>)}
                    </td>
                  </tr>
                  );
                })}
                {vendorInvoices.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">No invoices submitted yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Modal isOpen={isViSubmitOpen} onClose={() => setIsViSubmitOpen(false)} title="Submit Vendor Invoice" maxWidth="md">
            <form onSubmit={handleSubmitVendorInvoice} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Invoice Number *</label>
                  <Input value={viSubmitForm.vendorInvoiceNumber} onChange={(e) => setViSubmitForm({ ...viSubmitForm, vendorInvoiceNumber: e.target.value })} required placeholder="e.g. VND-INV-2026-001" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Linked PO *</label>
                  <Select
                    value={viSubmitForm.linkedPoNumber}
                    onChange={(e) => {
                      const po = vendorPOs.find((p) => p.poNumber === e.target.value);
                      setViSubmitForm({ ...viSubmitForm, linkedPoNumber: e.target.value, invoiceAmount: po?.totalValue || 0 });
                    }}
                    options={[
                      { value: '', label: '— Select PO —' },
                      ...vendorPOs.map((p) => ({ value: p.poNumber, label: `${p.poNumber} — ${p.currency} ${p.totalValue?.toLocaleString()}` })),
                    ]}
                  />
                </div>
              </div>
              {viSubmitForm.linkedPoNumber && transportCosts.some((t) => t.status === 'PENDING_APPROVAL' && t.relatedPoNumbers.includes(viSubmitForm.linkedPoNumber)) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> This PO has a transport cost claim awaiting owner approval. You cannot invoice it until that's resolved.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Invoice Amount *</label>
                  <Input type="number" step="0.01" value={viSubmitForm.invoiceAmount} onChange={(e) => setViSubmitForm({ ...viSubmitForm, invoiceAmount: e.target.value })} required />
                </div>
                <div>
                  <label className="font-bold block mb-1">Due Date *</label>
                  <Input type="date" value={viSubmitForm.dueDate} onChange={(e) => setViSubmitForm({ ...viSubmitForm, dueDate: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Invoice Attachment</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleViAttachmentUpload}
                  className="block w-full text-[11px] text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {viSubmitForm.attachment && (
                  <p className="text-[11px] text-indigo-700 font-bold mt-1">Attached: {viSubmitForm.attachment.fileName}</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setIsViSubmitOpen(false)}>Cancel</Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={viSubmitting || (!!viSubmitForm.linkedPoNumber && transportCosts.some((t) => t.status === 'PENDING_APPROVAL' && t.relatedPoNumbers.includes(viSubmitForm.linkedPoNumber)))}
                >
                  {viSubmitting ? 'Submitting...' : 'Submit Invoice'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

    </div>
  );
}
