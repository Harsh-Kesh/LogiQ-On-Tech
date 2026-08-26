'use client';

// B2B Owner-Side System Functions & Transaction Workflow (per shared spec).
// Implements the 15 owner-side functions from LogiQ-On_Tech_Owner_Side_System_Functions.docx:
//   1  Sales Order Creation
//   2  Sales Order List & Status
//   3  Warehouse Stock Availability
//   4  Warehouse Allocation
//   5  Dispatch Note Creation
//   6  Dispatch Status Tracking
//   7  Sales Invoice Creation
//   8  Send Invoice to Customer
//   9  Purchase Order Creation
//   10 Purchase Order List & Status
//   11 Vendor Invoice Registration
//   12 Vendor Invoice View / Download
//   13 Vendor Payment Processing
//   14 Payment Status
//   15 Audit Trail

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import {
  ShoppingCart, ClipboardList, Warehouse, Truck, FileText, Send,
  Building, Receipt, DollarSign, Landmark, Activity, Plus,
  ArrowRight, CheckCircle2, PackageCheck, TrendingUp, Search, RefreshCw,
} from 'lucide-react';

type Tab = 'so' | 'stock' | 'alloc' | 'dispatch' | 'invoice' | 'send' | 'po' | 'vinv' | 'vpay' | 'audit';

const SO_STATUSES = ['DRAFT', 'CONFIRMED', 'STOCK_CHECK', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'INVOICED', 'PARTIALLY_PAID', 'PAID', 'COMPLETED', 'CANCELLED'];
const PO_STATUSES = ['DRAFT', 'APPROVED', 'SENT_TO_VENDOR', 'VENDOR_CONFIRMED', 'PARTIALLY_SUPPLIED', 'RECEIVED', 'VENDOR_INVOICE_RECEIVED', 'PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID', 'CLOSED', 'CANCELLED'];
const VI_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD', 'APPROVED', 'REJECTED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'];

