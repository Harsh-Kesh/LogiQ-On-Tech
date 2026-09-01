'use client';

// B2B Owner-Side System Functions & Transaction Workflow (per shared spec).
// Implements the 15 owner-side functions from LogiQ-On_Tech_Owner_Side_System_Functions.docx + customer payments.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ItemPicker } from '@/components/ui/ItemPicker';
import { QuickAddCustomerModal } from '@/components/customer-master/QuickAddCustomerModal';
import { Toast } from '@/components/ui/Toast';
import {
  ShoppingCart, ClipboardList, Truck, FileText, Send,
  Building, Receipt, DollarSign, Landmark, Plus,
  ArrowRight, CheckCircle2, TrendingUp, Search, RefreshCw, CreditCard,
  Trash2, Printer, Paperclip, Box, UploadCloud, ShieldCheck, FileCheck, X, Download, MapPin, Eye,
  AlertTriangle, Wallet, Edit2, Route,
} from 'lucide-react';

type Tab = 'so' | 'dispatch' | 'invoice' | 'po' | 'vinv' | 'vpay' | 'transport' | 'outstanding';

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    CONFIRMED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    STOCK_CHECK: 'bg-purple-50 text-purple-700 border-purple-200',
    ALLOCATED: 'bg-teal-50 text-teal-700 border-teal-200',
    PARTIALLY_ALLOCATED: 'bg-amber-50 text-amber-700 border-amber-200',
    PARTIALLY_DISPATCHED: 'bg-amber-50 text-amber-700 border-amber-200',
    READY_FOR_DISPATCH: 'bg-blue-50 text-blue-700 border-blue-200',
    DISPATCHED: 'bg-blue-100 text-blue-800 border-blue-300',
    DELIVERED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    INVOICED: 'bg-sky-50 text-sky-700 border-sky-200',
    SENT: 'bg-sky-50 text-sky-700 border-sky-200',
    SENT_TO_VENDOR: 'bg-sky-50 text-sky-700 border-sky-200',
    VENDOR_CONFIRMED: 'bg-teal-50 text-teal-700 border-teal-200',
    APPROVED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    DISPUTED: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
    PARTIALLY_PAID: 'bg-orange-50 text-orange-700 border-orange-200',
    PAYMENT_PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    COMPLETED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    CLOSED: 'bg-slate-200 text-slate-700 border-slate-300',
    CANCELLED: 'bg-slate-200 text-slate-600 border-slate-300',
    OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
    SUBMITTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    UNDER_REVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
    CONFIRMED_PAY: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    REVERSED: 'bg-rose-100 text-rose-800 border-rose-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[s] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>{s.replace(/_/g, ' ')}</span>;
}

