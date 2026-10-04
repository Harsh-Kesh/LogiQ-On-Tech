'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import {
  Search, Package, ShoppingCart, FileText, ChevronRight, ExternalLink,
  Shield, Truck, CreditCard, Mail, CheckCircle2, AlertCircle, Clock, Download
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  type: 'STOREFRONT_ORDER' | 'WARRANTY' | 'SUPPLIER_INVOICE';
  id: string;
  sfOrderId: string | null;
  title: string;
  subtitle: string;
  meta: string;
}

interface SearchResults {
  orders: SearchResult[];
  warranties: SearchResult[];
  supplierInvoices: SearchResult[];
}

interface SfOrderItem {
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface SfOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  deliveryAddress: string;
  currency: string;
  totalAmount: number;
  paidAt: string | null;
  myobSoNumber: string | null;
  myobPoNumber: string | null;
  myobBillNumber: string | null;
  monoovaTxnId: string | null;
  monoovaStatus: string | null;
  supplierPaidAt: string | null;
  sektorStatus: string | null;
  sektorTrackingNumber: string | null;
  sektorStatusUpdatedAt: string | null;
  fulfilledAt: string | null;
  poEmailSentAt: string | null;
  poEmailSentTo: string | null;
  supplierInvoiceReceivedAt: string | null;
  threeWayMatchResult: string | null;
  threeWayMatchNotes: string | null;
  matchedAt: string | null;
  createdAt: string;
  items: SfOrderItem[];
}

interface WarrantyRecord {
  id: string;
  warrantyNumber: string;
  partNumber: string;
  partDescription: string | null;
  serialNumber: string | null;
  batchNumber: string | null;
  status: string;
  warrantyStartDate: string | null;
  warrantyExpiryDate: string | null;
  warrantyPeriodMonths: number;
  remainingDays: number | null;
  deliveryDate: string | null;
  vendorName: string | null;
  evidence: { id: string; fileName: string; fileType: string; uploadedAt: string; uploadedBy: string | null }[];
}

interface SupplierInvoice {
  id: string;
  vendorInvoiceNumber: string;
  vendorName: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: number;
  status: string;
  threeWayMatchResult: string | null;
  threeWayMatchNotes: string | null;
  matchedAt: string | null;
  myobBillNumber: string | null;
  monoovaTxnId: string | null;
}

interface EmailLog {
  id: string;
  to: string;
  cc: string | null;
  subject: string;
  sentAt: string;
  mode: string;
}

interface InvestigationChain {
  sfOrder: SfOrder;
  salesOrder: { id: string; salesOrderNumber: string; status: string; createdAt: string } | null;
  supplierInvoice: SupplierInvoice | null;
  warranties: WarrantyRecord[];
  emailLogs: EmailLog[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_ORDER: Record<string, string> = {
  PAID: 'bg-blue-100 text-blue-700',
  SO_CREATED: 'bg-cyan-100 text-cyan-700',
  PO_SENT: 'bg-violet-100 text-violet-700',
  INVOICE_RECEIVED: 'bg-amber-100 text-amber-700',
  MATCHED: 'bg-emerald-100 text-emerald-700',
  MATCH_EXCEPTION: 'bg-red-100 text-red-700',
  BILL_CREATED: 'bg-indigo-100 text-indigo-700',
  SUPPLIER_PAID: 'bg-teal-100 text-teal-700',
  FULFILLED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const WARRANTY_STATUS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  FINAL_SIX_MONTHS: 'bg-amber-100 text-amber-700',
  EXPIRING_SOON: 'bg-orange-100 text-orange-700',
  EXPIRED: 'bg-red-100 text-red-700',
  PENDING_DATA: 'bg-slate-100 text-slate-600',
  CLOSED: 'bg-slate-100 text-slate-500',
};

// ── Row component ─────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-xs text-slate-400 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-slate-900 font-medium break-all">{value ?? '—'}</span>
    </div>
  );
}