function StatusPill({ status, variant = 'auto' }: { status: string; variant?: 'auto' }) {
  const s = status.toUpperCase();
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    CONFIRMED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    STOCK_CHECK: 'bg-purple-50 text-purple-700 border-purple-200',
    ALLOCATED: 'bg-teal-50 text-teal-700 border-teal-200',
    PARTIALLY_ALLOCATED: 'bg-amber-50 text-amber-700 border-amber-200',
    READY_FOR_DISPATCH: 'bg-blue-50 text-blue-700 border-blue-200',
    DISPATCHED: 'bg-blue-100 text-blue-800 border-blue-300',
    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INVOICED: 'bg-sky-50 text-sky-700 border-sky-200',
    SENT: 'bg-sky-50 text-sky-700 border-sky-200',
    SENT_TO_VENDOR: 'bg-sky-50 text-sky-700 border-sky-200',
    VENDOR_CONFIRMED: 'bg-teal-50 text-teal-700 border-teal-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
    PARTIALLY_PAID: 'bg-orange-50 text-orange-700 border-orange-200',
    PAYMENT_PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    CLOSED: 'bg-slate-200 text-slate-700 border-slate-300',
    CANCELLED: 'bg-slate-200 text-slate-600 border-slate-300',
    OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
    SUBMITTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    UNDER_REVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
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
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal state for the various create flows
  const [isSoModalOpen, setIsSoModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isCiModalOpen, setIsCiModalOpen] = useState(false);
  const [isViModalOpen, setIsViModalOpen] = useState(false);
  const [isVpModalOpen, setIsVpModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<any | null>(null);

  const [soForm, setSoForm] = useState<any>({
    customerName: '', customerPoReference: '', deliveryLocation: '', requestedDeliveryDate: '',
    paymentTerms: 'Net 30', currency: 'AUD',
    lines: [{ itemCode: '', itemName: '', quantity: 1, sellingPrice: 0, taxPercent: 10 }],
  });
  const [poForm, setPoForm] = useState<any>({
    vendorName: '', linkedSalesOrderNumber: '', requestedDeliveryDate: '',
    paymentTerms: 'Net 30', currency: 'AUD', moq: 0, leadTimeDays: 14,
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
    attachmentFileName: '',
  });
  const [vpForm, setVpForm] = useState<any>({
    paymentDate: new Date().toISOString().slice(0, 10),
    amountPaid: 0,
    paymentMethod: 'EFT',
    bankReferenceNumber: '',
    comments: '',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [so, po, ci, vi, dn, wh, ad, mi] = await Promise.all([
        fetch('/api/sales-orders').then((r) => r.json()),
        fetch('/api/purchase-orders').then((r) => r.json()),
        fetch('/api/customer-invoices').then((r) => r.json()),
        fetch('/api/vendor-invoices').then((r) => r.json()),
        fetch('/api/dispatch-notes').then((r) => r.json()),
        fetch('/api/inventory/warehouses').then((r) => r.json()),
        fetch('/api/audit?module=GOVERNANCE&limit=25').then((r) => r.json()).catch(() => ({ logs: [] })),
        fetch('/api/mdm/items').then((r) => r.json()).catch(() => ({ items: [] })),
      ]);
      setSalesOrders(so.salesOrders || []);
      setPurchaseOrders(po.purchaseOrders || []);
      setCustomerInvoices(ci.customerInvoices || []);
      setVendorInvoices(vi.vendorInvoices || []);
      setDispatchNotes(dn.dispatchNotes || []);
      setWarehouses(wh.warehouses || []);
      setAudit(ad.logs || ad.auditLogs || []);
      setItems(mi.items || []);
    } catch (e) {
      setToast({ msg: 'Failed to load some data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

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
      setIsSoModalOpen(false);
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed', type: 'error' }); }
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
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed', type: 'error' }); }
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
    } catch (err: any) { setToast({ msg: err.message || 'Failed', type: 'error' }); }
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
    } catch (err: any) { setToast({ msg: err.message || 'Failed', type: 'error' }); }
  };

  const submitVi = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { ...viForm, status: 'SUBMITTED' };
      if (viForm.attachmentFileName) body.attachment = { fileName: viForm.attachmentFileName };
      const res = await fetch('/api/vendor-invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Vendor invoice ${data.vendorInvoice.vendorInvoiceNumber} registered.`, type: 'success' });
      setIsViModalOpen(false);
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed', type: 'error' }); }
  };

  const submitVpay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Payment of ${data.vendorInvoice.currency} ${vpForm.amountPaid} recorded.`, type: 'success' });
      setIsVpModalOpen(false); setPayTarget(null);
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed', type: 'error' }); }
  };

  const approveVi = async (vi: any, status: 'APPROVED' | 'REJECTED' | 'ON_HOLD') => {
    try {
      const res = await fetch('/api/vendor-invoices', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: vi.id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Vendor invoice ${vi.vendorInvoiceNumber} → ${status}`, type: 'success' });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed', type: 'error' }); }
  };

  const advanceSoStatus = async (so: any, next: string) => {
    try {
      const res = await fetch(`/api/sales-orders/${so.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Sales order ${so.salesOrderNumber} → ${next}`, type: 'success' });
      loadAll();
    } catch (err: any) { setToast({ msg: err.message || 'Failed', type: 'error' }); }
  };

  const tabs: Array<{ id: Tab; label: string; icon: any; count?: number }> = [
    { id: 'so', label: 'Sales Orders', icon: ShoppingCart, count: salesOrders.length },
    { id: 'stock', label: 'Stock Availability', icon: Warehouse, count: warehouses.length },
    { id: 'alloc', label: 'Warehouse Allocation', icon: PackageCheck },
    { id: 'dispatch', label: 'Dispatch Tracking', icon: Truck, count: dispatchNotes.length },
    { id: 'invoice', label: 'Sales Invoice', icon: FileText, count: customerInvoices.length },
    { id: 'send', label: 'Send Invoice', icon: Send },
    { id: 'po', label: 'Purchase Orders', icon: Building, count: purchaseOrders.length },
    { id: 'vinv', label: 'Vendor Invoices', icon: Receipt, count: vendorInvoices.length },
    { id: 'vpay', label: 'Vendor Payments', icon: DollarSign },
    { id: 'audit', label: 'Audit Trail', icon: Activity, count: audit.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-indigo-600" /> B2B Outbound Order Management
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete order-to-cash + procure-to-pay workflow. Sales Order → Warehouse Allocation → Dispatch Note → Sales Invoice → Customer Payment · Purchase Order → Vendor Invoice → Vendor Payment.
        </p>
      </div>

      {/* Owner-side function tab strip */}
      <div className="flex items-center gap-1 overflow-x-auto bg-white p-1.5 rounded-2xl border border-slate-200">
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

      {/* Sales Orders (functions #1 + #2) */}
      {tab === 'so' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Sales Order List & Status</h2>
              <p className="text-[11px] text-slate-500">Customer details, PO reference, items, quantities, delivery date and status lifecycle.</p>
            </div>
            <Button onClick={() => setIsSoModalOpen(true)} variant="primary" leftIcon={<Plus className="w-4 h-4" />}>Create Sales Order</Button>
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
                  <th className="py-3 px-4 text-right font-bold">Advance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesOrders.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{s.salesOrderNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.customerName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{s.customerPoReference || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      {s.lines.map((l: any) => (
                        <div key={l.id} className="text-[11px]">
                          <span className="font-mono text-emerald-700 font-bold">{l.itemCode}</span> × {l.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{s.currency} {s.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4"><StatusPill status={s.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <Select
                        value=""
                        onChange={(e) => e.target.value && advanceSoStatus(s, e.target.value)}
                        options={[{ value: '', label: '—' }, ...SO_STATUSES.filter((x) => x !== s.status).map((v) => ({ value: v, label: v.replace(/_/g, ' ') }))]}
                        className="text-[11px] w-40"
                      />
                    </td>
                  </tr>
                ))}
                {salesOrders.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No sales orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warehouse Stock Availability (function #3) */}
      {tab === 'stock' && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900">Warehouse Stock Availability</h2>
          <p className="text-[11px] text-slate-500">Check stock across registered warehouses.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((w) => (
              <div key={w.id} className="p-5 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{w.code}</span>
                  <Warehouse className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 mt-2">{w.name}</h3>
                <p className="text-[11px] text-slate-500 mt-1">{w.address}</p>
                <div className="mt-3 flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">{w.bins?.length || 0} bins</span>
                  <Link href="/dashboard/owner/inventory" className="text-indigo-700 font-bold hover:underline">Open stock view →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warehouse Allocation (function #4) — quick allocator that just advances SO status */}
      {tab === 'alloc' && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900">Warehouse Allocation</h2>
          <p className="text-[11px] text-slate-500">Confirmed sales orders that require allocation to warehouses. Advancing status to ALLOCATED here mirrors FR-IN-003.</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">SO No.</th>
                  <th className="py-3 px-4 text-left font-bold">Customer</th>
                  <th className="py-3 px-4 text-left font-bold">Items</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Allocate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesOrders.filter((s) => ['CONFIRMED', 'STOCK_CHECK', 'PARTIALLY_ALLOCATED'].includes(s.status)).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{s.salesOrderNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.customerName}</td>
                    <td className="py-3 px-4">
                      {s.lines.map((l: any) => (
                        <div key={l.id} className="text-[11px]"><span className="font-mono text-emerald-700 font-bold">{l.itemCode}</span> × {l.quantity}</div>
                      ))}
                    </td>
                    <td className="py-3 px-4"><StatusPill status={s.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="primary" size="sm" onClick={() => advanceSoStatus(s, 'ALLOCATED')} leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>Allocate</Button>
                    </td>
                  </tr>
                ))}
                {salesOrders.filter((s) => ['CONFIRMED', 'STOCK_CHECK', 'PARTIALLY_ALLOCATED'].includes(s.status)).length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">No sales orders awaiting allocation.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispatch Tracking (functions #5 + #6) */}
      {tab === 'dispatch' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Dispatch Note List & Status Tracking</h2>
              <p className="text-[11px] text-slate-500">Track fulfilment: Allocated → Picking → Picked → Packing → Ready → Dispatched → In Transit → Delivered.</p>
            </div>
            <Link href="/dashboard/warehouse/dispatch-notes" className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1">
              Open full warehouse view <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Dispatch No.</th>
                  <th className="py-3 px-4 text-left font-bold">Sales Order</th>
                  <th className="py-3 px-4 text-left font-bold">Customer</th>
                  <th className="py-3 px-4 text-left font-bold">Item</th>
                  <th className="py-3 px-4 text-right font-bold">Qty</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-left font-bold">Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dispatchNotes.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{d.dispatchNumber}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{d.salesOrderNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{d.customerName}</td>
                    <td className="py-3 px-4"><span className="font-mono text-emerald-700 font-bold text-[11px]">{d.itemCode}</span> · {d.itemName}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{d.dispatchQty}</td>
                    <td className="py-3 px-4"><StatusPill status={d.status} /></td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">{d.trackingNumber || '—'}</td>
                  </tr>
                ))}
                {dispatchNotes.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">No dispatch notes yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales Invoice Creation (function #7) */}
      {tab === 'invoice' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Sales Invoice List</h2>
              <p className="text-[11px] text-slate-500">Convert approved sales orders / dispatched quantities into customer invoices.</p>
            </div>
            <Button onClick={() => setIsCiModalOpen(true)} variant="primary" leftIcon={<Plus className="w-4 h-4" />}>Create Sales Invoice</Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Invoice No.</th>
                  <th className="py-3 px-4 text-left font-bold">SO / Dispatch</th>
                  <th className="py-3 px-4 text-left font-bold">Customer</th>
                  <th className="py-3 px-4 text-right font-bold">Total</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-left font-bold">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerInvoices.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">{c.invoiceNumber}</td>
                    <td className="py-3 px-4 text-[11px] font-mono">
                      <div>{c.salesOrderNumber}</div>
                      <div className="text-slate-500">{c.dispatchNumber || '—'}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{c.customerName}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{c.currency} {c.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4"><StatusPill status={c.status} /></td>
                    <td className="py-3 px-4 text-[11px] text-slate-600">{new Date(c.dueDate).toLocaleDateString()}</td>
                  </tr>
                ))}
                {customerInvoices.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No customer invoices yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Send Invoice (function #8) */}
      {tab === 'send' && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900">Send Invoice to Customer</h2>
          <p className="text-[11px] text-slate-500">Approved invoices are eligible for sending. Track Sent · Viewed · Paid · Overdue lifecycle.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerInvoices.filter((c) => ['APPROVED', 'SENT', 'VIEWED'].includes(c.status)).map((c) => (
              <div key={c.id} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase">{c.invoiceNumber}</div>
                    <div className="font-extrabold text-slate-900">{c.customerName}</div>
                    <div className="text-[11px] text-slate-500">{c.customerEmail || 'No email on file'}</div>
                  </div>
                  <StatusPill status={c.status} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-slate-800">{c.currency} {c.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <Button variant="primary" size="sm" onClick={() => sendInvoice(c)} leftIcon={<Send className="w-3.5 h-3.5" />}>
                    {c.status === 'SENT' ? 'Resend' : 'Send Invoice'}
                  </Button>
                </div>
              </div>
            ))}
            {customerInvoices.filter((c) => ['APPROVED', 'SENT', 'VIEWED'].includes(c.status)).length === 0 && (
              <div className="col-span-2 p-8 text-center text-slate-400">No invoices ready to send.</div>
            )}
          </div>
        </div>
      )}

      {/* Purchase Order List (functions #9 + #10) */}
      {tab === 'po' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Purchase Order List & Status</h2>
              <p className="text-[11px] text-slate-500">Vendor selection uses approved vendor pricing, MOQ and lead time from Vendor Master Data.</p>
            </div>
            <Button onClick={() => setIsPoModalOpen(true)} variant="primary" leftIcon={<Plus className="w-4 h-4" />}>Create Purchase Order</Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">PO No.</th>
                  <th className="py-3 px-4 text-left font-bold">Vendor</th>
                  <th className="py-3 px-4 text-left font-bold">Linked SO</th>
                  <th className="py-3 px-4 text-right font-bold">Total</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                  <th className="py-3 px-4 text-left font-bold">Payment Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{p.poNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.vendorName}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{p.linkedSalesOrderNumber || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{p.currency} {p.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4"><StatusPill status={p.status} /></td>
                    <td className="py-3 px-4 text-[11px]">{p.paymentTerms}</td>
                  </tr>
                ))}
                {purchaseOrders.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No purchase orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vendor Invoice Registration + View (functions #11 + #12) */}
      {tab === 'vinv' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Vendor Invoice Registration & Review</h2>
              <p className="text-[11px] text-slate-500">Attach vendor invoices to PO. Approve / hold / reject with reason before payment eligibility.</p>
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
                      {v.attachment ? (
                        <a href={v.attachment.fileUrl || '#'} className="text-[11px] text-indigo-700 font-bold hover:underline">{v.attachment.fileName}</a>
                      ) : (<span className="text-slate-400 text-[11px]">—</span>)}
                    </td>
                    <td className="py-3 px-4"><StatusPill status={v.status} /></td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {['SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD'].includes(v.status) && (
                        <>
                          <button onClick={() => approveVi(v, 'APPROVED')} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100">Approve</button>
                          <button onClick={() => approveVi(v, 'ON_HOLD')} className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold hover:bg-amber-100">Hold</button>
                          <button onClick={() => approveVi(v, 'REJECTED')} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold hover:bg-rose-100">Reject</button>
                        </>
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

      {/* Vendor Payments (function #13, #14) */}
      {tab === 'vpay' && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900">Vendor Payment Register & Status</h2>
          <p className="text-[11px] text-slate-500">Payment status: Pending → Partially Paid → Paid · exceptions: Overdue · Disputed.</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Vendor Invoice</th>
                  <th className="py-3 px-4 text-left font-bold">Vendor</th>
                  <th className="py-3 px-4 text-right font-bold">Invoice Amount</th>
                  <th className="py-3 px-4 text-right font-bold">Paid</th>
                  <th className="py-3 px-4 text-right font-bold">Outstanding</th>
                  <th className="py-3 px-4 text-left font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorInvoices.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{v.vendorInvoiceNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{v.vendorName}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{v.currency} {v.invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">{v.currency} {v.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700 font-bold">{v.currency} {(v.invoiceAmount - v.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4"><StatusPill status={v.status} /></td>
                  </tr>
                ))}
                {vendorInvoices.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No vendor invoices to display.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Trail (function #15) */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Audit Trail — Governance events</h2>
            <Link href="/dashboard/owner/audit-logs" className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1">
              Full audit log <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Time</th>
                  <th className="py-3 px-4 text-left font-bold">Actor</th>
                  <th className="py-3 px-4 text-left font-bold">Action</th>
                  <th className="py-3 px-4 text-left font-bold">Module</th>
                  <th className="py-3 px-4 text-left font-bold">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 px-4 font-mono text-[11px]">{new Date(a.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-4 font-bold">{a.userId || 'system'} <span className="text-[10px] text-slate-500 font-mono">{a.role || ''}</span></td>
                    <td className="py-3 px-4 font-mono text-indigo-700 font-bold">{a.action}</td>
                    <td className="py-3 px-4 text-[11px]">{a.module}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{a.targetId || '—'}</td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">No governance audit events yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales Order create modal */}
      <Modal isOpen={isSoModalOpen} onClose={() => setIsSoModalOpen(false)} title="Create Sales Order (Function #1)" maxWidth="2xl">
        <form onSubmit={submitSo} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="font-bold block mb-1">Customer Name *</label><Input value={soForm.customerName} onChange={(e) => setSoForm({ ...soForm, customerName: e.target.value })} required /></div>
            <div><label className="font-bold block mb-1">Customer PO / Reference</label><Input value={soForm.customerPoReference} onChange={(e) => setSoForm({ ...soForm, customerPoReference: e.target.value })} placeholder="e.g. PO-45872" /></div>
          </div>
          <div><label className="font-bold block mb-1">Delivery Location *</label><Input value={soForm.deliveryLocation} onChange={(e) => setSoForm({ ...soForm, deliveryLocation: e.target.value })} required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="font-bold block mb-1">Requested Delivery Date</label><Input type="date" value={soForm.requestedDeliveryDate} onChange={(e) => setSoForm({ ...soForm, requestedDeliveryDate: e.target.value })} /></div>
            <div><label className="font-bold block mb-1">Payment Terms *</label><Select value={soForm.paymentTerms} onChange={(e) => setSoForm({ ...soForm, paymentTerms: e.target.value })} options={['Net 7', 'Net 14', 'Net 30', 'Net 45', 'Net 60', 'Prepaid', 'COD'].map((v) => ({ value: v, label: v }))} /></div>
            <div><label className="font-bold block mb-1">Currency *</label><Select value={soForm.currency} onChange={(e) => setSoForm({ ...soForm, currency: e.target.value })} options={['AUD', 'USD', 'EUR', 'GBP', 'NZD'].map((v) => ({ value: v, label: v }))} /></div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold">Line Items</label>
              <button type="button" onClick={() => setSoForm({ ...soForm, lines: [...soForm.lines, { itemCode: '', itemName: '', quantity: 1, sellingPrice: 0, taxPercent: 10 }] })} className="text-[11px] font-bold text-emerald-700">+ Add line</button>
            </div>
            {soForm.lines.map((l: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-2 text-[11px] font-mono" placeholder="Item Code" value={l.itemCode} onChange={(e) => { const n = [...soForm.lines]; n[i].itemCode = e.target.value; setSoForm({ ...soForm, lines: n }); }} />
                <Input className="col-span-4 text-[11px]" placeholder="Item Name" value={l.itemName} onChange={(e) => { const n = [...soForm.lines]; n[i].itemName = e.target.value; setSoForm({ ...soForm, lines: n }); }} />
                <Input type="number" min="1" className="col-span-2 text-[11px] font-mono" placeholder="Qty" value={l.quantity} onChange={(e) => { const n = [...soForm.lines]; n[i].quantity = Number(e.target.value); setSoForm({ ...soForm, lines: n }); }} />
                <Input type="number" step="0.01" className="col-span-2 text-[11px] font-mono" placeholder="Unit Price" value={l.sellingPrice} onChange={(e) => { const n = [...soForm.lines]; n[i].sellingPrice = Number(e.target.value); setSoForm({ ...soForm, lines: n }); }} />
                <Input type="number" step="0.1" className="col-span-2 text-[11px] font-mono" placeholder="Tax %" value={l.taxPercent} onChange={(e) => { const n = [...soForm.lines]; n[i].taxPercent = Number(e.target.value); setSoForm({ ...soForm, lines: n }); }} />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsSoModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Sales Order</Button>
          </div>
        </form>
      </Modal>

      {/* Purchase Order create modal */}
      <Modal isOpen={isPoModalOpen} onClose={() => setIsPoModalOpen(false)} title="Create Purchase Order (Function #9)" maxWidth="2xl">
        <form onSubmit={submitPo} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="font-bold block mb-1">Vendor Name *</label><Input value={poForm.vendorName} onChange={(e) => setPoForm({ ...poForm, vendorName: e.target.value })} required /></div>
            <div><label className="font-bold block mb-1">Linked Sales Order</label><Input value={poForm.linkedSalesOrderNumber} onChange={(e) => setPoForm({ ...poForm, linkedSalesOrderNumber: e.target.value })} placeholder="e.g. SO-2026-00125" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div><label className="font-bold block mb-1">Requested Delivery</label><Input type="date" value={poForm.requestedDeliveryDate} onChange={(e) => setPoForm({ ...poForm, requestedDeliveryDate: e.target.value })} /></div>
            <div><label className="font-bold block mb-1">Payment Terms *</label><Select value={poForm.paymentTerms} onChange={(e) => setPoForm({ ...poForm, paymentTerms: e.target.value })} options={['Net 7', 'Net 14', 'Net 30', 'Net 45', 'Net 60', 'Prepaid', 'COD'].map((v) => ({ value: v, label: v }))} /></div>
            <div><label className="font-bold block mb-1">MOQ</label><Input type="number" min="0" value={poForm.moq} onChange={(e) => setPoForm({ ...poForm, moq: e.target.value })} /></div>
            <div><label className="font-bold block mb-1">Lead Time (days)</label><Input type="number" min="0" value={poForm.leadTimeDays} onChange={(e) => setPoForm({ ...poForm, leadTimeDays: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold">Line Items</label>
              <button type="button" onClick={() => setPoForm({ ...poForm, lines: [...poForm.lines, { itemCode: '', itemName: '', quantity: 1, unitCost: 0, taxPercent: 10 }] })} className="text-[11px] font-bold text-emerald-700">+ Add line</button>
            </div>
            {poForm.lines.map((l: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-2 text-[11px] font-mono" placeholder="Item Code" value={l.itemCode} onChange={(e) => { const n = [...poForm.lines]; n[i].itemCode = e.target.value; setPoForm({ ...poForm, lines: n }); }} />
                <Input className="col-span-4 text-[11px]" placeholder="Item Name" value={l.itemName} onChange={(e) => { const n = [...poForm.lines]; n[i].itemName = e.target.value; setPoForm({ ...poForm, lines: n }); }} />
                <Input type="number" min="1" className="col-span-2 text-[11px] font-mono" placeholder="Qty" value={l.quantity} onChange={(e) => { const n = [...poForm.lines]; n[i].quantity = Number(e.target.value); setPoForm({ ...poForm, lines: n }); }} />
                <Input type="number" step="0.01" className="col-span-2 text-[11px] font-mono" placeholder="Unit Cost" value={l.unitCost} onChange={(e) => { const n = [...poForm.lines]; n[i].unitCost = Number(e.target.value); setPoForm({ ...poForm, lines: n }); }} />
                <Input type="number" step="0.1" className="col-span-2 text-[11px] font-mono" placeholder="Tax %" value={l.taxPercent} onChange={(e) => { const n = [...poForm.lines]; n[i].taxPercent = Number(e.target.value); setPoForm({ ...poForm, lines: n }); }} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsPoModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Purchase Order</Button>
          </div>
        </form>
      </Modal>

      {/* Sales Invoice create modal */}
      <Modal isOpen={isCiModalOpen} onClose={() => setIsCiModalOpen(false)} title="Create Sales Invoice (Function #7)" maxWidth="2xl">
        <form onSubmit={submitCi} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="font-bold block mb-1">Sales Order No. *</label><Input value={ciForm.salesOrderNumber} onChange={(e) => setCiForm({ ...ciForm, salesOrderNumber: e.target.value })} placeholder="SO-2026-00125" required /></div>
            <div><label className="font-bold block mb-1">Dispatch No.</label><Input value={ciForm.dispatchNumber} onChange={(e) => setCiForm({ ...ciForm, dispatchNumber: e.target.value })} placeholder="DSP-2026-00087" /></div>
            <div><label className="font-bold block mb-1">Due Date *</label><Input type="date" value={ciForm.dueDate} onChange={(e) => setCiForm({ ...ciForm, dueDate: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="font-bold block mb-1">Customer Name *</label><Input value={ciForm.customerName} onChange={(e) => setCiForm({ ...ciForm, customerName: e.target.value })} required /></div>
            <div><label className="font-bold block mb-1">Customer Email</label><Input type="email" value={ciForm.customerEmail} onChange={(e) => setCiForm({ ...ciForm, customerEmail: e.target.value })} /></div>
          </div>
          <div><label className="font-bold block mb-1">Billing Address</label><Input value={ciForm.billingAddress} onChange={(e) => setCiForm({ ...ciForm, billingAddress: e.target.value })} /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold">Invoice Lines</label>
              <button type="button" onClick={() => setCiForm({ ...ciForm, lines: [...ciForm.lines, { itemCode: '', itemName: '', quantity: 1, unitPrice: 0, taxPercent: 10 }] })} className="text-[11px] font-bold text-emerald-700">+ Add line</button>
            </div>
            {ciForm.lines.map((l: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-2 text-[11px] font-mono" placeholder="Item Code" value={l.itemCode} onChange={(e) => { const n = [...ciForm.lines]; n[i].itemCode = e.target.value; setCiForm({ ...ciForm, lines: n }); }} />
                <Input className="col-span-4 text-[11px]" placeholder="Item Name" value={l.itemName} onChange={(e) => { const n = [...ciForm.lines]; n[i].itemName = e.target.value; setCiForm({ ...ciForm, lines: n }); }} />
                <Input type="number" min="1" className="col-span-2 text-[11px] font-mono" placeholder="Qty" value={l.quantity} onChange={(e) => { const n = [...ciForm.lines]; n[i].quantity = Number(e.target.value); setCiForm({ ...ciForm, lines: n }); }} />
                <Input type="number" step="0.01" className="col-span-2 text-[11px] font-mono" placeholder="Unit Price" value={l.unitPrice} onChange={(e) => { const n = [...ciForm.lines]; n[i].unitPrice = Number(e.target.value); setCiForm({ ...ciForm, lines: n }); }} />
                <Input type="number" step="0.1" className="col-span-2 text-[11px] font-mono" placeholder="Tax %" value={l.taxPercent} onChange={(e) => { const n = [...ciForm.lines]; n[i].taxPercent = Number(e.target.value); setCiForm({ ...ciForm, lines: n }); }} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsCiModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Sales Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* Vendor Invoice registration modal */}
      <Modal isOpen={isViModalOpen} onClose={() => setIsViModalOpen(false)} title="Register Vendor Invoice (Function #11)" maxWidth="lg">
        <form onSubmit={submitVi} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="font-bold block mb-1">Vendor Invoice No. *</label><Input value={viForm.vendorInvoiceNumber} onChange={(e) => setViForm({ ...viForm, vendorInvoiceNumber: e.target.value })} required /></div>
            <div><label className="font-bold block mb-1">Linked PO Number *</label><Input value={viForm.linkedPoNumber} onChange={(e) => setViForm({ ...viForm, linkedPoNumber: e.target.value })} placeholder="PO-2026-00042" required /></div>
          </div>
          <div><label className="font-bold block mb-1">Vendor Name *</label><Input value={viForm.vendorName} onChange={(e) => setViForm({ ...viForm, vendorName: e.target.value })} required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="font-bold block mb-1">Invoice Date</label><Input type="date" value={viForm.invoiceDate} onChange={(e) => setViForm({ ...viForm, invoiceDate: e.target.value })} /></div>
            <div><label className="font-bold block mb-1">Due Date *</label><Input type="date" value={viForm.dueDate} onChange={(e) => setViForm({ ...viForm, dueDate: e.target.value })} required /></div>
            <div><label className="font-bold block mb-1">Invoice Amount *</label><Input type="number" step="0.01" value={viForm.invoiceAmount} onChange={(e) => setViForm({ ...viForm, invoiceAmount: e.target.value })} required /></div>
          </div>
          <div><label className="font-bold block mb-1">Attachment Filename (Function #12)</label><Input value={viForm.attachmentFileName} onChange={(e) => setViForm({ ...viForm, attachmentFileName: e.target.value })} placeholder="APX-INV-88221.pdf" /></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsViModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Register Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* Vendor payment modal */}
      <Modal isOpen={isVpModalOpen} onClose={() => setIsVpModalOpen(false)} title={`Record Vendor Payment — ${payTarget?.vendorInvoiceNumber || ''} (Function #13)`} maxWidth="md">
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
              <div><label className="font-bold block mb-1">Bank / Reference No.</label><Input value={vpForm.bankReferenceNumber} onChange={(e) => setVpForm({ ...vpForm, bankReferenceNumber: e.target.value })} placeholder="e.g. BANK-REF-77821" /></div>
            </div>
            <div><label className="font-bold block mb-1">Comments</label><Input value={vpForm.comments} onChange={(e) => setVpForm({ ...vpForm, comments: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setIsVpModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Record Payment</Button>
            </div>
          </form>
        )}
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