export default function B2BOwnerOrdersPage() {
  const [tab, setTab] = useState<Tab>('so');
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<any[]>([]);
  const [dispatchNotes, setDispatchNotes] = useState<any[]>([]);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [transportCosts, setTransportCosts] = useState<any[]>([]);
  const [rejectTcModal, setRejectTcModal] = useState<any | null>(null);
  const [rejectTcReason, setRejectTcReason] = useState('');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [vendorMaster, setVendorMaster] = useState<any[]>([]);
  const [customerMaster, setCustomerMaster] = useState<any[]>([]);
  const [isQuickAddCustomerOpen, setIsQuickAddCustomerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [isSoModalOpen, setIsSoModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isCiModalOpen, setIsCiModalOpen] = useState(false);
  const [isViModalOpen, setIsViModalOpen] = useState(false);
  const [isVpModalOpen, setIsVpModalOpen] = useState(false);
  const [isCpModalOpen, setIsCpModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<any | null>(null);
  const [cpTarget, setCpTarget] = useState<any | null>(null);
  const [deliveryModalDn, setDeliveryModalDn] = useState<any>(null);
  const [podViewerDn, setPodViewerDn] = useState<any>(null);
  const [sendInvoiceModalCi, setSendInvoiceModalCi] = useState<any | null>(null);
  const [viewInvoiceModalCi, setViewInvoiceModalCi] = useState<any | null>(null);
  const [paymentHistoryModalCi, setPaymentHistoryModalCi] = useState<any | null>(null);
  const [receiptViewerCp, setReceiptViewerCp] = useState<any | null>(null);
  const [sendEmailForm, setSendEmailForm] = useState({
    to: '',
    cc: 'accounts@logiqon.com',
    subject: '',
    message: '',
  });
  const [viewPoModal, setViewPoModal] = useState<any | null>(null);
  const [viewSoModal, setViewSoModal] = useState<any | null>(null);
  const [viewTcModal, setViewTcModal] = useState<any | null>(null);
  const [editPoModal, setEditPoModal] = useState<any | null>(null);
  const [poEditForm, setPoEditForm] = useState({ requestedDeliveryDate: '', paymentTerms: '', notes: '' });
  const [poEditSubmitting, setPoEditSubmitting] = useState(false);

  // Outstanding Payments report filters
  const [outstandingType, setOutstandingType] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [outstandingFrom, setOutstandingFrom] = useState('');
  const [outstandingTo, setOutstandingTo] = useState('');
  const [outstandingOverdueOnly, setOutstandingOverdueOnly] = useState(false);
  const [outstandingSearch, setOutstandingSearch] = useState('');
  const [deliveryForm, setDeliveryForm] = useState<any>({
    receiverName: '',
    deliveryDateTime: new Date().toISOString().substring(0, 16),
    podReference: '',
    comments: '',
    attachment: null,
    lines: [],
  });
  
  const [soSearch, setSoSearch] = useState('');
  const [soStatusFilter, setSoStatusFilter] = useState('');

  const [soForm, setSoForm] = useState<any>({
    customerName: '', customerEmail: '', customerPoReference: '', deliveryLocation: '', requestedDeliveryDate: '',
    paymentTerms: 'Net 30', incoterms: 'EXW', currency: 'AUD',

    lines: [{ itemCode: '', itemName: '', description: '', quantity: 1, sellingPrice: 0, taxPercent: 10 }],
  });
  const [poForm, setPoForm] = useState<any>({
    vendorName: '', requestedDeliveryDate: '',
    paymentTerms: 'Net 30', currency: 'AUD', leadTimeDays: 14,
    lines: [{ itemCode: '', itemName: '', quantity: 1, unitCost: 0, taxPercent: 10 }],
  });
  const [ciForm, setCiForm] = useState<any>({
    salesOrderNumber: '', dispatchNumber: '', customerName: '', customerEmail: '', billingAddress: '',
    dueDate: '', currency: 'AUD',
    lines: [{ itemCode: '', itemName: '', quantity: 1, unitPrice: 0, taxPercent: 10 }],
  });
  const [viForm, setViForm] = useState<any>({
    vendorInvoiceNumber: '', linkedPoNumber: '', vendorName: '',
    invoiceDate: '', dueDate: '', invoiceAmount: 0, currency: 'AUD',
    attachment: null as { fileName: string; fileUrl: string } | null,
  });
  const [vpForm, setVpForm] = useState<any>({
    paymentDate: new Date().toISOString().slice(0, 10),
    amountPaid: 0, paymentMethod: 'EFT', bankReferenceNumber: '', comments: '',
    receiptAttachment: null as { fileName: string; fileUrl: string } | null,
  });
  const [cpForm, setCpForm] = useState<any>({
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: 0, paymentMethod: 'EFT', bankReference: '', notes: '', receiptFileName: '', receiptAttachment: null,
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [so, po, ci, vi, dn, wh, ad, mi, vm, cm, cp, tc] = await Promise.all([
        fetch('/api/sales-orders').then((r) => r.json()),
        fetch('/api/purchase-orders').then((r) => r.json()),
        fetch('/api/customer-invoices').then((r) => r.json()),
        fetch('/api/vendor-invoices').then((r) => r.json()),
        fetch('/api/dispatch-notes').then((r) => r.json()),
        fetch('/api/inventory/warehouses').then((r) => r.json()),
        fetch('/api/audit?module=GOVERNANCE&limit=25').then((r) => r.json()).catch(() => ({ logs: [] })),
        fetch('/api/mdm/items').then((r) => r.json()).catch(() => ({ items: [] })),
        fetch('/api/mdm/vendor-master').then((r) => r.json()).catch(() => ({ records: [] })),
        fetch('/api/mdm/customer-master').then((r) => r.json()).catch(() => ({ records: [] })),
        fetch('/api/customer-payments').then((r) => r.json()).catch(() => ({ customerPayments: [] })),
        fetch('/api/transport-costs').then((r) => r.json()).catch(() => ({ transportCosts: [] })),
      ]);
      setSalesOrders(so.salesOrders || []);
      setPurchaseOrders(po.purchaseOrders || []);
      setCustomerInvoices(ci.customerInvoices || []);
      setVendorInvoices(vi.vendorInvoices || []);
      setDispatchNotes(dn.dispatchNotes || []);
      setWarehouses(wh.warehouses || []);
      setAudit(ad.logs || ad.auditLogs || []);
      setItems(mi.items || []);
      setVendorMaster(vm.records || []);
      setCustomerMaster(cm.records || []);
      setCustomerPayments(cp.customerPayments || []);
      setTransportCosts(tc.transportCosts || []);
    } catch (e) {
      setToast({ msg: 'Failed to load some data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Advanced Allocation Modal state
  const [allocModalSo, setAllocModalSo] = useState<any | null>(null);
  const [allocWhCode, setAllocWhCode] = useState<string>('');
  const [allocWhStock, setAllocWhStock] = useState<any[]>([]);
  const [allocLines, setAllocLines] = useState<Record<string, number>>({});

  // Dispatch Note Creation Modal state
  const [createDnModalSo, setCreateDnModalSo] = useState<any | null>(null);
  const [createDnForm, setCreateDnForm] = useState({
    warehouseCode: '',
    expectedDeliveryDate: '',
    comments: ''
  });

  // A Sales Order's allocation can span multiple warehouses, each shipping on its own
  // Dispatch Note — this is every allocated warehouse for the order that doesn't have
  // one yet, so the "Create Dispatch Note" flow stays reachable for warehouse 2 (and 3,
  // ...) instead of disappearing the moment warehouse 1's note is created.
  const getUncoveredWarehouses = (so: any): string[] => {
    const allocatedWhs = new Set<string>(
      (so.lines || []).flatMap((l: any) => (l.allocatedWarehouses || []).map((w: any) => w.warehouseCode))
    );
    const coveredWhs = new Set(
      dispatchNotes.filter((d) => d.salesOrderNumber === so.salesOrderNumber && d.status !== 'CANCELLED').map((d) => d.warehouseCode)
    );
    return Array.from(allocatedWhs).filter((wh) => !coveredWhs.has(wh));
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createDnModalSo || !createDnForm.warehouseCode) return;
    try {
      // Find the lines allocated to the selected warehouse
      const allocatedLines = createDnModalSo.lines.map((l: any) => {
        const alloc = l.allocatedWarehouses?.find((w: any) => w.warehouseCode === createDnForm.warehouseCode);
        if (!alloc) return null;
        return {
          itemCode: l.itemCode,
          itemName: l.itemName,
          orderedQty: l.quantity,
          pickedQty: 0,
          dispatchQty: alloc.qty,
          deliveredQty: 0
        };
      }).filter(Boolean);

      if (allocatedLines.length === 0) {
        setToast({ msg: 'No lines allocated for the selected warehouse.', type: 'error' });
        return;
      }

      const res = await fetch('/api/dispatch-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesOrderNumber: createDnModalSo.salesOrderNumber,
          salesOrderId: createDnModalSo.id,
          customerName: createDnModalSo.customerName,
          customerAddress: createDnModalSo.deliveryLocation,
          warehouseCode: createDnForm.warehouseCode,
          expectedDeliveryDate: createDnForm.expectedDeliveryDate,
          comments: createDnForm.comments,
          lines: allocatedLines
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create Dispatch Note.');
      setToast({ msg: 'Dispatch Note created successfully.', type: 'success' });
      setCreateDnModalSo(null);
      setCreateDnForm({ warehouseCode: '', expectedDeliveryDate: '', comments: '' });
      loadAll();
      setTab('dispatch');
    } catch (err: any) {
      setToast({ msg: err.message, type: 'error' });
    }
  };

  const openAllocationModal = (so: any) => {
    setAllocModalSo(so);
    setAllocWhCode('');
    setAllocWhStock([]);
    setAllocLines({});
  };

  const loadWhStockForAlloc = async (whCode: string) => {
    setAllocWhCode(whCode);
    setAllocLines({});
    if (!whCode) return;
    try {
      const res = await fetch(`/api/inventory/stock?warehouse=${whCode}`);
      const data = await res.json();
      setAllocWhStock(data.stock || []);
    } catch (err) {
      setToast({ msg: 'Failed to load stock data', type: 'error' });
    }
  };



  const openSendModal = (c: any) => {
    setSendInvoiceModalCi(c);
    setSendEmailForm({
      to: c.customerEmail || '',
      cc: 'accounts@logiqon.com',
      subject: `Tax Invoice ${c.invoiceNumber} from LogiQ-On Tech — ${c.salesOrderNumber}`,
      message: `Dear ${c.customerName},\n\nPlease find attached Tax Invoice ${c.invoiceNumber} for ${c.currency} ${c.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })} regarding Sales Order ${c.salesOrderNumber}.\n\nPayment Terms: Net 30 Days\nDue Date: ${new Date(c.dueDate).toLocaleDateString('en-AU')}\n\nPlease remit payment via EFT to our nominated bank account as outlined on the invoice remittance advice.\n\nBest regards,\nLogiQ-On Tech Finance Team\nbilling@logiqon.com`,
    });
  };

  const submitSendInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendInvoiceModalCi) return;
    try {
      const res = await fetch(`/api/customer-invoices/${sendInvoiceModalCi.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: sendEmailForm.to,
          cc: sendEmailForm.cc,
          subject: sendEmailForm.subject,
          message: sendEmailForm.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invoice.');
      const recipientCount = (data.results || []).length;
      const failed = (data.results || []).filter((r: any) => !r.success);
      setToast({
        msg: failed.length > 0
          ? `Sent to ${recipientCount - failed.length}/${recipientCount} recipients — failed: ${failed.map((f: any) => f.to).join(', ')}`
          : `Sales Invoice ${sendInvoiceModalCi.invoiceNumber} sent individually to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}.`,
        type: failed.length > 0 ? 'error' : 'success',
      });
      setSendInvoiceModalCi(null);
      loadAll();
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to send invoice', type: 'error' });
    }
  };

  const openDeliveryModal = (r: any) => {
    setDeliveryModalDn(r);
    const defaultLines = (r.lines || []).map((l: any) => ({
      ...l,
      deliveredQty: l.deliveredQty || l.dispatchQty || l.orderedQty || 1,
      condition: 'GOOD',
    }));
    setDeliveryForm({
      receiverName: r.receiverName || '',
      deliveryDateTime: r.actualDeliveryDate ? r.actualDeliveryDate.substring(0, 16) : new Date().toISOString().substring(0, 16),
      podReference: r.podReference || (r.attachment?.fileName || ''),
      comments: r.comments || '',
      attachment: r.attachment || null,
      lines: defaultLines,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ msg: 'File size exceeds 5MB limit.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setDeliveryForm((prev: any) => ({
        ...prev,
        podReference: prev.podReference || file.name,
        attachment: {
          fileName: file.name,
          fileData: base64Data,
          fileType: file.type,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          uploadedAt: new Date().toISOString(),
        },
      }));
      setToast({ msg: `Attached ${file.name} successfully.`, type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const submitDeliveryPOD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryModalDn) return;
    if (!deliveryForm.attachment) {
      setToast({ msg: 'Attach the customer-emailed Proof of Delivery (POD) file before confirming delivery.', type: 'error' });
      return;
    }
    try {
      const res = await fetch(`/api/dispatch-notes/${deliveryModalDn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DELIVERED',
          actualDeliveryDate: new Date(deliveryForm.deliveryDateTime).toISOString(),
          receiverName: deliveryForm.receiverName,
          podReference: deliveryForm.podReference || deliveryForm.attachment?.fileName || 'POD-SIGNED-CONFIRMED',
          attachment: deliveryForm.attachment,
          comments: deliveryForm.comments,
          lines: deliveryForm.lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delivery confirmation failed.');
      setToast({ msg: `Delivery confirmed for ${deliveryModalDn.dispatchNumber}. Proof of Delivery locked!`, type: 'success' });
      setDeliveryModalDn(null);
      loadAll();
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to confirm delivery.', type: 'error' });
    }
  };

  const handleAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocModalSo || !allocWhCode) return;
    try {
      const res = await fetch(`/api/sales-orders/${allocModalSo.id}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseCode: allocWhCode, allocations: allocLines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to allocate.');
      const poNote = (data.generatedPurchaseOrders || []).length > 0
        ? ` ${data.generatedPurchaseOrders.map((p: any) => `${p.action === 'created' ? 'Purchase Order' : 'Updated PO'} ${p.poNumber} for ${p.vendorName}`).join('; ')}.`
        : '';
      setToast({ msg: `Allocation applied successfully.${poNote}`, type: 'success' });
      setAllocModalSo(null);
      loadAll();
    } catch (err: any) {
      setToast({ msg: err.message, type: 'error' });
    }
  };

  useEffect(() => { loadAll(); }, []);

  const fetchAllowed = async (entity: string, from: string): Promise<string[]> => {
    try {
      const res = await fetch(`/api/lifecycle?entity=${entity}&from=${from}`);
      const data = await res.json();
      return data.allowed || [];
    } catch { return []; }
  };

  const uniqueCustomers = [...new Set(customerMaster.map((c: any) => c.customerName))];
  const uniqueVendors = [...new Set(vendorMaster.map((v: any) => v.vendorName))];

  // After creating a customer inline from the Create Sales Order modal, refresh the
  // customer master list and auto-select the new customer so the SO flow continues
  // without the user having to reopen the dropdown themselves.
  const handleQuickAddCustomerCreated = async (customerName: string) => {
    setIsQuickAddCustomerOpen(false);
    try {
      const res = await fetch('/api/mdm/customer-master');
      const data = await res.json();
      const records = data.records || [];
      setCustomerMaster(records);
      const matchingRec = records.find((c: any) => c.customerName === customerName);
      setSoForm((prev: any) => ({
        ...prev,
        customerName,
        paymentTerms: matchingRec?.paymentTerms || prev.paymentTerms || 'Net 30',
        lines: [{ itemCode: '', itemName: '', description: '', quantity: matchingRec?.moq || 1, sellingPrice: 0, taxPercent: 10, moq: matchingRec?.moq || 1 }],
      }));
      setToast({ msg: `Customer "${customerName}" created and selected.`, type: 'success' });
    } catch {
      setToast({ msg: 'Customer created, but the list failed to refresh — please select it manually.', type: 'error' });
    }
  };

  const submitSo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sales-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...soForm, status: 'CONFIRMED' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Sales order ${data.salesOrder.salesOrderNumber} created.`, type: 'success' });
      setSoForm({
        customerName: '',
        customerEmail: '',

        customerPoReference: '',
        deliveryLocation: '',
        requestedDeliveryDate: '',
        paymentTerms: 'Net 30',
        incoterms: 'EXW',
        currency: 'AUD',
        lines: [{ itemCode: '', itemName: '', description: '', quantity: 1, sellingPrice: 0, taxPercent: 10 }],
      });
      setIsSoModalOpen(false);
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to create sales order.', type: 'error' }); }
  };

  const submitPo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...poForm, status: 'APPROVED' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Purchase order ${data.purchaseOrder.poNumber} created.`, type: 'success' });
      setIsPoModalOpen(false);
      setPoForm({
        vendorName: '', requestedDeliveryDate: '',
        paymentTerms: 'Net 30', currency: 'AUD', leadTimeDays: 14,
        lines: [{ itemCode: '', itemName: '', quantity: 1, unitCost: 0, taxPercent: 10 }],
      });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to create purchase order.', type: 'error' }); }
  };

  const submitCi = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customer-invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ciForm, status: 'APPROVED' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Sales invoice ${data.customerInvoice.invoiceNumber} created.`, type: 'success' });
      setIsCiModalOpen(false);
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to create invoice.', type: 'error' }); }
  };

  const sendInvoice = async (inv: any) => {
    try {
      const res = await fetch('/api/customer-invoices', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inv.id, status: 'SENT', sentAt: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Invoice ${inv.invoiceNumber} sent to ${inv.customerEmail || inv.customerName}.`, type: 'success' });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to send invoice.', type: 'error' }); }
  };

  const handleViAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast({ msg: 'Attachment file size exceeds 5MB limit.', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setViForm((prev: any) => ({
        ...prev,
        attachment: { fileName: file.name, fileUrl: reader.result as string },
      }));
      setToast({ msg: `Attached: ${file.name}`, type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const submitVi = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body: any = { ...viForm, status: 'SUBMITTED' };
      const res = await fetch('/api/vendor-invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Vendor invoice ${data.vendorInvoice.vendorInvoiceNumber} registered.`, type: 'success' });
      setIsViModalOpen(false);
      setViForm({ vendorInvoiceNumber: '', linkedPoNumber: '', vendorName: '', invoiceDate: '', dueDate: '', invoiceAmount: 0, currency: 'AUD', attachment: null });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to register vendor invoice.', type: 'error' }); }
  };

  const handleVpReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast({ msg: 'Receipt file size exceeds 5MB limit.', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setVpForm((prev: any) => ({ ...prev, receiptAttachment: { fileName: file.name, fileUrl: reader.result as string } }));
      setToast({ msg: `Attached: ${file.name}`, type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const submitVpay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    if (!vpForm.receiptAttachment) {
      setToast({ msg: 'Attach the payment receipt before confirming.', type: 'error' });
      return;
    }
    try {
      const res = await fetch('/api/vendor-invoices', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payTarget.id, recordPayment: true,
          paymentDate: new Date(vpForm.paymentDate).toISOString(),
          amountPaid: Number(vpForm.amountPaid),
          paymentMethod: vpForm.paymentMethod,
          bankReferenceNumber: vpForm.bankReferenceNumber,
          comments: vpForm.comments,
          receiptAttachment: vpForm.receiptAttachment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Payment of ${data.vendorInvoice.currency} ${vpForm.amountPaid} recorded.`, type: 'success' });
      setIsVpModalOpen(false); setPayTarget(null);
      setVpForm({ paymentDate: new Date().toISOString().slice(0, 10), amountPaid: 0, paymentMethod: 'EFT', bankReferenceNumber: '', comments: '', receiptAttachment: null });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to record vendor payment.', type: 'error' }); }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast({ msg: 'Receipt file size exceeds 5MB limit.', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setCpForm((prev: any) => ({
        ...prev,
        receiptFileName: file.name,
        receiptAttachment: {
          fileName: file.name,
          fileData: base64Data,
          fileType: file.type,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          uploadedAt: new Date().toISOString(),
        },
      }));
      setToast({ msg: `Attached receipt: ${file.name}`, type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const submitCpay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpTarget) return;
    try {
      const res = await fetch('/api/customer-payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerInvoiceId: cpTarget.id,
          paymentDate: new Date(cpForm.paymentDate).toISOString(),
          amount: Number(cpForm.amount),
          paymentMethod: cpForm.paymentMethod,
          bankReference: cpForm.bankReference,
          notes: cpForm.notes,
          receiptFileName: cpForm.receiptFileName || undefined,
          receiptAttachment: cpForm.receiptAttachment || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Payment ${data.payment.paymentNumber} recorded — ${cpTarget.currency} ${cpForm.amount}.`, type: 'success' });
      setIsCpModalOpen(false); setCpTarget(null);
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to record customer payment.', type: 'error' }); }
  };

  const approveVi = async (vi: any, status: 'APPROVED' | 'REJECTED' | 'ON_HOLD' | 'DISPUTED') => {
    try {
      const res = await fetch('/api/vendor-invoices', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: vi.id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Vendor invoice ${vi.vendorInvoiceNumber} → ${status}`, type: 'success' });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to update vendor invoice status.', type: 'error' }); }
  };

  const [soAllowed, setSoAllowed] = useState<Record<string, string[]>>({});
  const [poAllowed, setPoAllowed] = useState<Record<string, string[]>>({});
  const advanceSoStatus = async (so: any, next: string, overrideReason?: string) => {
    // Skipping a Sales Order past PARTIALLY_DISPATCHED means at least one warehouse's
    // allocated share hasn't actually shipped — the API requires a stated reason for
    // that (e.g. insufficient stock), so ask for it up front rather than round-tripping
    // on a 400.
    if (so.status === 'PARTIALLY_DISPATCHED' && ['READY_FOR_DISPATCH', 'DISPATCHED'].includes(next) && !overrideReason) {
      const uncovered = getUncoveredWarehouses(so);
      const reason = window.prompt(
        uncovered.length > 0
          ? `${uncovered.join(', ')} still ${uncovered.length === 1 ? 'has' : 'have'} no dispatch note for this order. Enter a reason to move it forward anyway (e.g. "Insufficient stock at ${uncovered[0]}"):`
          : 'Not every dispatch note for this order has shipped yet. Enter a reason to move it forward anyway:'
      );
      if (!reason || !reason.trim()) return;
      overrideReason = reason.trim();
    }
    try {
      const res = await fetch(`/api/sales-orders/${so.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, overrideReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Sales order ${so.salesOrderNumber} → ${next.replace(/_/g, ' ')}`, type: 'success' });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to update sales order status.', type: 'error' }); }
  };

  useEffect(() => {
    const load = async () => {
      const map: Record<string, string[]> = {};
      for (const so of salesOrders) {
        if (!map[so.status]) {
          map[so.status] = await fetchAllowed('SALES_ORDER', so.status);
        }
      }
      setSoAllowed(map);
    };
    if (salesOrders.length > 0) load();
  }, [salesOrders]);

  const advancePoStatus = async (po: any, next: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Purchase order ${po.poNumber} → ${next.replace(/_/g, ' ')}`, type: 'success' });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to update purchase order status.', type: 'error' }); }
  };

  const approveTransportCost = async (tc: any) => {
    if (!window.confirm(`Approve transport cost ${tc.transportCostNumber} (${tc.currency} ${tc.totalCost.toFixed(2)})? This will add the allocated share to each related PO's total immediately.`)) return;
    try {
      const res = await fetch(`/api/transport-costs/${tc.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Transport cost ${tc.transportCostNumber} approved and applied to ${tc.relatedPoNumbers.length} PO(s).`, type: 'success' });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to approve.', type: 'error' }); }
  };

  const submitRejectTransportCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTcModal) return;
    try {
      const res = await fetch(`/api/transport-costs/${rejectTcModal.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', reason: rejectTcReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Transport cost ${rejectTcModal.transportCostNumber} rejected.`, type: 'success' });
      setRejectTcModal(null);
      setRejectTcReason('');
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to reject.', type: 'error' }); }
  };

  // Only the commercial terms (delivery date, payment terms, notes) are editable —
  // line quantities and unit costs are derived from Sales Order allocation and vendor
  // pricing, and downstream supply-status/reconciliation logic depends on them staying
  // exactly as generated, so those are intentionally never exposed here.
  const submitPoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPoModal) return;
    setPoEditSubmitting(true);
    try {
      const res = await fetch(`/api/purchase-orders/${editPoModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedDeliveryDate: poEditForm.requestedDeliveryDate ? new Date(poEditForm.requestedDeliveryDate).toISOString() : undefined,
          paymentTerms: poEditForm.paymentTerms,
          notes: poEditForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update purchase order.');
      setToast({ msg: `Purchase order ${editPoModal.poNumber} updated.`, type: 'success' });
      setEditPoModal(null);
      loadAll();
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to update purchase order.', type: 'error' });
    } finally {
      setPoEditSubmitting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const map: Record<string, string[]> = {};
      for (const po of purchaseOrders) {
        if (!map[po.status]) {
          map[po.status] = await fetchAllowed('PURCHASE_ORDER', po.status);
        }
      }
      setPoAllowed(map);
    };
    if (purchaseOrders.length > 0) load();
  }, [purchaseOrders]);

  const voidInvoice = async (inv: any) => {
    if (!window.confirm(`Void invoice ${inv.invoiceNumber}? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/customer-invoices', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inv.id, status: 'VOID' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Invoice ${inv.invoiceNumber} voided.`, type: 'success' });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to void invoice.', type: 'error' }); }
  };

  const reversePayment = async (payment: any) => {
    const reason = window.prompt(`Reason for reversing payment ${payment.paymentNumber}:`);
    if (!reason) return;
    try {
      const res = await fetch('/api/customer-payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reverse: true, paymentId: payment.id, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Payment ${payment.paymentNumber} reversed.`, type: 'success' });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed to reverse payment.', type: 'error' }); }
  };

  const populateCiFromSo = (soNumber: string) => {
    const so = salesOrders.find((s) => s.salesOrderNumber === soNumber);
    if (so) {
      const linkedDn = dispatchNotes.find((d) => d.salesOrderNumber === so.salesOrderNumber);
      setCiForm((prev: any) => ({
        ...prev,
        salesOrderNumber: so.salesOrderNumber,
        customerName: so.customerName,
        customerEmail: so.customerEmail || '',
        billingAddress: so.deliveryLocation || '',
        currency: so.currency,
        dispatchNumber: linkedDn?.dispatchNumber || '',
        lines: so.lines.map((l: any) => ({
          itemCode: l.itemCode, itemName: l.itemName,
          quantity: l.quantity, unitPrice: l.sellingPrice, taxPercent: l.taxPercent,
        })),
      }));
    }
  };

  // Outstanding Payments — a single cross-cutting view over both sides of the ledger:
  // money customers still owe LogiQ (receivables, from Customer Invoices) and money
  // LogiQ still owes vendors (payables, from Vendor Invoices). Normalized to one shape
  // so both can be filtered, sorted and reported on together.
  type OutstandingRow = {
    type: 'RECEIVABLE' | 'PAYABLE';
    id: string;
    docNumber: string;
    counterparty: string;
    dueDate: string;
    currency: string;
    total: number;
    paid: number;
    outstanding: number;
    status: string;
  };

  const allOutstandingRows: OutstandingRow[] = [
    ...customerInvoices
      .filter((c) => !['PAID', 'VOID'].includes(c.status) && (c.totalValue - (c.amountPaid || 0)) > 0.005)
      .map((c) => ({
        type: 'RECEIVABLE' as const,
        id: c.id,
        docNumber: c.invoiceNumber,
        counterparty: c.customerName,
        dueDate: c.dueDate,
        currency: c.currency,
        total: c.totalValue,
        paid: c.amountPaid || 0,
        outstanding: Math.max(0, c.totalValue - (c.amountPaid || 0)),
        status: c.status,
      })),
    ...vendorInvoices
      .filter((v) => !['PAID', 'VOID', 'REJECTED'].includes(v.status) && (v.invoiceAmount - (v.amountPaid || 0)) > 0.005)
      .map((v) => ({
        type: 'PAYABLE' as const,
        id: v.id,
        docNumber: v.vendorInvoiceNumber,
        counterparty: v.vendorName,
        dueDate: v.dueDate,
        currency: v.currency,
        total: v.invoiceAmount,
        paid: v.amountPaid || 0,
        outstanding: Math.max(0, v.invoiceAmount - (v.amountPaid || 0)),
        status: v.status,
      })),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const outstandingRows = allOutstandingRows.filter((r) => {
    if (outstandingType !== 'ALL' && r.type !== outstandingType) return false;
    if (outstandingFrom && new Date(r.dueDate) < new Date(outstandingFrom)) return false;
    if (outstandingTo && new Date(r.dueDate) > new Date(outstandingTo + 'T23:59:59')) return false;
    if (outstandingOverdueOnly && new Date(r.dueDate) >= new Date()) return false;
    if (outstandingSearch) {
      const q = outstandingSearch.toLowerCase();
      if (!r.docNumber.toLowerCase().includes(q) && !r.counterparty.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const outstandingTotals = outstandingRows.reduce(
    (acc, r) => {
      if (r.type === 'RECEIVABLE') acc.receivable += r.outstanding;
      else acc.payable += r.outstanding;
      if (new Date(r.dueDate) < new Date()) acc.overdueCount += 1;
      return acc;
    },
    { receivable: 0, payable: 0, overdueCount: 0 }
  );

  const exportOutstandingCSV = () => {
    const headers = ['Type', 'Document No.', 'Counterparty', 'Due Date', 'Days Overdue', 'Total', 'Paid', 'Outstanding', 'Status', 'Currency'];
    const rows = outstandingRows.map((r) => {
      const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(r.dueDate).getTime()) / 86400000));
      return [
        r.type,
        r.docNumber,
        `"${r.counterparty.replace(/"/g, '""')}"`,
        new Date(r.dueDate).toLocaleDateString('en-AU'),
        daysOverdue,
        r.total.toFixed(2),
        r.paid.toFixed(2),
        r.outstanding.toFixed(2),
        r.status,
        r.currency,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LogiQ-On_Outstanding_Payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: Tab; label: string; icon: any; count?: number }> = [
    { id: 'so', label: 'Sales Orders', icon: ShoppingCart, count: salesOrders.length },
    { id: 'dispatch', label: 'Dispatch', icon: Truck, count: dispatchNotes.length },
    { id: 'invoice', label: 'Invoices', icon: FileText, count: customerInvoices.length },
    { id: 'po', label: 'Purchase Orders', icon: Building, count: purchaseOrders.length },
    { id: 'vinv', label: 'Vendor Invoices', icon: Receipt, count: vendorInvoices.length },
    { id: 'vpay', label: 'Vendor Payments', icon: DollarSign },
    { id: 'transport', label: 'Transport Costs', icon: Route, count: transportCosts.filter((t) => t.status === 'PENDING_APPROVAL').length || undefined },
    { id: 'outstanding', label: 'Outstanding', icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-indigo-600" /> Order Management
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Sales Order → Allocation → Dispatch → Invoice → Payment. Purchase Order → Vendor Invoice → Vendor Payment.
        </p>
      </div>

      <div className="flex items-center gap-1 flex-wrap bg-white p-1.5 rounded-2xl border border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                active ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {typeof t.count === 'number' && (
                <span className={`text-[10px] font-mono px-1.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sales Orders (#1 + #2) */}
      {tab === 'so' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Sales Order List & Status</h2>
              <p className="text-[11px] text-slate-500">Customer, PO reference, items, quantities, delivery date and lifecycle status.</p>
            </div>
            <Button onClick={() => setIsSoModalOpen(true)} variant="primary" leftIcon={<Plus className="w-4 h-4" />}>Create Sales Order</Button>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 font-sans mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search Sales Order No., Customer, PO Ref..."
                  value={soSearch}
                  onChange={(e) => setSoSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                />
              </div>
              <Select
                value={soStatusFilter}
                onChange={(e) => setSoStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'CONFIRMED', label: 'Confirmed' },
                  { value: 'STOCK_CHECK', label: 'Stock Check' },
                  { value: 'PARTIALLY_ALLOCATED', label: 'Partially Allocated' },
                  { value: 'ALLOCATED', label: 'Allocated' },
                  { value: 'READY_FOR_DISPATCH', label: 'Ready for Dispatch' },
                  { value: 'DISPATCHED', label: 'Dispatched' },
                  { value: 'DELIVERED', label: 'Delivered' },
                  { value: 'INVOICED', label: 'Invoiced' },
                  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                  { value: 'PAID', label: 'Paid' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">SO No.</th>
                  <th className="py-3 px-4 text-left font-bold">Customer / PO</th>
                  <th className="py-3 px-4 text-left font-bold">Items</th>
                  <th className="py-3 px-4 text-right font-bold">Total</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-left font-bold">Next Action</th>
                  <th className="py-3 px-4 text-right font-bold">Advance</th>
                  <th className="py-3 px-4 text-center font-bold">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesOrders.filter((s) => {
                  const searchMatches = !soSearch ||
                    s.salesOrderNumber.toLowerCase().includes(soSearch.toLowerCase()) ||
                    s.customerName.toLowerCase().includes(soSearch.toLowerCase()) ||
                    (s.customerPoReference && s.customerPoReference.toLowerCase().includes(soSearch.toLowerCase()));
                  const statusMatches = !soStatusFilter || s.status === soStatusFilter;
                  return searchMatches && statusMatches;
                }).map((s) => {
                  const allowed = soAllowed[s.status] || [];
                  const nextAction: { label: string; action?: () => void; style: string; confirm?: string } = (() => {
                    switch (s.status) {
                      case 'DRAFT':
                        return { label: 'Confirm Order', action: () => advanceSoStatus(s, 'CONFIRMED'), style: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
                      case 'CONFIRMED':
                      case 'STOCK_CHECK':
                        return { label: 'Allocate Stock', action: () => openAllocationModal(s), style: 'bg-teal-50 text-teal-700 border-teal-200' };
                      case 'PARTIALLY_ALLOCATED':
                        return { label: 'Allocate Remaining', action: () => openAllocationModal(s), style: 'bg-amber-50 text-amber-700 border-amber-200' };
                      case 'ALLOCATED':
                        return { label: 'Create Dispatch Note', action: () => setCreateDnModalSo(s), style: 'bg-blue-50 text-blue-700 border-blue-200' };
                      case 'PARTIALLY_DISPATCHED': {
                        const uncovered = getUncoveredWarehouses(s);
                        return uncovered.length > 0
                          ? { label: `Create Dispatch Note (${uncovered.length} warehouse${uncovered.length === 1 ? '' : 's'} left)`, action: () => setCreateDnModalSo(s), style: 'bg-blue-50 text-blue-700 border-blue-200' }
                          : { label: 'Awaiting Warehouse', style: 'bg-slate-50 text-slate-500 border-slate-200' };
                      }
                      case 'READY_FOR_DISPATCH':
                        return { label: 'Awaiting Warehouse', style: 'bg-slate-50 text-slate-500 border-slate-200' };
                      case 'DISPATCHED':
                        return { label: 'Awaiting Delivery', style: 'bg-slate-50 text-slate-500 border-slate-200' };
                      case 'DELIVERED':
                        return { label: 'Create Invoice', action: () => { populateCiFromSo(s.salesOrderNumber); setIsCiModalOpen(true); }, style: 'bg-sky-50 text-sky-700 border-sky-200' };
                      case 'INVOICED':
                        return { label: 'Go to Invoice', action: () => setTab('invoice'), style: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
                      case 'PARTIALLY_PAID':
                        return { label: 'Go to Payment', action: () => setTab('invoice'), style: 'bg-orange-50 text-orange-700 border-orange-200' };
                      case 'PAID':
                        return { label: 'Mark Complete', action: () => advanceSoStatus(s, 'COMPLETED'), style: 'bg-indigo-50 text-indigo-700 border-indigo-200', confirm: `Mark ${s.salesOrderNumber} as complete? This cannot be undone.` };
                      case 'COMPLETED':
                        return { label: 'Done', style: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
                      case 'CANCELLED':
                        return { label: 'Cancelled', style: 'bg-slate-200 text-slate-500 border-slate-300' };
                      default:
                        return { label: '—', style: 'bg-slate-50 text-slate-400 border-slate-200' };
                    }
                  })();
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-indigo-700">{s.salesOrderNumber}</div>
                        {s.source === 'ONLINE_STORE' && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            🛒 Online Store
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{s.customerName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{s.customerPoReference || '—'}</div>
                      </td>
                      <td className="py-3 px-4">
                        {s.lines.map((l: any) => (
                          <div key={l.id} className="text-[11px]">
                            <span className="font-mono text-indigo-700 font-bold">{l.itemCode}</span> × {l.quantity}
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{s.currency} {s.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4"><StatusPill status={s.status} /></td>
                      <td className="py-3 px-4">
                        {nextAction.action ? (
                          <button onClick={() => {
                            if (nextAction.confirm) { if (!window.confirm(nextAction.confirm)) return; }
                            nextAction.action!();
                          }} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all hover:opacity-80 ${nextAction.style}`}>
                            {nextAction.label} →
                          </button>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${nextAction.style}`}>{nextAction.label}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {allowed.length > 0 ? (
                          <Select
                            value=""
                            onChange={(e) => e.target.value && advanceSoStatus(s, e.target.value)}
                            options={[{ value: '', label: '— next status —' }, ...allowed.map((v) => ({ value: v, label: v.replace(/_/g, ' ') }))]}
                            className="text-[11px] w-36"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No further status</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setViewSoModal(s)}
                          title="View full order details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {salesOrders.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-400">No sales orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispatch Tracking (#5 + #6) */}
      {tab === 'dispatch' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Dispatch Note List & Status Tracking</h2>
              <p className="text-[11px] text-slate-500">Track fulfilment from allocation through to delivery. Status updates cascade automatically to the Sales Order.</p>
            </div>
            <Link href="/dashboard/warehouse/dispatch-notes" className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1">
              Open full warehouse view <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Total</div>
              <div className="text-xl font-black text-slate-900">{dispatchNotes.length}</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-[10px] font-mono font-bold text-amber-700 uppercase">In Picking/Packing</div>
              <div className="text-xl font-black text-amber-900">{dispatchNotes.filter((d) => ['PICKING', 'PICKED', 'PACKING', 'PACKED'].includes(d.status)).length}</div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <div className="text-[10px] font-mono font-bold text-blue-700 uppercase">Dispatched / In Transit</div>
              <div className="text-xl font-black text-blue-900">{dispatchNotes.filter((d) => ['DISPATCHED', 'IN_TRANSIT', 'READY_FOR_DISPATCH'].includes(d.status)).length}</div>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="text-[10px] font-mono font-bold text-indigo-700 uppercase">Delivered</div>
              <div className="text-xl font-black text-indigo-900">{dispatchNotes.filter((d) => d.status === 'DELIVERED').length}</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Dispatch No.</th>
                  <th className="py-3 px-4 text-left font-bold">Sales Order</th>
                  <th className="py-3 px-4 text-left font-bold">Customer</th>
                  <th className="py-3 px-4 text-left font-bold">Warehouse</th>
                  <th className="py-3 px-4 text-left font-bold">Item</th>
                  <th className="py-3 px-4 text-right font-bold">Qty</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-left font-bold">Carrier</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dispatchNotes.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{d.dispatchNumber}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{d.salesOrderNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{d.customerName}</td>
                    <td className="py-3 px-4 text-[11px] font-mono text-slate-600">{d.warehouseCode}</td>
                    <td className="py-3 px-4">
                      {d.lines?.map((l: any, i: number) => (
                        <div key={i}><span className="font-mono text-indigo-700 font-bold text-[11px]">{l.itemCode}</span> · {l.itemName}</div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {d.lines?.reduce((sum: number, l: any) => sum + l.dispatchQty, 0)}
                    </td>
                    <td className="py-3 px-4"><StatusPill status={d.status} /></td>
                    <td className="py-3 px-4">
                      <div className="text-[11px] text-slate-700">{d.carrier || '—'}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {['DISPATCHED', 'IN_TRANSIT'].includes(d.status) && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shadow-sm px-2.5 py-1"
                            onClick={() => openDeliveryModal(d)}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Confirm Delivery (POD)
                          </Button>
                        )}
                        {d.status === 'DELIVERED' && !d.attachment?.fileData && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] shadow-sm px-2.5 py-1"
                            onClick={() => openDeliveryModal(d)}
                            leftIcon={<Paperclip className="w-3.5 h-3.5" />}
                          >
                            Attach POD
                          </Button>
                        )}
                        {d.status === 'DELIVERED' && d.attachment?.fileData && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPodViewerDn(d)}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                              title="View Proof of Delivery (POD) Document"
                              aria-label="View POD"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openDeliveryModal(d)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-600 border border-slate-200"
                              title="Update / Replace POD Document"
                              aria-label="Update POD"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <button onClick={() => window.open(`/api/dispatch-notes/${d.id}/print`, '_blank')} className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600" title="Print dispatch note">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dispatchNotes.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-slate-400">No dispatch notes yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales Invoice (#7 & #8 Unified Desk) */}
      {tab === 'invoice' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Sales Invoices</h2>
              <p className="text-[11px] text-slate-500">Generate, approve, email PDF Sales Invoices, and track Sent, Viewed, Overdue, and Paid lifecycle.</p>
            </div>
            <Button onClick={() => setIsCiModalOpen(true)} variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create Sales Invoice
            </Button>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Total Invoices</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{customerInvoices.length}</div>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200">
              <div className="text-[10px] font-mono font-bold text-indigo-700 uppercase">Draft / Approved</div>
              <div className="text-lg font-black text-indigo-900 mt-0.5">{customerInvoices.filter((c) => ['DRAFT', 'APPROVED'].includes(c.status)).length}</div>
            </div>
            <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200">
              <div className="text-[10px] font-mono font-bold text-sky-700 uppercase">Sent / Viewed</div>
              <div className="text-lg font-black text-sky-900 mt-0.5">{customerInvoices.filter((c) => ['SENT', 'VIEWED'].includes(c.status)).length}</div>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200">
              <div className="text-[10px] font-mono font-bold text-rose-700 uppercase">Overdue</div>
              <div className="text-lg font-black text-rose-900 mt-0.5">{customerInvoices.filter((c) => c.status === 'OVERDUE').length}</div>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200">
              <div className="text-[10px] font-mono font-bold text-indigo-700 uppercase">Paid</div>
              <div className="text-lg font-black text-indigo-900 mt-0.5">{customerInvoices.filter((c) => c.status === 'PAID').length}</div>
            </div>
          </div>

          {/* Unified Invoice Register Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Invoice No.</th>
                  <th className="py-3 px-4 text-left font-bold">SO / Dispatch</th>
                  <th className="py-3 px-4 text-left font-bold">Customer & Email</th>
                  <th className="py-3 px-4 text-right font-bold">Total Amount</th>
                  <th className="py-3 px-4 text-right font-bold">Paid / Balance</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-left font-bold">Due Date</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerInvoices.map((c) => {
                  const balance = Math.max(0, c.totalValue - (c.amountPaid || 0));
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {c.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-[11px] font-mono">
                        <div className="font-bold text-slate-800">{c.salesOrderNumber}</div>
                        <div className="text-slate-500 text-[10px]">{c.dispatchNumber || '—'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{c.customerName}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[160px]">{c.customerEmail || 'No email registered'}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {c.currency} {c.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[11px]">
                        <div className="text-indigo-700 font-bold">{c.currency} {(c.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        {balance > 0 && <div className="text-rose-600 text-[10px] font-semibold">Balance: {c.currency} {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={c.status} />
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 font-mono">
                        {new Date(c.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {['SENT', 'VIEWED', 'OVERDUE', 'PARTIALLY_PAID'].includes(c.status) && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-sm px-2.5 py-1"
                              onClick={() => {
                                setCpTarget(c);
                                setCpForm({
                                  paymentDate: new Date().toISOString().slice(0, 10),
                                  amount: Math.max(0, c.totalValue - (c.amountPaid || 0)),
                                  paymentMethod: 'EFT',
                                  bankReference: '',
                                  notes: '',
                                  receiptFileName: '',
                                  receiptAttachment: null,
                                });
                                setIsCpModalOpen(true);
                              }}
                              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                            >
                              Record Pay
                            </Button>
                          )}
                          {((c.amountPaid || 0) > 0 || c.status === 'PAID') && (
                            <button
                              onClick={() => setPaymentHistoryModalCi(c)}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                              title="View Payment Remittances & Receipts"
                              aria-label="View Receipts"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {['DRAFT', 'APPROVED'].includes(c.status) && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold text-[11px] shadow-sm px-2.5 py-1"
                              onClick={() => openSendModal(c)}
                              leftIcon={<Send className="w-3.5 h-3.5" />}
                            >
                              Send
                            </Button>
                          )}
                          {['SENT', 'VIEWED', 'OVERDUE'].includes(c.status) && (
                            <button
                              onClick={() => openSendModal(c)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200"
                              title="Resend Invoice Email"
                              aria-label="Resend Email"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => window.open(`/api/customer-invoices/${c.id}/print`, '_blank')}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200"
                            title="Print / Save Sales Invoice PDF"
                            aria-label="Print Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setViewInvoiceModalCi(c)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200"
                            title="View Invoice Breakdown"
                            aria-label="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {customerInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No customer invoices yet. Create an invoice from a delivered sales order to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Orders (#9 + #10) */}
      {tab === 'po' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Purchase Order List & Status</h2>
              <p className="text-[11px] text-slate-500">Generated automatically when vendor stock is allocated to a Sales Order. Standalone POs (no linked sale) can be added manually.</p>
            </div>
            <Button onClick={() => setIsPoModalOpen(true)} variant="secondary" leftIcon={<Plus className="w-4 h-4" />}>Create Standalone PO</Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">PO No.</th>
                  <th className="py-3 px-4 text-left font-bold">Vendor</th>
                  <th className="py-3 px-4 text-left font-bold">Linked SO</th>
                  <th className="py-3 px-4 text-right font-bold">Transport</th>
                  <th className="py-3 px-4 text-right font-bold">Total</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-left font-bold">Payment Terms</th>
                  <th className="py-3 px-4 text-right font-bold">Advance</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.map((p) => {
                  const allowed = poAllowed[p.status] || [];
                  const poEditLocked = ['CANCELLED', 'CLOSED', 'PAID'].includes(p.status);
                  const pendingTc = transportCosts.some((t) => t.status === 'PENDING_APPROVAL' && t.relatedPoNumbers.includes(p.poNumber));
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{p.poNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.vendorName}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{p.linkedSalesOrderNumber || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono text-[11px]">
                        {p.transportCost ? (
                          <span className="text-slate-600" title="Included in Total">{p.currency} {p.transportCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        ) : pendingTc ? (
                          <span className="text-amber-700 font-bold flex items-center justify-end gap-1" title="A transport cost claim is awaiting owner approval"><AlertTriangle className="w-3 h-3" /> Pending</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">{p.currency} {p.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4"><StatusPill status={p.status} /></td>
                      <td className="py-3 px-4 text-[11px]">{p.paymentTerms}</td>
                      <td className="py-3 px-4 text-right">
                        {allowed.length > 0 ? (
                          <Select
                            value=""
                            onChange={(e) => e.target.value && advancePoStatus(p, e.target.value)}
                            options={[{ value: '', label: '— next status —' }, ...allowed.map((v) => ({ value: v, label: v.replace(/_/g, ' ') }))]}
                            className="text-[11px] w-40"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No further status</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewPoModal(p)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600" title="View purchase order">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => window.open(`/api/purchase-orders/${p.id}/print`, '_blank')} className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600" title="Print / download purchase order">
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditPoModal(p);
                              setPoEditForm({
                                requestedDeliveryDate: p.requestedDeliveryDate ? p.requestedDeliveryDate.substring(0, 10) : '',
                                paymentTerms: p.paymentTerms || '',
                                notes: p.notes || '',
                              });
                            }}
                            disabled={poEditLocked}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-100 disabled:hover:text-slate-600"
                            title={poEditLocked ? 'This PO is settled and can no longer be edited' : 'Edit delivery date, payment terms & notes'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {purchaseOrders.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-slate-400">No purchase orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vendor Invoices (#11 + #12) */}
      {tab === 'vinv' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Vendor Invoice Registration & Review</h2>
              <p className="text-[11px] text-slate-500">Link vendor invoices to POs. Approve / hold / reject before payment.</p>
            </div>
            <Button onClick={() => setIsViModalOpen(true)} variant="primary" leftIcon={<Plus className="w-4 h-4" />}>Register Vendor Invoice</Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Vendor Invoice No.</th>
                  <th className="py-3 px-4 text-left font-bold">PO</th>
                  <th className="py-3 px-4 text-left font-bold">Vendor</th>
                  <th className="py-3 px-4 text-right font-bold">Amount</th>
                  <th className="py-3 px-4 text-left font-bold">Attachment</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorInvoices.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{v.vendorInvoiceNumber}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{v.linkedPoNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{v.vendorName}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{v.currency} {v.invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4">
                      {v.attachment?.fileUrl ? (
                        <a
                          href={v.attachment.fileUrl}
                          download={v.attachment.fileName}
                          className="text-[11px] text-indigo-700 font-bold hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> {v.attachment.fileName}
                        </a>
                      ) : v.attachment ? (
                        <span className="text-[11px] text-indigo-700 font-bold">{v.attachment.fileName}</span>
                      ) : (<span className="text-slate-400 text-[11px]">—</span>)}
                    </td>
                    <td className="py-3 px-4"><StatusPill status={v.status} /></td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD', 'DISPUTED'].includes(v.status) && (
                        <>
                          <button onClick={() => approveVi(v, 'APPROVED')} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold hover:bg-indigo-100">Approve</button>
                          <button onClick={() => approveVi(v, 'ON_HOLD')} className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold hover:bg-amber-100">Hold</button>
                          <button onClick={() => approveVi(v, 'REJECTED')} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold hover:bg-rose-100">Reject</button>
                        </>
                      )}
                      {['APPROVED', 'OVERDUE'].includes(v.status) && (
                        <button onClick={() => approveVi(v, 'DISPUTED')} className="px-2 py-1 rounded-lg bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 text-[10px] font-bold hover:bg-fuchsia-100">Dispute</button>
                      )}
                      {['APPROVED', 'PARTIALLY_PAID'].includes(v.status) && (
                        <button
                          onClick={() => { setPayTarget(v); setVpForm({ ...vpForm, amountPaid: v.invoiceAmount - v.amountPaid }); setIsVpModalOpen(true); }}
                          className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold hover:bg-indigo-100"
                        >Pay</button>
                      )}
                    </td>
                  </tr>
                ))}
                {vendorInvoices.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">No vendor invoices registered yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vendor Payments (#13, #14) */}
      {tab === 'vpay' && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900">Vendor Payment Register & Status</h2>
          <p className="text-[11px] text-slate-500">Payment lifecycle: Approved → Partially Paid → Paid.</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Vendor Invoice</th>
                  <th className="py-3 px-4 text-left font-bold">Vendor</th>
                  <th className="py-3 px-4 text-right font-bold">PO Amount</th>
                  <th className="py-3 px-4 text-right font-bold">Invoice Amount</th>
                  <th className="py-3 px-4 text-right font-bold">Variance</th>
                  <th className="py-3 px-4 text-right font-bold">Paid</th>
                  <th className="py-3 px-4 text-right font-bold">Outstanding</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-left font-bold">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorInvoices.map((v) => {
                  const lastPayment = v.payments && v.payments.length > 0 ? v.payments[v.payments.length - 1] : null;
                  // Looked up live (not the invoice's stored varianceVsPo snapshot) so a PO
                  // total that moved after invoicing — e.g. an approved transport cost —
                  // is reflected here immediately.
                  const linkedPo = purchaseOrders.find((p) => p.poNumber === v.linkedPoNumber);
                  const poAmount = linkedPo?.totalValue;
                  const variance = poAmount !== undefined ? v.invoiceAmount - poAmount : undefined;
                  return (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{v.vendorInvoiceNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{v.vendorName}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{poAmount !== undefined ? `${v.currency} ${poAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{v.currency} {v.invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${variance === undefined ? 'text-slate-400' : Math.abs(variance) < 0.005 ? 'text-slate-500' : variance > 0 ? 'text-rose-700' : 'text-teal-700'}`}>
                      {variance === undefined ? '—' : `${variance > 0 ? '+' : ''}${variance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-700 font-bold">{v.currency} {v.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700 font-bold">{v.currency} {(v.invoiceAmount - v.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4"><StatusPill status={v.status} /></td>
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
                  <tr><td colSpan={9} className="py-8 text-center text-slate-400">No vendor invoices to display.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transport Costs — vendor-submitted freight claims spanning multiple POs/DNs,
          awaiting owner approval before the allocated share lands on each PO's total. */}
      {tab === 'transport' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Transport Cost Claims</h2>
            <p className="text-[11px] text-slate-500">Each claim is one shipment — several dispatch notes from one warehouse, consolidated under one tracking number. Related POs are auto-detected from those dispatches and the cost splits across them proportionally. Approve to add each PO's share to its total — a vendor can't invoice a PO until it's fully supplied and free of a pending claim.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Claim No.</th>
                  <th className="py-3 px-4 text-left font-bold">Vendor</th>
                  <th className="py-3 px-4 text-left font-bold">Warehouse</th>
                  <th className="py-3 px-4 text-left font-bold">Tracking No.</th>
                  <th className="py-3 px-4 text-left font-bold">Related POs (cost share)</th>
                  <th className="py-3 px-4 text-left font-bold">Related DNs</th>
                  <th className="py-3 px-4 text-right font-bold">Total Cost</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transportCosts.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{t.transportCostNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{t.vendorName}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">{t.warehouseCode}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">{t.trackingNumber}</td>
                    <td className="py-3 px-4">
                      {(t.allocations || []).map((a: any, i: number) => (
                        <div key={i} className="text-[11px] font-mono">
                          <span className="font-bold text-slate-800">{a.poNumber}</span> <span className="text-slate-500">→ {t.currency} {a.allocatedAmount.toFixed(2)}</span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-[11px] font-mono text-slate-600">{(t.relatedDnNumbers || []).join(', ') || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{t.currency} {t.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4">
                      <StatusPill status={t.status} />
                      {t.status === 'REJECTED' && t.rejectionReason && (
                        <div className="text-[10px] text-rose-600 mt-1 max-w-[160px]">{t.rejectionReason}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setViewTcModal(t)}
                        title="View full claim details"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors inline-flex align-middle"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {t.status === 'PENDING_APPROVAL' && (
                        <>
                          <button onClick={() => approveTransportCost(t)} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold hover:bg-indigo-100">Approve</button>
                          <button onClick={() => { setRejectTcModal(t); setRejectTcReason(''); }} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold hover:bg-rose-100">Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {transportCosts.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-slate-400">No transport cost claims submitted yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Outstanding Payments — combined receivables (customer) + payables (vendor) report */}
      {tab === 'outstanding' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Outstanding Payments Report</h2>
              <p className="text-[11px] text-slate-500">Every unpaid or partially paid invoice — money owed to LogiQ-On (receivables) and money LogiQ-On owes vendors (payables).</p>
            </div>
            <Button variant="outline" size="sm" onClick={exportOutstandingCSV} leftIcon={<Download className="w-4 h-4" />}>Export CSV</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">Outstanding Receivable</div>
              <div className="text-xl font-black text-indigo-700 font-mono mt-1">AUD {outstandingTotals.receivable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <p className="text-[11px] text-slate-500 mt-1">Owed to LogiQ-On by customers</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">Outstanding Payable</div>
              <div className="text-xl font-black text-rose-700 font-mono mt-1">AUD {outstandingTotals.payable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <p className="text-[11px] text-slate-500 mt-1">Owed by LogiQ-On to vendors</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">Overdue Items</div>
              <div className={`text-xl font-black font-mono mt-1 ${outstandingTotals.overdueCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{outstandingTotals.overdueCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Past their due date</p>
            </div>
          </div>

          <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input placeholder="Search document no. or counterparty..." value={outstandingSearch} onChange={(e) => setOutstandingSearch(e.target.value)} className="pl-9 text-xs" />
            </div>
            <Select
              value={outstandingType}
              onChange={(e) => setOutstandingType(e.target.value as any)}
              options={[
                { value: 'ALL', label: 'Receivables + Payables' },
                { value: 'RECEIVABLE', label: 'Receivables only (Customer)' },
                { value: 'PAYABLE', label: 'Payables only (Vendor)' },
              ]}
              className="text-xs w-56"
            />
            <div className="flex items-center gap-2">
              <Input type="date" value={outstandingFrom} onChange={(e) => setOutstandingFrom(e.target.value)} className="text-xs" />
              <span className="text-slate-400 text-xs">to</span>
              <Input type="date" value={outstandingTo} onChange={(e) => setOutstandingTo(e.target.value)} className="text-xs" />
            </div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={outstandingOverdueOnly} onChange={(e) => setOutstandingOverdueOnly(e.target.checked)} className="rounded border-slate-300" />
              Overdue only
            </label>
            {(outstandingFrom || outstandingTo || outstandingOverdueOnly || outstandingSearch || outstandingType !== 'ALL') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setOutstandingFrom(''); setOutstandingTo(''); setOutstandingOverdueOnly(false); setOutstandingSearch(''); setOutstandingType('ALL'); }}
              >
                Clear filters
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Type</th>
                  <th className="py-3 px-4 text-left font-bold">Document No.</th>
                  <th className="py-3 px-4 text-left font-bold">Counterparty</th>
                  <th className="py-3 px-4 text-left font-bold">Due Date</th>
                  <th className="py-3 px-4 text-right font-bold">Total</th>
                  <th className="py-3 px-4 text-right font-bold">Paid</th>
                  <th className="py-3 px-4 text-right font-bold">Outstanding</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outstandingRows.map((r) => {
                  const isOverdue = new Date(r.dueDate) < new Date();
                  return (
                    <tr key={`${r.type}_${r.id}`} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${r.type === 'RECEIVABLE' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {r.type === 'RECEIVABLE' ? 'RECEIVABLE' : 'PAYABLE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.docNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{r.counterparty}</td>
                      <td className="py-3 px-4">
                        <span className={isOverdue ? 'text-rose-700 font-bold flex items-center gap-1' : 'text-slate-700'}>
                          {isOverdue && <AlertTriangle className="w-3 h-3" />} {new Date(r.dueDate).toLocaleDateString('en-AU')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{r.currency} {r.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">{r.currency} {r.paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className={`py-3 px-4 text-right font-mono font-black ${r.type === 'RECEIVABLE' ? 'text-indigo-700' : 'text-rose-700'}`}>{r.currency} {r.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4"><StatusPill status={r.status} /></td>
                    </tr>
                  );
                })}
                {outstandingRows.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-400">Nothing outstanding for the selected filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── CREATE MODALS ─── */}
        {(() => {
          const allowedSoItems = customerMaster.filter((c: any) => c.customerName === soForm.customerName).map((c: any) => ({
            itemCode: c.itemCode,
            itemName: c.itemDescription,
            sellingPrice: c.sellingPrice,
            moq: c.moq
          }));
          
          // Item Master (owner-entered, one primary cost per item) is the authoritative,
          // always-complete price/MOQ source. Vendor Master Data is a much sparser table of
          // specifically-negotiated per-vendor costs, so it only wins when a matching row
          // actually exists; falling back to it alone (as before) meant most items —
          // anything never manually re-entered into that table — priced at $0.
          const allowedPoItems = items.filter((i: any) => i.vendorName === poForm.vendorName).map((i: any) => {
            const vm = vendorMaster.find((v: any) => v.vendorName === poForm.vendorName && v.itemCode === (i.sku || i.itemCode));
            const cost = vm?.costOfGoods ?? i.costPrice ?? 0;
            return {
              itemCode: i.sku || i.itemCode,
              itemName: i.itemName,
              // ItemPicker is a generic component: its search-result price badge reads
              // `price`/`sellingPrice`, and the value it hands back via onChange as `unitCost`
              // is read from `purchasePrice`/`cost` — not from a `unitCost` field. Naming this
              // `unitCost` (matching what the PO line itself calls it) silently fed ItemPicker
              // nothing, so every manually-searched item priced at $0 regardless of whether
              // vendor_master_data.json or the item's own costPrice had a real value.
              price: cost,
              purchasePrice: cost,
              moq: vm?.moq ?? i.moq ?? 1,
            };
          });

          return (
            <>

      {/* Sales Order create — customer dropdown + item picker */}
      <Modal isOpen={isSoModalOpen} onClose={() => setIsSoModalOpen(false)} title="Create Sales Order" maxWidth="2xl">
        <form onSubmit={submitSo} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold block">Customer Name *</label>
                <button
                  type="button"
                  onClick={() => setIsQuickAddCustomerOpen(true)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
                >
                  + Add New Customer
                </button>
              </div>
              <Select
                  value={soForm.customerName}
                  onChange={(e) => {
                    const name = e.target.value;
                    const matchingRec = customerMaster.find((c: any) => c.customerName === name);
                    setSoForm((prev: any) => ({
                      ...prev,
                      customerName: name,
                      paymentTerms: matchingRec?.paymentTerms || prev.paymentTerms || 'Net 30',
                      lines: [{ itemCode: '', itemName: '', description: '', quantity: matchingRec?.moq || 1, sellingPrice: 0, taxPercent: 10, moq: matchingRec?.moq || 1 }]
                    }));
                  }}
                  options={[
                    { value: '', label: '-- Select contracted customer --' },
                    ...uniqueCustomers.map((c) => ({ value: c, label: c }))
                  ]}
                  required
                />
            </div>
            <div>
              <label className="font-bold block mb-1">Customer PO / Reference</label>
              <Input
                value={soForm.customerPoReference}
                onChange={(e) => setSoForm({ ...soForm, customerPoReference: e.target.value })}
                placeholder="e.g. PO-45872 / CUST-REF-99"
              />
            </div>
          </div>
          <div>
            <label className="font-bold block mb-1">Delivery Location / Address *</label>
            <Input
              value={soForm.deliveryLocation}
              onChange={(e) => setSoForm({ ...soForm, deliveryLocation: e.target.value })}
              placeholder="e.g. 12 Collins St, Melbourne VIC 3000"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold block mb-1">Requested Delivery Date</label>
              <Input
                type="date"
                value={soForm.requestedDeliveryDate}
                onChange={(e) => setSoForm({ ...soForm, requestedDeliveryDate: e.target.value })}
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Payment Terms *</label>
              <Select
                value={soForm.paymentTerms}
                onChange={(e) => setSoForm({ ...soForm, paymentTerms: e.target.value })}
                options={['Net 7', 'Net 14', 'Net 30', 'Net 45', 'Net 60', 'Prepaid', 'COD'].map((v) => ({ value: v, label: v }))}
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Incoterms *</label>
              <Select
                value={soForm.incoterms}
                onChange={(e) => setSoForm({ ...soForm, incoterms: e.target.value })}
                options={['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'].map((v) => ({ value: v, label: v }))}
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Currency *</label>
              <Select
                value={soForm.currency}
                onChange={(e) => setSoForm({ ...soForm, currency: e.target.value })}
                options={['AUD', 'USD', 'EUR', 'GBP', 'NZD'].map((v) => ({ value: v, label: v }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold">Items</label>
              <button type="button" onClick={() => setSoForm({ ...soForm, lines: [...soForm.lines, { itemCode: '', itemName: '', description: '', quantity: 1, sellingPrice: 0, taxPercent: 10, moq: 1 }] })} className="text-[11px] font-bold text-indigo-700">+ Add Item</button>
            </div>
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="col-span-6">Item</span>
              <span className="col-span-2">Quantity</span>
              <span className="col-span-3">Selling Price</span>
              <span className="col-span-1"></span>
            </div>
            {soForm.lines.map((l: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <ItemPicker
                  items={allowedSoItems}
                  className="col-span-6"
                  value={{ itemCode: l.itemCode, itemName: l.itemName || l.description }}
                  placeholder="Search item..."
                  onChange={(v) => {
                    const n = [...soForm.lines];
                    n[i] = { ...n[i], itemCode: v.itemCode, itemName: v.itemName, description: v.itemName, sellingPrice: v.sellingPrice !== undefined ? v.sellingPrice : n[i].sellingPrice, moq: (v as any).moq || 1, quantity: Math.max(n[i].quantity, (v as any).moq || 1) };
                    setSoForm({ ...soForm, lines: n });
                  }}
                />
                <input type="number" min={l.moq || 1} className="col-span-2 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 placeholder:text-slate-400" placeholder="0" value={l.quantity} onChange={(e) => { const n = [...soForm.lines]; n[i].quantity = Number(e.target.value); setSoForm({ ...soForm, lines: n }); }} />
                  <input type="number" step="0.01" readOnly className="col-span-3 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold focus:outline-none cursor-not-allowed" placeholder="0.00" value={l.sellingPrice} />
                <div className="col-span-1 flex justify-center">
                  {soForm.lines.length > 1 && (
                    <button type="button" onClick={() => { const n = soForm.lines.filter((_: any, idx: number) => idx !== i); setSoForm({ ...soForm, lines: n }); }} className="text-rose-400 hover:text-rose-600 text-[11px]">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsSoModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Sales Order</Button>
          </div>
        </form>
      </Modal>

      <QuickAddCustomerModal
        isOpen={isQuickAddCustomerOpen}
        onClose={() => setIsQuickAddCustomerOpen(false)}
        items={items}
        existingRecords={customerMaster}
        onCreated={handleQuickAddCustomerCreated}
      />

      {/* View Purchase Order — read-only detail + print/download */}
      <Modal isOpen={!!viewPoModal} onClose={() => setViewPoModal(null)} title={`Purchase Order — ${viewPoModal?.poNumber || ''}`} maxWidth="2xl">
        {viewPoModal && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Vendor</div>
                <div className="font-extrabold text-slate-900">{viewPoModal.vendorName}</div>
                {viewPoModal.linkedSalesOrderNumber && (
                  <div className="text-[11px] text-slate-500 mt-0.5">Linked SO: <span className="font-mono">{viewPoModal.linkedSalesOrderNumber}</span></div>
                )}
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Status</div>
                <div className="mt-0.5"><StatusPill status={viewPoModal.status} /></div>
                <div className="text-[11px] text-slate-500 mt-1">Payment Terms: <span className="font-bold text-slate-700">{viewPoModal.paymentTerms}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div><span className="text-slate-500">Order Date:</span> <span className="font-bold text-slate-800">{new Date(viewPoModal.createdAt).toLocaleDateString('en-AU')}</span></div>
              <div><span className="text-slate-500">Requested Delivery:</span> <span className="font-bold text-slate-800">{viewPoModal.requestedDeliveryDate ? new Date(viewPoModal.requestedDeliveryDate).toLocaleDateString('en-AU') : 'TBC'}</span></div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-mono uppercase">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Cost</th>
                    <th className="py-2 px-3 text-right">Total</th>
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

            <div className="grid grid-cols-4 gap-3 text-[11px] p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div><span className="text-slate-500 block">Subtotal</span><span className="font-bold text-slate-800 font-mono">{viewPoModal.currency} {(viewPoModal.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div><span className="text-slate-500 block">Tax</span><span className="font-bold text-slate-800 font-mono">{viewPoModal.currency} {(viewPoModal.taxTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div>
                <span className="text-slate-500 block">Transport Cost</span>
                {viewPoModal.transportCost > 0 ? (
                  <span className="font-bold text-amber-700 font-mono">{viewPoModal.currency} {viewPoModal.transportCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                ) : (
                  <span className="text-slate-400 font-mono">—</span>
                )}
              </div>
              <div><span className="text-slate-500 block">Total</span><span className="font-black text-indigo-700 font-mono">{viewPoModal.currency} {viewPoModal.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            </div>

            {viewPoModal.notes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">Notes</div>
                <div className="text-slate-700">{viewPoModal.notes}</div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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

      {/* View Sales Order — full detail: customer, terms, lines, and linked docs */}
      <Modal isOpen={!!viewSoModal} onClose={() => setViewSoModal(null)} title={`Sales Order — ${viewSoModal?.salesOrderNumber || ''}`} maxWidth="2xl">
        {viewSoModal && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Customer</div>
                <div className="font-extrabold text-slate-900">{viewSoModal.customerName}</div>
                {viewSoModal.customerEmail && <div className="text-[11px] text-slate-500 mt-0.5">{viewSoModal.customerEmail}</div>}
                {viewSoModal.customerPhone && <div className="text-[11px] text-slate-500">{viewSoModal.customerPhone}</div>}
                {viewSoModal.customerPoReference && (
                  <div className="text-[11px] text-slate-500 mt-0.5">Customer PO: <span className="font-mono">{viewSoModal.customerPoReference}</span></div>
                )}
                {viewSoModal.source === 'ONLINE_STORE' && (
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    🛒 Placed via Online Store
                  </span>
                )}
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Status</div>
                <div className="mt-0.5"><StatusPill status={viewSoModal.status} /></div>
                <div className="text-[11px] text-slate-500 mt-1">Payment Terms: <span className="font-bold text-slate-700">{viewSoModal.paymentTerms}</span></div>
                {viewSoModal.incoterms && <div className="text-[11px] text-slate-500">Incoterms: <span className="font-bold text-slate-700">{viewSoModal.incoterms}</span></div>}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">Delivery Address</div>
              <div className="text-slate-700">{viewSoModal.deliveryLocation}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div><span className="text-slate-500">Order Date:</span> <span className="font-bold text-slate-800">{new Date(viewSoModal.createdAt).toLocaleDateString('en-AU')}</span></div>
              <div><span className="text-slate-500">Requested Delivery:</span> <span className="font-bold text-slate-800">{viewSoModal.requestedDeliveryDate ? new Date(viewSoModal.requestedDeliveryDate).toLocaleDateString('en-AU') : 'TBC'}</span></div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-mono uppercase">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Tax</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewSoModal.lines || []).map((l: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 px-3">
                        <div className="font-mono font-bold text-slate-900">{l.itemCode}</div>
                        <div className="text-[11px] text-slate-500">{l.itemName}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{l.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono">{viewSoModal.currency} {l.sellingPrice.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">{l.taxPercent}%</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{viewSoModal.currency} {l.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[11px] p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div><span className="text-slate-500 block">Subtotal</span><span className="font-bold text-slate-800 font-mono">{viewSoModal.currency} {viewSoModal.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div><span className="text-slate-500 block">Tax</span><span className="font-bold text-slate-800 font-mono">{viewSoModal.currency} {viewSoModal.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div><span className="text-slate-500 block">Total</span><span className="font-black text-indigo-700 font-mono">{viewSoModal.currency} {viewSoModal.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            </div>

            {(() => {
              const relatedPos = purchaseOrders.filter((p) => p.linkedSalesOrderNumber === viewSoModal.salesOrderNumber);
              const relatedDns = dispatchNotes.filter((d) => d.salesOrderNumber === viewSoModal.salesOrderNumber);
              const relatedInvoice = customerInvoices.find((c) => c.salesOrderNumber === viewSoModal.salesOrderNumber);
              if (relatedPos.length === 0 && relatedDns.length === 0 && !relatedInvoice) return null;
              return (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">Linked Documents</div>
                  {relatedPos.map((p) => (
                    <div key={p.id} className="text-[11px] flex items-center justify-between">
                      <span>Purchase Order <span className="font-mono font-bold text-indigo-700">{p.poNumber}</span> ({p.vendorName})</span>
                      <StatusPill status={p.status} />
                    </div>
                  ))}
                  {relatedDns.map((d) => (
                    <div key={d.id} className="text-[11px] flex items-center justify-between">
                      <span>Dispatch Note <span className="font-mono font-bold text-indigo-700">{d.dispatchNumber}</span></span>
                      <StatusPill status={d.status} />
                    </div>
                  ))}
                  {relatedInvoice && (
                    <div className="text-[11px] flex items-center justify-between">
                      <span>Sales Invoice <span className="font-mono font-bold text-indigo-700">{relatedInvoice.invoiceNumber}</span></span>
                      <StatusPill status={relatedInvoice.status} />
                    </div>
                  )}
                </div>
              );
            })()}

            {viewSoModal.internalNotes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">Internal Notes</div>
                <div className="text-slate-700">{viewSoModal.internalNotes}</div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              <span>Created by {viewSoModal.createdBy}</span>
              <Button type="button" variant="outline" onClick={() => setViewSoModal(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Purchase Order — commercial terms only; quantities/costs are derived from
          Sales Order allocation and vendor pricing and are never editable here. */}
      <Modal isOpen={!!editPoModal} onClose={() => setEditPoModal(null)} title={`Edit Purchase Order — ${editPoModal?.poNumber || ''}`} maxWidth="lg">
        {editPoModal && (
          <form onSubmit={submitPoEdit} className="space-y-4 text-xs">
            <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Only commercial terms can be edited here. Line items, quantities and unit costs are generated from the linked Sales Order allocation and vendor pricing, and stay locked to keep supply-status tracking accurate.
            </p>
            <div>
              <label className="font-bold block mb-1">Requested Delivery Date</label>
              <Input type="date" value={poEditForm.requestedDeliveryDate} onChange={(e) => setPoEditForm({ ...poEditForm, requestedDeliveryDate: e.target.value })} />
            </div>
            <div>
              <label className="font-bold block mb-1">Payment Terms</label>
              <Input value={poEditForm.paymentTerms} onChange={(e) => setPoEditForm({ ...poEditForm, paymentTerms: e.target.value })} placeholder="e.g. Net 30" />
            </div>
            <div>
              <label className="font-bold block mb-1">Notes</label>
              <Input value={poEditForm.notes} onChange={(e) => setPoEditForm({ ...poEditForm, notes: e.target.value })} placeholder="Delivery instructions, special conditions..." />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setEditPoModal(null)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={poEditSubmitting}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Transport Cost Claim — full shipment detail: who submitted it, what it
          covers, how the cost was split, and the approval/rejection trail. */}
      <Modal isOpen={!!viewTcModal} onClose={() => setViewTcModal(null)} title={`Transport Cost — ${viewTcModal?.transportCostNumber || ''}`} maxWidth="2xl">
        {viewTcModal && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Vendor</div>
                <div className="font-extrabold text-slate-900">{viewTcModal.vendorName}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Warehouse: <span className="font-mono font-bold text-slate-700">{viewTcModal.warehouseCode}</span>{viewTcModal.warehouseName ? ` — ${viewTcModal.warehouseName}` : ''}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Tracking Number: <span className="font-mono font-bold text-slate-700">{viewTcModal.trackingNumber}</span></div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Status</div>
                <div className="mt-0.5"><StatusPill status={viewTcModal.status} /></div>
                {viewTcModal.status === 'REJECTED' && viewTcModal.rejectionReason && (
                  <div className="text-[11px] text-rose-600 mt-1">Reason: {viewTcModal.rejectionReason}</div>
                )}
                <div className="text-[11px] text-slate-500 mt-1">Submitted by <span className="font-bold text-slate-700">{viewTcModal.createdBy}</span> on {new Date(viewTcModal.createdAt).toLocaleString('en-AU')}</div>
                {viewTcModal.approvedBy && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {viewTcModal.status === 'APPROVED' ? 'Approved' : 'Rejected'} by <span className="font-bold text-slate-700">{viewTcModal.approvedBy}</span> on {viewTcModal.approvedAt ? new Date(viewTcModal.approvedAt).toLocaleString('en-AU') : ''}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-1.5">Dispatch Notes in This Shipment</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {(viewTcModal.relatedDnNumbers || []).map((dnNum: string) => {
                  const dn = dispatchNotes.find((d) => d.dispatchNumber === dnNum);
                  return (
                    <div key={dnNum} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <span className="font-mono font-bold text-slate-900">{dnNum}</span>
                        {dn && <span className="text-slate-500 ml-2">{dn.salesOrderNumber} · {dn.customerName}</span>}
                      </div>
                      {dn ? <StatusPill status={dn.status} /> : <span className="text-rose-500 text-[10px] font-bold">Not found</span>}
                    </div>
                  );
                })}
                {(!viewTcModal.relatedDnNumbers || viewTcModal.relatedDnNumbers.length === 0) && (
                  <div className="px-3 py-3 text-center text-slate-400">No dispatch notes recorded on this claim.</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-1.5">Cost Allocation Across Purchase Orders</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-mono uppercase">
                    <tr>
                      <th className="py-2 px-3">Purchase Order</th>
                      <th className="py-2 px-3">PO Status</th>
                      <th className="py-2 px-3 text-right">PO Total (at claim time)</th>
                      <th className="py-2 px-3 text-right">Allocated Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewTcModal.allocations || []).map((a: any, i: number) => {
                      const po = purchaseOrders.find((p) => p.poNumber === a.poNumber);
                      return (
                        <tr key={i}>
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">{a.poNumber}</td>
                          <td className="py-2 px-3">{po ? <StatusPill status={po.status} /> : <span className="text-rose-500 text-[10px] font-bold">Not found</span>}</td>
                          <td className="py-2 px-3 text-right font-mono">{viewTcModal.currency} {a.poTotalValueAtClaim.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{viewTcModal.currency} {a.allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {viewTcModal.notes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">Vendor Notes</div>
                <div className="text-slate-700">{viewTcModal.notes}</div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <div className="text-sm font-black text-indigo-700 font-mono">
                Total Claimed: {viewTcModal.currency} {viewTcModal.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="flex gap-2">
                {viewTcModal.status === 'PENDING_APPROVAL' && (
                  <>
                    <Button type="button" variant="danger" onClick={() => { setRejectTcModal(viewTcModal); setRejectTcReason(''); setViewTcModal(null); }}>Reject</Button>
                    <Button type="button" variant="primary" onClick={() => { approveTransportCost(viewTcModal); setViewTcModal(null); }}>Approve</Button>
                  </>
                )}
                <Button type="button" variant="outline" onClick={() => setViewTcModal(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Transport Cost Claim */}
      <Modal isOpen={!!rejectTcModal} onClose={() => setRejectTcModal(null)} title={`Reject Transport Cost — ${rejectTcModal?.transportCostNumber || ''}`} maxWidth="md">
        {rejectTcModal && (
          <form onSubmit={submitRejectTransportCost} className="space-y-4 text-xs">
            <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Rejecting leaves every related PO's total unchanged. The vendor will need to resubmit with a corrected claim if the cost is legitimate.
            </p>
            <div>
              <label className="font-bold block mb-1">Reason (optional)</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="e.g. Tracking number doesn't match any of these dispatches."
                value={rejectTcReason}
                onChange={(e) => setRejectTcReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setRejectTcModal(null)}>Cancel</Button>
              <Button type="submit" variant="danger">Reject Claim</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Standalone Purchase Order create — not tied to a Sales Order. Any PO covering
          items actually allocated to a sale is generated automatically when stock is
          allocated to that Sales Order (from the Sales Orders tab); this modal is only
          for a PO with no Sales Order behind it. */}
      <Modal isOpen={isPoModalOpen} onClose={() => setIsPoModalOpen(false)} title="Create Standalone Purchase Order" maxWidth="2xl">
        <form onSubmit={submitPo} className="space-y-4 text-xs">
          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            This creates a Purchase Order with no linked Sales Order. Purchase Orders for stock allocated to a sale are generated automatically when you allocate stock to a Sales Order (from the Sales Orders tab) — use this only for a PO outside that flow.
          </p>
          <div>
            <label className="font-bold block mb-1">Vendor Name *</label>
            <Select
              value={poForm.vendorName}
              onChange={(e) => {
                const name = e.target.value;
                const matchingRec = vendorMaster.find((v: any) => v.vendorName === name);
                setPoForm((prev: any) => ({
                  ...prev,
                  vendorName: name,
                  paymentTerms: matchingRec?.paymentTerms || prev.paymentTerms || 'Net 30',
                  lines: [{ itemCode: '', itemName: '', quantity: matchingRec?.moq || 1, unitCost: 0, taxPercent: 10, moq: matchingRec?.moq || 1 }],
                }));
              }}
              options={[{ value: '', label: '-- Select contracted vendor --' }, ...uniqueVendors.map((v) => ({ value: v, label: v }))]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="font-bold block mb-1">Requested Delivery</label><Input type="date" value={poForm.requestedDeliveryDate} onChange={(e) => setPoForm({ ...poForm, requestedDeliveryDate: e.target.value })} /></div>
            <div><label className="font-bold block mb-1">Payment Terms *</label><Select value={poForm.paymentTerms} onChange={(e) => setPoForm({ ...poForm, paymentTerms: e.target.value })} options={['Net 7', 'Net 14', 'Net 30', 'Net 45', 'Net 60', 'Prepaid', 'COD'].map((v) => ({ value: v, label: v }))} /></div>
            <div><label className="font-bold block mb-1">Lead Time (days)</label><Input type="number" min="0" value={poForm.leadTimeDays} onChange={(e) => setPoForm({ ...poForm, leadTimeDays: e.target.value })} /></div>
          </div>
          <p className="text-[10px] text-slate-400">Minimum order quantity (MOQ) per item is enforced from the vendor's contracted minimum.</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold">Items</label>
              <button type="button" onClick={() => setPoForm({ ...poForm, lines: [...poForm.lines, { itemCode: '', itemName: '', quantity: 1, unitCost: 0, taxPercent: 10, moq: 1 }] })} className="text-[11px] font-bold text-indigo-700">+ Add Item</button>
            </div>
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="col-span-6">Item</span>
              <span className="col-span-2">Quantity</span>
              <span className="col-span-3">Unit Cost</span>
              <span className="col-span-1"></span>
            </div>
            {poForm.lines.map((l: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <ItemPicker
                  items={allowedPoItems}
                  className="col-span-6"
                  value={{ itemCode: l.itemCode, itemName: l.itemName }}
                  placeholder="Search item..."
                  onChange={(v) => { const n = [...poForm.lines]; n[i] = { ...n[i], itemCode: v.itemCode, itemName: v.itemName, unitCost: v.unitCost || n[i].unitCost, moq: (v as any).moq || 1, quantity: Math.max(n[i].quantity, (v as any).moq || 1) }; setPoForm({ ...poForm, lines: n }); }}
                />
                <input type="number" min={l.moq || 1} className="col-span-2 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 placeholder:text-slate-400" placeholder="0" value={l.quantity} onChange={(e) => { const n = [...poForm.lines]; n[i].quantity = Number(e.target.value); setPoForm({ ...poForm, lines: n }); }} />
                  <input type="number" step="0.01" readOnly className="col-span-3 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold focus:outline-none cursor-not-allowed" placeholder="0.00" value={l.unitCost} />
                <div className="col-span-1 flex justify-center">
                  {poForm.lines.length > 1 && (
                    <button type="button" onClick={() => { const n = poForm.lines.filter((_: any, idx: number) => idx !== i); setPoForm({ ...poForm, lines: n }); }} className="text-rose-400 hover:text-rose-600 text-[11px]">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsPoModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Purchase Order</Button>
          </div>
        </form>
      </Modal>

      {/* Sales Invoice create — SO dropdown auto-populates lines */}
      <Modal isOpen={isCiModalOpen} onClose={() => setIsCiModalOpen(false)} title="Create Sales Invoice" maxWidth="2xl">
        <form onSubmit={submitCi} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold block mb-1">Sales Order No. *</label>
              <Select
                value={ciForm.salesOrderNumber}
                onChange={(e) => { setCiForm({ ...ciForm, salesOrderNumber: e.target.value }); populateCiFromSo(e.target.value); }}
                options={[{ value: '', label: '— Select SO (Delivered) —' }, ...salesOrders.filter((s) => ['DELIVERED', 'INVOICED', 'PARTIALLY_PAID', 'PAID'].includes(s.status)).map((s) => ({ value: s.salesOrderNumber, label: `${s.salesOrderNumber} — ${s.customerName} (${s.status.replace(/_/g, ' ')})` }))]}
              />
            </div>
            <div><label className="font-bold block mb-1">Dispatch No.</label><Input value={ciForm.dispatchNumber} onChange={(e) => setCiForm({ ...ciForm, dispatchNumber: e.target.value })} placeholder="DSP-2026-00087" /></div>
            <div><label className="font-bold block mb-1">Due Date *</label><Input type="date" value={ciForm.dueDate} onChange={(e) => setCiForm({ ...ciForm, dueDate: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1">Customer Name *</label>
              <Select
                value={ciForm.customerName}
                onChange={(e) => setCiForm({ ...ciForm, customerName: e.target.value })}
                options={[{ value: '', label: '— Select customer —' }, ...uniqueCustomers.map((c) => ({ value: c, label: c }))]}
              />
            </div>
            <div><label className="font-bold block mb-1">Customer Email</label><Input type="email" value={ciForm.customerEmail} onChange={(e) => setCiForm({ ...ciForm, customerEmail: e.target.value })} /></div>
          </div>
          <div><label className="font-bold block mb-1">Billing Address</label><Input value={ciForm.billingAddress} onChange={(e) => setCiForm({ ...ciForm, billingAddress: e.target.value })} /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold">Items {ciForm.salesOrderNumber && <span className="text-indigo-600 font-normal ml-2">(auto-populated from SO)</span>}</label>
              <button type="button" onClick={() => setCiForm({ ...ciForm, lines: [...ciForm.lines, { itemCode: '', itemName: '', quantity: 1, unitPrice: 0, taxPercent: 10 }] })} className="text-[11px] font-bold text-indigo-700">+ Add Item</button>
            </div>
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="col-span-6">Item</span>
              <span className="col-span-2">Quantity</span>
              <span className="col-span-3">Unit Price</span>
              <span className="col-span-1"></span>
            </div>
            {ciForm.lines.map((l: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <ItemPicker
                  items={items}
                  className="col-span-6"
                  value={{ itemCode: l.itemCode, itemName: l.itemName }}
                  placeholder="Search item..."
                  onChange={(v) => { const n = [...ciForm.lines]; n[i] = { ...n[i], itemCode: v.itemCode, itemName: v.itemName, unitPrice: v.sellingPrice || n[i].unitPrice }; setCiForm({ ...ciForm, lines: n }); }}
                />
                <input type="number" min="1" className="col-span-2 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 placeholder:text-slate-400" placeholder="0" value={l.quantity} onChange={(e) => { const n = [...ciForm.lines]; n[i].quantity = Number(e.target.value); setCiForm({ ...ciForm, lines: n }); }} />
                <input type="number" step="0.01" className="col-span-3 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 placeholder:text-slate-400" placeholder="0.00" value={l.unitPrice} onChange={(e) => { const n = [...ciForm.lines]; n[i].unitPrice = Number(e.target.value); setCiForm({ ...ciForm, lines: n }); }} />
                <div className="col-span-1 flex justify-center">
                  {ciForm.lines.length > 1 && (
                    <button type="button" onClick={() => { const n = ciForm.lines.filter((_: any, idx: number) => idx !== i); setCiForm({ ...ciForm, lines: n }); }} className="text-rose-400 hover:text-rose-600 text-[11px]">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsCiModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Sales Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* Vendor Invoice — vendor dropdown + PO link */}
      <Modal isOpen={isViModalOpen} onClose={() => setIsViModalOpen(false)} title="Register Vendor Invoice" maxWidth="lg">
        <form onSubmit={submitVi} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="font-bold block mb-1">Vendor Invoice No. *</label><Input value={viForm.vendorInvoiceNumber} onChange={(e) => setViForm({ ...viForm, vendorInvoiceNumber: e.target.value })} required /></div>
            <div>
              <label className="font-bold block mb-1">Linked PO Number *</label>
              <Select
                value={viForm.linkedPoNumber}
                onChange={(e) => {
                  const po = purchaseOrders.find((p) => p.poNumber === e.target.value);
                  setViForm({ ...viForm, linkedPoNumber: e.target.value, vendorName: po?.vendorName || viForm.vendorName });
                }}
                options={[{ value: '', label: '— Select PO —' }, ...purchaseOrders.map((p) => ({ value: p.poNumber, label: `${p.poNumber} — ${p.vendorName}` }))]}
              />
            </div>
          </div>
          <div>
            <label className="font-bold block mb-1">Vendor Name *</label>
            <Select
              value={viForm.vendorName}
              onChange={(e) => setViForm({ ...viForm, vendorName: e.target.value })}
              options={[{ value: '', label: '— Select vendor —' }, ...uniqueVendors.map((v) => ({ value: v, label: v }))]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="font-bold block mb-1">Invoice Date</label><Input type="date" value={viForm.invoiceDate} onChange={(e) => setViForm({ ...viForm, invoiceDate: e.target.value })} /></div>
            <div><label className="font-bold block mb-1">Due Date *</label><Input type="date" value={viForm.dueDate} onChange={(e) => setViForm({ ...viForm, dueDate: e.target.value })} required /></div>
            <div><label className="font-bold block mb-1">Invoice Amount *</label><Input type="number" step="0.01" value={viForm.invoiceAmount} onChange={(e) => setViForm({ ...viForm, invoiceAmount: e.target.value })} required /></div>
          </div>
          <div>
            <label className="font-bold block mb-1">Invoice Attachment</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={handleViAttachmentUpload}
              className="block w-full text-[11px] text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {viForm.attachment && (
              <p className="text-[11px] text-indigo-700 font-bold mt-1 flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> {viForm.attachment.fileName}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsViModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Register Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* Vendor payment modal */}
      <Modal isOpen={isVpModalOpen} onClose={() => setIsVpModalOpen(false)} title={`Record Vendor Payment — ${payTarget?.vendorInvoiceNumber || ''}`} maxWidth="md">
        {payTarget && (
          <form onSubmit={submitVpay} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Vendor Invoice</div>
              <div className="font-bold text-slate-900">{payTarget.vendorInvoiceNumber} — {payTarget.vendorName}</div>
              <div className="text-[11px] text-slate-500">Outstanding: {payTarget.currency} {(payTarget.invoiceAmount - payTarget.amountPaid).toFixed(2)}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="font-bold block mb-1">Payment Date *</label><Input type="date" value={vpForm.paymentDate} onChange={(e) => setVpForm({ ...vpForm, paymentDate: e.target.value })} required /></div>
              <div><label className="font-bold block mb-1">Amount Paid *</label><Input type="number" step="0.01" min="0" value={vpForm.amountPaid} onChange={(e) => setVpForm({ ...vpForm, amountPaid: e.target.value })} required /></div>
              <div><label className="font-bold block mb-1">Payment Method *</label><Select value={vpForm.paymentMethod} onChange={(e) => setVpForm({ ...vpForm, paymentMethod: e.target.value })} options={['EFT', 'Cheque', 'BPAY', 'Wire Transfer', 'Credit Card'].map((v) => ({ value: v, label: v }))} /></div>
              <div><label className="font-bold block mb-1">Bank Reference No.</label><Input value={vpForm.bankReferenceNumber} onChange={(e) => setVpForm({ ...vpForm, bankReferenceNumber: e.target.value })} /></div>
            </div>
            <div><label className="font-bold block mb-1">Comments</label><Input value={vpForm.comments} onChange={(e) => setVpForm({ ...vpForm, comments: e.target.value })} /></div>
            <div>
              <label className="font-bold block mb-1">Payment Receipt *</label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleVpReceiptUpload}
                className="block w-full text-[11px] text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {vpForm.receiptAttachment && (
                <p className="text-[11px] text-indigo-700 font-bold mt-1">Attached: {vpForm.receiptAttachment.fileName}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-1">The vendor will see this attached to their payment once recorded.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setIsVpModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Record Payment</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Customer payment modal (Integrated Step 8) */}
      <Modal isOpen={isCpModalOpen} onClose={() => setIsCpModalOpen(false)} title={`Record Customer Payment — ${cpTarget?.invoiceNumber || ''}`} maxWidth="md">
        {cpTarget && (() => {
          const outstanding = Math.max(0, cpTarget.totalValue - (cpTarget.amountPaid || 0));
          const currentEntry = Number(cpForm.amount) || 0;
          const remainingAfter = Math.max(0, outstanding - currentEntry);

          return (
            <form onSubmit={submitCpay} className="space-y-4 text-xs">
              {/* Header Summary & Live Balance Calculator */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-teal-50 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-bold text-indigo-800 uppercase">Customer Invoice</div>
                    <div className="font-extrabold text-slate-900 text-sm">{cpTarget.invoiceNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono font-bold text-indigo-800 uppercase">Billed Customer</div>
                    <div className="font-bold text-slate-900">{cpTarget.customerName}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-200/60 text-center font-mono">
                  <div className="bg-white/70 p-2 rounded-xl border border-indigo-100">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Total Invoiced</div>
                    <div className="font-bold text-slate-800 text-xs">{cpTarget.currency} {cpTarget.totalValue.toFixed(2)}</div>
                  </div>
                  <div className="bg-white/70 p-2 rounded-xl border border-indigo-100">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Outstanding</div>
                    <div className="font-bold text-rose-700 text-xs">{cpTarget.currency} {outstanding.toFixed(2)}</div>
                  </div>
                  <div className="bg-white/70 p-2 rounded-xl border border-indigo-100">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Bal After Pay</div>
                    <div className={`font-bold text-xs ${remainingAfter === 0 ? 'text-indigo-700' : 'text-amber-700'}`}>
                      {cpTarget.currency} {remainingAfter.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Date *</label>
                  <Input type="date" value={cpForm.paymentDate} onChange={(e) => setCpForm({ ...cpForm, paymentDate: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Amount *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={outstanding}
                    value={cpForm.amount}
                    onChange={(e) => setCpForm({ ...cpForm, amount: e.target.value })}
                    required
                    className="font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method *</label>
                  <Select
                    value={cpForm.paymentMethod}
                    onChange={(e) => setCpForm({ ...cpForm, paymentMethod: e.target.value })}
                    options={['EFT', 'Wire Transfer', 'Credit Card', 'BPAY', 'Direct Debit', 'Cheque'].map((v) => ({ value: v, label: v }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Bank Reference No.</label>
                  <Input
                    placeholder="e.g. EFT-NAB-889921"
                    value={cpForm.bankReference}
                    onChange={(e) => setCpForm({ ...cpForm, bankReference: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Remittance Notes / Memo</label>
                <Input
                  placeholder="e.g. Cleared into NAB Main Account"
                  value={cpForm.notes}
                  onChange={(e) => setCpForm({ ...cpForm, notes: e.target.value })}
                />
              </div>

              {/* Remittance Receipt File Upload Zone */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700 block">Bank Remittance Receipt / Payment Slip (Optional)</label>
                <div className="p-3.5 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center transition-colors">
                  <input
                    type="file"
                    id="receipt-file-upload"
                    accept="image/*,application/pdf"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                  <label htmlFor="receipt-file-upload" className="cursor-pointer flex flex-col items-center space-y-1">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-indigo-700 hover:text-indigo-800">Click to upload bank transfer slip / receipt PDF</span>
                    <span className="text-[10px] text-slate-400">Supports PDF, PNG, JPG, WEBP (Max 5MB)</span>
                  </label>
                </div>

                {cpForm.receiptAttachment && (
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded-lg bg-indigo-100 text-indigo-800 shrink-0">
                        <FileCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-indigo-900 text-xs truncate">{cpForm.receiptAttachment.fileName}</div>
                        <div className="text-[10px] text-indigo-700">{cpForm.receiptAttachment.fileSize || 'Attached'} · Ready to save</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCpForm({ ...cpForm, receiptAttachment: null, receiptFileName: '' })}
                      className="p-1 rounded-lg hover:bg-indigo-200/60 text-indigo-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setIsCpModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                  Record & Allocate Payment
                </Button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Customer Payment & Remittance Receipts History Modal */}
      <Modal isOpen={!!paymentHistoryModalCi} onClose={() => setPaymentHistoryModalCi(null)} title={`Payment Remittances & Receipts — ${paymentHistoryModalCi?.invoiceNumber || ''}`} maxWidth="2xl">
        {paymentHistoryModalCi && (() => {
          const matchedPayments = customerPayments.filter((p) => p.customerInvoiceId === paymentHistoryModalCi.id || p.invoiceNumber === paymentHistoryModalCi.invoiceNumber);

          return (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-indigo-800 font-bold">Invoice Settlement Summary</div>
                  <div className="font-extrabold text-slate-900 text-sm">{paymentHistoryModalCi.invoiceNumber} · {paymentHistoryModalCi.customerName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase text-slate-500 font-bold">Total Paid to Date</div>
                  <div className="font-mono font-black text-indigo-700 text-sm">
                    {paymentHistoryModalCi.currency} {(paymentHistoryModalCi.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} / {paymentHistoryModalCi.currency} {paymentHistoryModalCi.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-mono uppercase">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Payment No.</th>
                      <th className="py-2.5 px-3 font-bold">Payment Date</th>
                      <th className="py-2.5 px-3 font-bold">Method & Ref</th>
                      <th className="py-2.5 px-3 font-bold text-right">Amount</th>
                      <th className="py-2.5 px-3 font-bold text-center">Receipt Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matchedPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{p.paymentNumber}</td>
                        <td className="py-2.5 px-3 text-slate-700">{new Date(p.paymentDate).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{p.paymentMethod}</div>
                          <div className="font-mono text-[10px] text-slate-500">{p.bankReference}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                          {p.currency} {p.amount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {p.receiptAttachment || p.receiptFileName ? (
                            <button
                              onClick={() => setReceiptViewerCp(p)}
                              className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-[10px] font-bold inline-flex items-center gap-1"
                            >
                              <Paperclip className="w-3 h-3" /> View Slip
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-mono">No slip</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {matchedPayments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">No payment receipts recorded for this invoice.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setPaymentHistoryModalCi(null)}>
                  Close
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Payment Remittance Receipt Viewer Modal */}
      <Modal isOpen={!!receiptViewerCp} onClose={() => setReceiptViewerCp(null)} title={`Bank Remittance Slip — ${receiptViewerCp?.paymentNumber || ''}`} maxWidth="2xl">
        {receiptViewerCp && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-teal-50 border border-indigo-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold text-indigo-800 uppercase">Payment Receipt</div>
                  <div className="font-black text-slate-900 text-sm">{receiptViewerCp.paymentNumber} · {receiptViewerCp.currency} {receiptViewerCp.amount?.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-right text-[11px]">
                <div className="text-slate-500 font-mono text-[10px]">Reference</div>
                <div className="font-mono font-bold text-slate-900">{receiptViewerCp.bankReference}</div>
              </div>
            </div>

            {receiptViewerCp.receiptAttachment?.fileData ? (
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-900/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-indigo-600" /> {receiptViewerCp.receiptAttachment.fileName}</span>
                  <a
                    href={receiptViewerCp.receiptAttachment.fileData}
                    download={receiptViewerCp.receiptAttachment.fileName || 'Remittance-Slip.pdf'}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>

                {receiptViewerCp.receiptAttachment.fileType?.startsWith('image/') || receiptViewerCp.receiptAttachment.fileData.startsWith('data:image/') ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white max-h-[380px] flex items-center justify-center p-2">
                    <img
                      src={receiptViewerCp.receiptAttachment.fileData}
                      alt="Bank Remittance Receipt"
                      className="max-h-[360px] w-auto object-contain rounded-lg shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white h-[350px]">
                    <iframe
                      src={receiptViewerCp.receiptAttachment.fileData}
                      title="Remittance Receipt PDF"
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="font-bold text-slate-800">Payment Reference: {receiptViewerCp.receiptFileName || receiptViewerCp.bankReference}</div>
                <div className="text-slate-600">Payment of <strong>{receiptViewerCp.currency} {receiptViewerCp.amount?.toFixed(2)}</strong> cleared via <strong>{receiptViewerCp.paymentMethod}</strong> on {new Date(receiptViewerCp.paymentDate).toLocaleDateString()}.</div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setReceiptViewerCp(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Dispatch Note Modal */}
      <Modal isOpen={!!createDnModalSo} onClose={() => setCreateDnModalSo(null)} title={`Create Dispatch Note — ${createDnModalSo?.salesOrderNumber || ''}`} maxWidth="2xl">
        {createDnModalSo && (
          <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Customer details</div>
              <div className="font-bold text-slate-900">{createDnModalSo.customerName}</div>
              <div className="text-[10px] text-slate-500 mt-1">Delivery Address: {createDnModalSo.deliveryLocation}</div>
            </div>

            <div>
              <label className="font-bold block mb-1">Select Dispatched Warehouse *</label>
              <Select
                value={createDnForm.warehouseCode}
                onChange={(e) => setCreateDnForm({ ...createDnForm, warehouseCode: e.target.value })}
                options={[
                  { value: '', label: '-- Select Warehouse --' },
                  // Only warehouses that have an allocation on this SO AND don't already
                  // have a dispatch note — once a warehouse is covered it drops off this
                  // list so the same allocation can't be dispatched twice.
                  ...getUncoveredWarehouses(createDnModalSo)
                    .map((whCode: any) => ({ value: whCode as string, label: (warehouses.find(w => w.code === whCode)?.name || whCode) as string }))
                ]}
                required
              />
              {getUncoveredWarehouses(createDnModalSo).length === 0 && (
                <p className="text-[11px] text-emerald-700 mt-1.5">Every allocated warehouse already has a dispatch note for this order.</p>
              )}
            </div>

            {createDnForm.warehouseCode && (
              <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-mono uppercase">
                    <tr>
                      <th className="py-2 px-3">Item Code</th>
                      <th className="py-2 px-3">Item Name</th>
                      <th className="py-2 px-3">Ordered</th>
                      <th className="py-2 px-3 font-bold text-indigo-700">Allocated to Dispatch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {createDnModalSo.lines.filter((l: any) => l.allocatedWarehouses?.some((w: any) => w.warehouseCode === createDnForm.warehouseCode)).map((l: any) => {
                      const allocQty = l.allocatedWarehouses.find((w: any) => w.warehouseCode === createDnForm.warehouseCode)?.qty || 0;
                      return (
                        <tr key={l.id}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{l.itemCode}</td>
                          <td className="py-2 px-3 text-slate-700 truncate max-w-[200px]">{l.itemName}</td>
                          <td className="py-2 px-3">{l.quantity}</td>
                          <td className="py-2 px-3 font-bold text-indigo-700">{allocQty}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Carrier, tracking number, and dispatch date are entered by the vendor/warehouse at the actual Dispatch step — not known yet at this stage.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="font-bold block mb-1">Expected Delivery Date</label><Input type="date" value={createDnForm.expectedDeliveryDate} onChange={(e) => setCreateDnForm({ ...createDnForm, expectedDeliveryDate: e.target.value })} /></div>
              <div><label className="font-bold block mb-1">Comments / Notes</label><Input value={createDnForm.comments} onChange={(e) => setCreateDnForm({ ...createDnForm, comments: e.target.value })} placeholder="Delivery instructions..." /></div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setCreateDnModalSo(null)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={!createDnForm.warehouseCode}>Create Dispatch Note</Button>
            </div>
          </form>
        )}
      </Modal>

      
      {/* Step 6: Confirm Customer Delivery & POD Modal (Owner View) */}
      <Modal isOpen={!!deliveryModalDn} onClose={() => setDeliveryModalDn(null)} title={deliveryModalDn?.status === 'DELIVERED' ? `Manage Proof of Delivery (POD) — ${deliveryModalDn?.dispatchNumber || ''}` : `Confirm Customer Delivery & POD — ${deliveryModalDn?.dispatchNumber || ''}`} maxWidth="2xl">
        {deliveryModalDn && (
          <form onSubmit={submitDeliveryPOD} className="space-y-4 text-xs">
            {/* Header Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Sales Order Reference</div>
                <div className="font-extrabold text-slate-900 text-sm">{deliveryModalDn.salesOrderNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Carrier</div>
                <div className="font-bold text-sky-800 font-mono text-xs">{deliveryModalDn.carrier || 'Not recorded'}</div>
              </div>
            </div>

            {/* Destination Card */}
            <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-1">
              <div className="text-[10px] font-mono font-bold text-sky-800 uppercase flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600" /> Delivery Address
              </div>
              <div className="font-bold text-slate-900">{deliveryModalDn.customerName}</div>
              <div className="text-[11px] text-slate-600">{deliveryModalDn.customerAddress || 'Not recorded'}</div>
            </div>

            {/* Receiver & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Receiver Name / Authorized Contact *</label>
                <Input
                  required
                  placeholder="e.g. Mark Stevens (Receiving Supervisor)"
                  value={deliveryForm.receiverName}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, receiverName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Date & Time *</label>
                <Input
                  type="datetime-local"
                  required
                  value={deliveryForm.deliveryDateTime}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDateTime: e.target.value })}
                />
              </div>
            </div>

            {/* Line Items Delivery Acceptance */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold text-slate-700 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1"><Box className="w-3.5 h-3.5 text-indigo-600" /> Delivered Items Verification</span>
                <span className="text-slate-500 font-normal">Confirm accepted quantities & condition</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-mono uppercase">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Item SKU & Name</th>
                      <th className="py-2.5 px-3 font-bold text-center">Dispatched</th>
                      <th className="py-2.5 px-3 font-bold text-right">Delivered Qty *</th>
                      <th className="py-2.5 px-3 font-bold">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(deliveryForm.lines || []).map((line: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-900">{line.itemCode}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{line.itemName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                          {line.dispatchQty || line.orderedQty || 1}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            max={line.dispatchQty || line.orderedQty || 99999}
                            value={line.deliveredQty || ''}
                            onChange={(e) => {
                              const updated = [...deliveryForm.lines];
                              updated[idx] = { ...updated[idx], deliveredQty: Number(e.target.value) };
                              setDeliveryForm({ ...deliveryForm, lines: updated });
                            }}
                            className="w-20 text-right font-bold ml-auto"
                            required
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <Select
                            value={line.condition || 'GOOD'}
                            onChange={(e) => {
                              const updated = [...deliveryForm.lines];
                              updated[idx] = { ...updated[idx], condition: e.target.value };
                              setDeliveryForm({ ...deliveryForm, lines: updated });
                            }}
                            options={[
                              { value: 'GOOD', label: 'Good - Accepted' },
                              { value: 'MINOR_SCUFF', label: 'Minor Scuff - Accepted' },
                              { value: 'DAMAGED_PARTIAL', label: 'Damaged in Transit' },
                              { value: 'REJECTED', label: 'Rejected at Dock' },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* File Upload Zone */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-700 block">Attach Customer Emailed Proof of Delivery (POD) *</label>
              
              <div className="p-4 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center transition-colors">
                <input
                  type="file"
                  id="b2b-pod-upload"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="b2b-pod-upload" className="cursor-pointer flex flex-col items-center space-y-1">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Click to upload customer's signed POD slip / PDF</span>
                  <span className="text-[10px] text-slate-400">Supports PDF, PNG, JPG, WEBP (Max 5MB)</span>
                </label>
              </div>

              {deliveryForm.attachment && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800 shrink-0">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-indigo-900 text-xs truncate">{deliveryForm.attachment.fileName}</div>
                      <div className="text-[10px] text-indigo-700">{deliveryForm.attachment.fileSize || 'Attached'} • Ready to attach</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeliveryForm({ ...deliveryForm, attachment: null, podReference: '' })}
                    className="p-1 rounded-lg hover:bg-indigo-200/60 text-indigo-800"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">POD Reference Code / Email Ref *</label>
                  <Input
                    required
                    placeholder="e.g. POD-EMAIL-TC901.pdf"
                    value={deliveryForm.podReference}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, podReference: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Delivery Notes (Optional)</label>
                  <Input
                    placeholder="e.g. Emailed by accounts@techcorp.com"
                    value={deliveryForm.comments}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, comments: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setDeliveryModalDn(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                Confirm Delivery & Lock POD
              </Button>
            </div>
          </form>
        )}
      </Modal>

      
      {/* Send Customer Invoice Email Modal */}
      <Modal isOpen={!!sendInvoiceModalCi} onClose={() => setSendInvoiceModalCi(null)} title={`Send Tax Invoice — ${sendInvoiceModalCi?.invoiceNumber || ''}`} maxWidth="lg">
        {sendInvoiceModalCi && (
          <form onSubmit={submitSendInvoice} className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase text-sky-700 font-bold">Invoice Summary</div>
                <div className="font-extrabold text-slate-900">{sendInvoiceModalCi.invoiceNumber} · {sendInvoiceModalCi.customerName}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-sky-700 font-bold">Total Amount</div>
                <div className="font-mono font-black text-sky-900 text-sm">{sendInvoiceModalCi.currency} {sendInvoiceModalCi.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Recipient Email(s) * (comma-separate to send individually to each)</label>
                <Input
                  type="text"
                  required
                  placeholder="accounts@customer.com, manager@customer.com"
                  value={sendEmailForm.to}
                  onChange={(e) => setSendEmailForm({ ...sendEmailForm, to: e.target.value })}
                />
                <p className="text-[11px] text-slate-500 mt-1">Each address gets its own separate email — no recipient sees who else it was sent to.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">CC (comma-separate multiple addresses)</label>
                <Input
                  type="text"
                  placeholder="accounts@logiqon.com, manager@customer.com"
                  value={sendEmailForm.cc}
                  onChange={(e) => setSendEmailForm({ ...sendEmailForm, cc: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Subject Line *</label>
                <Input
                  required
                  value={sendEmailForm.subject}
                  onChange={(e) => setSendEmailForm({ ...sendEmailForm, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Message *</label>
                <textarea
                  required
                  rows={5}
                  value={sendEmailForm.message}
                  onChange={(e) => setSendEmailForm({ ...sendEmailForm, message: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed"
                />
              </div>

              {/* Each sent email includes a link to view/print this invoice — not a
                  binary attachment, since the invoice is rendered as a printable page
                  rather than a stored PDF file. */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{sendInvoiceModalCi.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-500">A "View / Print" link to this invoice is included in the email</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(`/api/customer-invoices/${sendInvoiceModalCi.id}/print`, '_blank')}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Preview
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setSendInvoiceModalCi(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" leftIcon={<Send className="w-4 h-4" />}>
                Send Invoice Email
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Customer Invoice Details Modal */}
      <Modal isOpen={!!viewInvoiceModalCi} onClose={() => setViewInvoiceModalCi(null)} title={`Sales Invoice Details — ${viewInvoiceModalCi?.invoiceNumber || ''}`} maxWidth="2xl">
        {viewInvoiceModalCi && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-500">Invoice No.</div>
                <div className="font-mono font-black text-indigo-700">{viewInvoiceModalCi.invoiceNumber}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-500">Sales Order</div>
                <div className="font-mono font-bold text-slate-800">{viewInvoiceModalCi.salesOrderNumber}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-500">Customer</div>
                <div className="font-bold text-slate-900 truncate">{viewInvoiceModalCi.customerName}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-500">Status</div>
                <div><StatusPill status={viewInvoiceModalCi.status} /></div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-mono text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Item Code</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewInvoiceModalCi.lines || []).map((l: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{l.itemCode}</td>
                      <td className="py-2 px-3 text-slate-600">{l.itemName}</td>
                      <td className="py-2 px-3 text-right font-bold">{l.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono">{viewInvoiceModalCi.currency} {(l.unitPrice || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{viewInvoiceModalCi.currency} {(l.lineTotal || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-0.5 text-[11px] text-slate-600">
                <div><strong>Issue Date:</strong> {new Date(viewInvoiceModalCi.issueDate).toLocaleDateString()}</div>
                <div><strong>Due Date:</strong> {new Date(viewInvoiceModalCi.dueDate).toLocaleDateString()}</div>
                {viewInvoiceModalCi.sentAt && <div><strong>Sent Timestamp:</strong> {new Date(viewInvoiceModalCi.sentAt).toLocaleString()}</div>}
                {viewInvoiceModalCi.viewedAt && <div><strong>Customer Viewed:</strong> {new Date(viewInvoiceModalCi.viewedAt).toLocaleString()}</div>}
              </div>
              <div className="text-right space-y-1">
                <div className="text-slate-500 text-[11px]">Total Invoice: <span className="font-mono font-bold text-slate-900">{viewInvoiceModalCi.currency} {viewInvoiceModalCi.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div className="text-indigo-700 font-bold text-xs">Paid: <span className="font-mono">{viewInvoiceModalCi.currency} {(viewInvoiceModalCi.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div className="text-rose-600 font-black text-sm">Balance: <span className="font-mono">{viewInvoiceModalCi.currency} {Math.max(0, viewInvoiceModalCi.totalValue - (viewInvoiceModalCi.amountPaid || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.open(`/api/customer-invoices/${viewInvoiceModalCi.id}/print`, '_blank')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 border border-indigo-200"
              >
                <Printer className="w-3.5 h-3.5" /> Print / PDF
              </button>
              <Button type="button" variant="secondary" onClick={() => setViewInvoiceModalCi(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Proof of Delivery (POD) Document Viewer Modal (Owner View) */}
      <Modal isOpen={!!podViewerDn} onClose={() => setPodViewerDn(null)} title={`Proof of Delivery Document — ${podViewerDn?.dispatchNumber || ''}`} maxWidth="2xl">
        {podViewerDn && (
          <div className="space-y-4 text-xs font-sans">
            {/* Top Certificate Header */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-teal-50 border border-indigo-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold font-mono">
                    ✓ VERIFIED PROOF OF DELIVERY (POD)
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">Delivery Confirmation</h3>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Delivered Date</div>
                <div className="font-extrabold text-slate-900 font-mono text-xs">{podViewerDn.actualDeliveryDate ? new Date(podViewerDn.actualDeliveryDate).toLocaleDateString() : 'Confirmed'}</div>
              </div>
            </div>

            {/* Delivery Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">Sales Order</span>
                <span className="font-extrabold text-slate-900 font-mono">{podViewerDn.salesOrderNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">Customer</span>
                <span className="font-bold text-slate-900 truncate block">{podViewerDn.customerName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">Received By</span>
                <span className="font-bold text-indigo-700">{podViewerDn.receiverName || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">Carrier</span>
                <span className="font-mono font-bold text-slate-900">{podViewerDn.carrier || 'Not recorded'}</span>
              </div>
            </div>

            {/* Render Attached File or Digital Certificate */}
            {podViewerDn.attachment?.fileData ? (
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-900/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-indigo-600" /> {podViewerDn.attachment.fileName}</span>
                  <a
                    href={podViewerDn.attachment.fileData}
                    download={podViewerDn.attachment.fileName || 'POD-Document.pdf'}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>

                {podViewerDn.attachment.fileType?.startsWith('image/') || podViewerDn.attachment.fileData.startsWith('data:image/') ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white max-h-[380px] flex items-center justify-center p-2">
                    <img
                      src={podViewerDn.attachment.fileData}
                      alt="Proof of Delivery Scan"
                      className="max-h-[360px] w-auto object-contain rounded-lg shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white h-[350px]">
                    <iframe
                      src={podViewerDn.attachment.fileData}
                      title="Proof of Delivery Document"
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="font-mono font-bold text-slate-700 text-xs">DOCUMENT REFERENCE: {podViewerDn.podReference || podViewerDn.attachment?.fileName || `POD-${podViewerDn.dispatchNumber}.pdf`}</div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">DIGITALLY SIGNED</span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1">
                  <div><strong>Delivery Location:</strong> {podViewerDn.customerAddress}</div>
                  <div><strong>Carrier Transporter:</strong> {podViewerDn.carrier || 'Not recorded'}</div>
                  <div><strong>Delivery Notes (Optional):</strong> {podViewerDn.comments || 'Not recorded'}</div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Item Code</th>
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-3 text-right">Delivered Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(podViewerDn.lines || []).map((l: any, i: number) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{l.itemCode}</td>
                          <td className="py-2 px-3 text-slate-600">{l.itemName}</td>
                          <td className="py-2 px-3 font-bold text-right text-indigo-700">{l.deliveredQty || l.dispatchQty || l.orderedQty} units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-mono">Signatory Acceptance:</span>
                    <span className="font-bold text-slate-900">{podViewerDn.receiverName || 'Not recorded'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] font-mono">Handover Timestamp:</span>
                    <span className="font-mono font-bold text-slate-900">{podViewerDn.actualDeliveryDate ? new Date(podViewerDn.actualDeliveryDate).toLocaleString() : new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setPodViewerDn(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        )}
      </Modal>

        {/* Advanced Allocation Modal */}
      <Modal isOpen={!!allocModalSo} onClose={() => setAllocModalSo(null)} title={`Allocate Stock — ${allocModalSo?.salesOrderNumber || ''}`} maxWidth="2xl">
        {allocModalSo && (
          <form onSubmit={handleAllocationSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Customer</div>
                <div className="font-bold text-slate-900">{allocModalSo.customerName}</div>
                <div className="text-[10px] text-slate-500 mt-1">Delivery: {allocModalSo.deliveryLocation}</div>
              </div>
              <div>
                <label className="font-bold block mb-1">Select Source Warehouse *</label>
                <Select
                  value={allocWhCode}
                  onChange={(e) => loadWhStockForAlloc(e.target.value)}
                  options={[
                    { value: '', label: '-- Select Warehouse --' },
                    ...warehouses.map(w => ({ value: w.code, label: `${w.code} - ${w.name}` }))
                  ]}
                  required
                />
                {allocWhCode && (
                  <div className="text-[10px] text-indigo-700 mt-1 bg-indigo-50 p-2 rounded">Live stock loaded for {allocWhCode}.</div>
                )}
              </div>
            </div>

            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-mono uppercase">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Ordered</th>
                    <th className="py-2 px-3">Already Allocated</th>
                    <th className="py-2 px-3">Available at Warehouse</th>
                    <th className="py-2 px-3">Allocating Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {allocModalSo.lines.map((l: any) => {
                    const prevAlloc = l.allocatedWarehouses?.reduce((sum: number, aw: any) => sum + aw.qty, 0) || 0;
                    const remaining = l.quantity - prevAlloc;
                    const atp = allocWhStock.find(s => s.sku === l.itemCode)?.quantityAvailable || 0;
                    return (
                      <tr key={l.id}>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">{l.itemCode}</div>
                          <div className="text-[10px] text-slate-500 truncate w-32">{l.itemName}</div>
                        </td>
                        <td className="py-2 px-3 font-bold">{l.quantity}</td>
                        <td className="py-2 px-3 text-slate-500">{prevAlloc}</td>
                        <td className="py-2 px-3">
                          {allocWhCode ? (
                            <span className={`font-mono font-bold ${atp >= remaining ? 'text-indigo-600' : 'text-rose-600'}`}>{atp}</span>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-3">
                          {remaining > 0 ? (
                            <Input 
                              type="number" 
                              min="0" 
                              max={Math.min(remaining, atp)}
                              disabled={!allocWhCode || atp === 0}
                              value={allocLines[l.itemCode] || ''}
                              onChange={(e) => setAllocLines({...allocLines, [l.itemCode]: parseInt(e.target.value) || 0})}
                              placeholder="Qty"
                            />
                          ) : (
                            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded">Fully Allocated</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">You can allocate less than the full quantity if stock is insufficient.</div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setAllocModalSo(null)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={!allocWhCode || Object.values(allocLines).every(v => !v || v <= 0)}>Confirm Allocation</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
            </>
          );
        })()}


      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