// ── Section component ─────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  color,
  children,
  badge,
}: {
  icon: any;
  title: string;
  color: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-2.5 ${color}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider flex-1">{title}</span>
        {badge}
      </div>
      <div className="px-4 py-3 divide-y divide-slate-100">{children}</div>
    </div>
  );
}

// ── Investigation Panel ───────────────────────────────────────────────────────

function InvestigationPanel({ chain }: { chain: InvestigationChain }) {
  const { sfOrder, salesOrder, supplierInvoice, warranties, emailLogs } = chain;
  const statusColor = STATUS_ORDER[sfOrder.status] || 'bg-slate-100 text-slate-600';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-slate-900">{sfOrder.orderNumber}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusColor}`}>
              {sfOrder.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="text-sm text-slate-500 mt-0.5">{sfOrder.customerName} · {sfOrder.customerEmail}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-slate-900">
            {sfOrder.currency} {sfOrder.totalAmount.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">{fmt(sfOrder.createdAt)}</div>
        </div>
      </div>

      {/* Items */}
      <Section icon={Package} title="Items Ordered" color="bg-slate-50 text-slate-700 border-b border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left py-2 pr-3 font-semibold">Item</th>
                <th className="text-right py-2 pr-3 font-semibold">Qty</th>
                <th className="text-right py-2 pr-3 font-semibold">Unit</th>
                <th className="text-right py-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sfOrder.items.map((item) => (
                <tr key={item.itemCode}>
                  <td className="py-2 pr-3">
                    <div className="font-semibold text-slate-800">{item.itemCode}</div>
                    <div className="text-slate-500">{item.itemName}</div>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">{item.quantity}</td>
                  <td className="py-2 pr-3 text-right font-mono">{sfOrder.currency} {item.unitPrice.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono font-semibold">{sfOrder.currency} {item.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Customer Transaction */}
      <Section icon={ShoppingCart} title="Customer Transaction" color="bg-blue-50 text-blue-800 border-b border-blue-100">
        <Row label="Website Order #" value={sfOrder.orderNumber} />
        <Row label="Internal SO #" value={salesOrder?.salesOrderNumber || sfOrder.myobSoNumber || '—'} />
        <Row label="MYOB SO #" value={sfOrder.myobSoNumber} />
        <Row label="Delivery Address" value={sfOrder.deliveryAddress} />
        <Row label="Order Placed" value={fmtDt(sfOrder.createdAt)} />
        <Row label="Customer Paid At" value={fmtDt(sfOrder.paidAt)} />
      </Section>

      {/* Procurement & Fulfilment */}
      <Section icon={Truck} title="Procurement & Fulfilment" color="bg-violet-50 text-violet-800 border-b border-violet-100">
        <Row label="MYOB PO #" value={sfOrder.myobPoNumber} />
        <Row label="PO Sent To" value={sfOrder.poEmailSentTo} />
        <Row label="PO Sent At" value={fmtDt(sfOrder.poEmailSentAt)} />
        <Row label="Delivery Status" value={
          sfOrder.sektorStatus ? (
            <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold text-[10px]">
              {sfOrder.sektorStatus}
            </span>
          ) : '—'
        } />
        <Row label="Tracking #" value={sfOrder.sektorTrackingNumber} />
        <Row label="Last Updated" value={fmtDt(sfOrder.sektorStatusUpdatedAt)} />
        <Row label="Fulfilled At" value={fmtDt(sfOrder.fulfilledAt)} />
      </Section>

      {/* Accounts Payable */}
      <Section icon={CreditCard} title="Accounts Payable" color="bg-amber-50 text-amber-800 border-b border-amber-100"
        badge={
          sfOrder.threeWayMatchResult ? (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              sfOrder.threeWayMatchResult === 'MATCHED'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {sfOrder.threeWayMatchResult === 'MATCHED' ? '✓ 3WM Passed' : '⚠ 3WM Exception'}
            </span>
          ) : null
        }
      >
        {supplierInvoice ? (
          <>
            <Row label="Supplier" value={supplierInvoice.vendorName} />
            <Row label="Invoice #" value={supplierInvoice.vendorInvoiceNumber} />
            <Row label="Invoice Date" value={fmt(supplierInvoice.invoiceDate)} />
            <Row label="Invoice Amount" value={`AUD ${supplierInvoice.invoiceAmount.toFixed(2)}`} />
            <Row label="Invoice Status" value={
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                supplierInvoice.status === 'APPROVED' ? 'bg-green-100 text-green-700'
                : supplierInvoice.status === 'DISPUTED' ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-600'
              }`}>
                {supplierInvoice.status}
              </span>
            } />
            <Row label="Matched At" value={fmtDt(supplierInvoice.matchedAt)} />
            <Row label="MYOB Bill #" value={supplierInvoice.myobBillNumber || sfOrder.myobBillNumber} />
          </>
        ) : (
          <div className="py-2 text-xs text-slate-400">No supplier invoice linked yet</div>
        )}
        <Row label="Supplier Inv. Rcvd" value={fmtDt(sfOrder.supplierInvoiceReceivedAt)} />
        <Row label="3WM Notes" value={
          sfOrder.threeWayMatchNotes ? (
            <span className="text-slate-600">{sfOrder.threeWayMatchNotes}</span>
          ) : '—'
        } />
        <Row label="Monoova Txn ID" value={sfOrder.monoovaTxnId} />
        <Row label="Monoova Status" value={sfOrder.monoovaStatus} />
        <Row label="Supplier Paid At" value={fmtDt(sfOrder.supplierPaidAt)} />
      </Section>

      {/* Warranties */}
      {warranties.length > 0 && (
        <Section icon={Shield} title={`Warranty Records (${warranties.length})`} color="bg-emerald-50 text-emerald-800 border-b border-emerald-100">
          {warranties.map((w, idx) => (
            <div key={w.id} className={idx > 0 ? 'pt-3 mt-3 border-t border-slate-100' : ''}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-xs text-slate-800">{w.warrantyNumber}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${WARRANTY_STATUS[w.status] || 'bg-slate-100 text-slate-600'}`}>
                  {w.status.replace(/_/g, ' ')}
                </span>
              </div>
              <Row label="Part Number" value={w.partNumber} />
              {w.partDescription && <Row label="Description" value={w.partDescription} />}
              {w.serialNumber && <Row label="Serial Number" value={<span className="font-mono">{w.serialNumber}</span>} />}
              {w.batchNumber && <Row label="Batch Number" value={<span className="font-mono">{w.batchNumber}</span>} />}
              <Row label="Vendor" value={w.vendorName} />
              <Row label="Delivery Date" value={fmt(w.deliveryDate)} />
              <Row label="Warranty Start" value={fmt(w.warrantyStartDate)} />
              <Row label="Warranty Expiry" value={fmt(w.warrantyExpiryDate)} />
              <Row label="Period" value={`${w.warrantyPeriodMonths} months`} />
              {w.remainingDays !== null && (
                <Row label="Remaining Days" value={
                  <span className={w.remainingDays <= 30 ? 'text-red-600 font-bold' : w.remainingDays <= 180 ? 'text-amber-600 font-bold' : 'text-green-700 font-bold'}>
                    {w.remainingDays} days
                  </span>
                } />
              )}
              {w.evidence.length > 0 && (
                <Row label="Evidence Files" value={
                  <a
                    href={`/dashboard/owner/warranties?id=${w.id}`}
                    className="text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    {w.evidence.length} file{w.evidence.length !== 1 ? 's' : ''} attached
                  </a>
                } />
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Email Communications */}
      {emailLogs.length > 0 && (
        <Section icon={Mail} title={`Email Communications (${emailLogs.length})`} color="bg-slate-50 text-slate-700 border-b border-slate-200">
          {emailLogs.map((e) => (
            <div key={e.id} className="py-2 flex items-start gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">{e.subject}</div>
                <div className="text-xs text-slate-500">To: {e.to}{e.cc ? ` · CC: ${e.cc}` : ''}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {fmtDt(e.sentAt)} · {e.mode === 'simulated' ? '(simulated)' : 'sent'}
                </div>
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, any> = {
  WARRANTY: Shield,
  STOREFRONT_ORDER: ShoppingCart,
  SUPPLIER_INVOICE: FileText,
};

const TYPE_COLOR: Record<string, string> = {
  WARRANTY: 'bg-green-100 text-green-700',
  STOREFRONT_ORDER: 'bg-blue-100 text-blue-700',
  SUPPLIER_INVOICE: 'bg-violet-100 text-violet-700',
};

const TYPE_LABEL: Record<string, string> = {
  WARRANTY: 'Warranty',
  STOREFRONT_ORDER: 'Order',
  SUPPLIER_INVOICE: 'Invoice',
};

export default function TraceabilityPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedSfOrderId, setSelectedSfOrderId] = useState<string | null>(null);
  const [chain, setChain] = useState<InvestigationChain | null>(null);
  const [loadingChain, setLoadingChain] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setSearching(true);
    const res = await fetch(`/api/admin/traceability?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.results);
    }
    setSearching(false);
  }, []);

  const loadChain = useCallback(async (sfOrderId: string) => {
    setLinkError(null);
    if (sfOrderId === selectedSfOrderId) return;
    setSelectedSfOrderId(sfOrderId);
    setChain(null);
    setLoadingChain(true);
    const res = await fetch(`/api/admin/traceability?id=${sfOrderId}`);
    if (res.ok) {
      const data = await res.json();
      setChain(data.chain);
    }
    setLoadingChain(false);
  }, [selectedSfOrderId]);

  const allResults: SearchResult[] = results
    ? [...(results.orders || []), ...(results.warranties || []), ...(results.supplierInvoices || [])]
    : [];

  return (
    <div className="flex gap-6 h-full min-h-[calc(100vh-120px)]">
      {/* ── Left: Search + results ── */}
      <div className="w-80 shrink-0 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0f172a' }}>Global Traceability</h1>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            Search serials, orders, POs, invoices, warranties
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            placeholder="Serial, order #, PO, customer…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm shadow-sm"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {linkError && (
            <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
              {linkError}
            </div>
          )}
          {results && allResults.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">No results for "{query}"</div>
          )}

          {allResults.map((item) => {
            const Icon = TYPE_ICON[item.type] || Search;
            const color = TYPE_COLOR[item.type] || 'bg-slate-100 text-slate-600';
            const label = TYPE_LABEL[item.type] || item.type;
            const isSelected = item.sfOrderId === selectedSfOrderId;
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => item.sfOrderId ? loadChain(item.sfOrderId) : setLinkError(`Could not find a linked order for "${item.title}".`)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                    : item.sfOrderId
                    ? 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:border-amber-300'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-900 text-xs">{item.title}</span>
                    <span className={`px-1.5 py-px rounded text-[9px] font-bold ${color}`}>{label}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 truncate">{item.subtitle}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{item.meta}</div>
                </div>
                {item.sfOrderId && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />}
              </button>
            );
          })}

          {!results && !searching && (
            <div className="text-center py-16">
              <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-xs">Start typing to search the supply chain</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Investigation Panel ── */}
      <div className="flex-1 min-w-0 border-l border-slate-200 pl-6 overflow-y-auto">
        {loadingChain && (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <span className="text-sm">Loading investigation chain…</span>
            </div>
          </div>
        )}

        {!loadingChain && chain && <InvestigationPanel chain={chain} />}

        {!loadingChain && !chain && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-slate-300" />
            </div>
            <h2 className="text-sm font-semibold text-slate-500">Select a result to investigate</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              The full audit trail — items, procurement, fulfilment, accounts payable, warranties, and email communications — will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
