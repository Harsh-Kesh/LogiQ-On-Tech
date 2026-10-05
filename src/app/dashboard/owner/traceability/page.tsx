'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search, Package, ShoppingCart, FileText, ChevronRight, ExternalLink,
  Shield, Truck, CreditCard, Mail, CheckCircle2, AlertCircle, Clock, Download
} from 'lucide-react';

const NAVY = '#4C3AE3';

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

interface BadgeStyle { label?: string; bg: string; color: string; border: string }

const STATUS_ORDER: Record<string, BadgeStyle> = {
  PAID:              { bg: '#EEF0FE', color: '#4C3AE3', border: '#D9D4FB' },
  SO_CREATED:        { bg: '#EEF0FE', color: '#4C3AE3', border: '#D9D4FB' },
  PO_SENT:           { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
  INVOICE_RECEIVED:  { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  MATCH_PENDING:     { bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  MATCHED:           { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  MATCH_EXCEPTION:   { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  BILL_CREATED:      { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
  PAYMENT_SCHEDULED: { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
  SUPPLIER_PAID:     { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  FULFILLED:         { bg: '#ecfdf5', color: '#15803d', border: '#86efac' },
  CANCELLED:         { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
};
const STATUS_ORDER_DEFAULT: BadgeStyle = { bg: '#fafafa', color: '#71717a', border: '#e4e4e7' };

const WARRANTY_STATUS: Record<string, BadgeStyle> = {
  ACTIVE:           { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  FINAL_SIX_MONTHS: { bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  EXPIRING_SOON:    { bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  EXPIRED:          { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  PENDING_DATA:     { bg: '#fafafa', color: '#71717a', border: '#e4e4e7' },
  CLOSED:           { bg: '#fafafa', color: '#71717a', border: '#e4e4e7' },
};
const WARRANTY_STATUS_DEFAULT: BadgeStyle = { bg: '#fafafa', color: '#71717a', border: '#e4e4e7' };

// ── Row component ─────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-xs w-36 shrink-0 pt-0.5" style={{ color: '#94a3b8' }}>{label}</span>
      <span className="text-xs font-medium break-all" style={{ color: '#0f172a' }}>{value ?? '—'}</span>
    </div>
  );
}

// ── Section component ─────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  bg,
  color,
  border,
  children,
  badge,
}: {
  icon: any;
  title: string;
  bg: string;
  color: string;
  border: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ background: bg, color, borderColor: border }}>
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
  const statusStyle = STATUS_ORDER[sfOrder.status] || STATUS_ORDER_DEFAULT;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold" style={{ color: '#0f172a' }}>{sfOrder.orderNumber}</span>
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}
            >
              {sfOrder.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="text-sm mt-0.5" style={{ color: '#64748b' }}>{sfOrder.customerName} · {sfOrder.customerEmail}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-black font-mono" style={{ color: NAVY }}>
            {sfOrder.currency} {sfOrder.totalAmount.toFixed(2)}
          </div>
          <div className="text-xs" style={{ color: '#94a3b8' }}>{fmt(sfOrder.createdAt)}</div>
        </div>
      </div>

      {/* Items */}
      <Section icon={Package} title="Items Ordered" bg="#f8fafc" color="#475569" border="#e2e8f0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: '#94a3b8' }}>
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
                    <div className="font-semibold" style={{ color: '#0f172a' }}>{item.itemCode}</div>
                    <div style={{ color: '#64748b' }}>{item.itemName}</div>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono" style={{ color: '#0f172a' }}>{item.quantity}</td>
                  <td className="py-2 pr-3 text-right font-mono" style={{ color: '#0f172a' }}>{sfOrder.currency} {item.unitPrice.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono font-semibold" style={{ color: '#0f172a' }}>{sfOrder.currency} {item.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Customer Transaction */}
      <Section icon={ShoppingCart} title="Customer Transaction" bg="#EEF0FE" color="#4C3AE3" border="#D9D4FB">
        <Row label="Website Order #" value={sfOrder.orderNumber} />
        <Row label="Internal SO #" value={salesOrder?.salesOrderNumber || sfOrder.myobSoNumber || '—'} />
        <Row label="MYOB SO #" value={sfOrder.myobSoNumber} />
        <Row label="Delivery Address" value={sfOrder.deliveryAddress} />
        <Row label="Order Placed" value={fmtDt(sfOrder.createdAt)} />
        <Row label="Customer Paid At" value={fmtDt(sfOrder.paidAt)} />
      </Section>

      {/* Procurement & Fulfilment */}
      <Section icon={Truck} title="Procurement & Fulfilment" bg="#eef2ff" color="#4338ca" border="#c7d2fe">
        <Row label="MYOB PO #" value={sfOrder.myobPoNumber} />
        <Row label="PO Sent To" value={sfOrder.poEmailSentTo} />
        <Row label="PO Sent At" value={fmtDt(sfOrder.poEmailSentAt)} />
        <Row label="Delivery Status" value={
          sfOrder.sektorStatus ? (
            <span className="px-2 py-0.5 rounded font-bold text-[10px]" style={{ background: '#eef2ff', color: '#4338ca' }}>
              {sfOrder.sektorStatus}
            </span>
          ) : '—'
        } />
        <Row label="Tracking #" value={sfOrder.sektorTrackingNumber} />
        <Row label="Last Updated" value={fmtDt(sfOrder.sektorStatusUpdatedAt)} />
        <Row label="Fulfilled At" value={fmtDt(sfOrder.fulfilledAt)} />
      </Section>

      {/* Accounts Payable */}
      <Section icon={CreditCard} title="Accounts Payable" bg="#fefce8" color="#854d0e" border="#fde68a"
        badge={
          sfOrder.threeWayMatchResult ? (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold"
              style={sfOrder.threeWayMatchResult === 'MATCHED'
                ? { background: '#f0fdf4', color: '#166534' }
                : { background: '#fef2f2', color: '#991b1b' }}
            >
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
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold"
                style={
                  supplierInvoice.status === 'APPROVED' ? { background: '#f0fdf4', color: '#166534' }
                  : supplierInvoice.status === 'DISPUTED' ? { background: '#fef2f2', color: '#991b1b' }
                  : { background: '#fafafa', color: '#71717a' }
                }
              >
                {supplierInvoice.status}
              </span>
            } />
            <Row label="Matched At" value={fmtDt(supplierInvoice.matchedAt)} />
            <Row label="MYOB Bill #" value={supplierInvoice.myobBillNumber || sfOrder.myobBillNumber} />
          </>
        ) : (
          <div className="py-2 text-xs" style={{ color: '#94a3b8' }}>No supplier invoice linked yet</div>
        )}
        <Row label="Supplier Inv. Rcvd" value={fmtDt(sfOrder.supplierInvoiceReceivedAt)} />
        <Row label="3WM Notes" value={
          sfOrder.threeWayMatchNotes ? (
            <span style={{ color: '#64748b' }}>{sfOrder.threeWayMatchNotes}</span>
          ) : '—'
        } />
        <Row label="Monoova Txn ID" value={sfOrder.monoovaTxnId} />
        <Row label="Monoova Status" value={sfOrder.monoovaStatus} />
        <Row label="Supplier Paid At" value={fmtDt(sfOrder.supplierPaidAt)} />
      </Section>

      {/* Warranties */}
      {warranties.length > 0 && (
        <Section icon={Shield} title={`Warranty Records (${warranties.length})`} bg="#f0fdf4" color="#166534" border="#bbf7d0">
          {warranties.map((w, idx) => {
            const wBadge = WARRANTY_STATUS[w.status] || WARRANTY_STATUS_DEFAULT;
            return (
            <div key={w.id} className={idx > 0 ? 'pt-3 mt-3 border-t border-slate-100' : ''}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-xs" style={{ color: '#0f172a' }}>{w.warrantyNumber}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: wBadge.bg, color: wBadge.color }}>
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
                  <span className="font-bold" style={{ color: w.remainingDays <= 30 ? '#991b1b' : w.remainingDays <= 180 ? '#854d0e' : '#166534' }}>
                    {w.remainingDays} days
                  </span>
                } />
              )}
              {w.evidence.length > 0 && (
                <Row label="Evidence Files" value={
                  <a
                    href={`/dashboard/owner/warranties?id=${w.id}`}
                    className="hover:underline flex items-center gap-1"
                    style={{ color: NAVY }}
                  >
                    <Download className="w-3 h-3" />
                    {w.evidence.length} file{w.evidence.length !== 1 ? 's' : ''} attached
                  </a>
                } />
              )}
            </div>
            );
          })}
        </Section>
      )}

      {/* Email Communications */}
      {emailLogs.length > 0 && (
        <Section icon={Mail} title={`Email Communications (${emailLogs.length})`} bg="#f8fafc" color="#475569" border="#e2e8f0">
          {emailLogs.map((e) => (
            <div key={e.id} className="py-2 flex items-start gap-2">
              <Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#94a3b8' }} />
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>{e.subject}</div>
                <div className="text-xs" style={{ color: '#64748b' }}>To: {e.to}{e.cc ? ` · CC: ${e.cc}` : ''}</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
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

const TYPE_COLOR: Record<string, BadgeStyle> = {
  WARRANTY: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  STOREFRONT_ORDER: { bg: '#EEF0FE', color: '#4C3AE3', border: '#D9D4FB' },
  SUPPLIER_INVOICE: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
};
const TYPE_COLOR_DEFAULT: BadgeStyle = { bg: '#fafafa', color: '#71717a', border: '#e4e4e7' };

const TYPE_LABEL: Record<string, string> = {
  WARRANTY: 'Warranty',
  STOREFRONT_ORDER: 'Order',
  SUPPLIER_INVOICE: 'Invoice',
};

export default function TraceabilityPage() {
  const searchParams = useSearchParams();
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
    try {
      const res = await fetch(`/api/admin/traceability?id=${sfOrderId}`);
      if (res.ok) {
        const data = await res.json();
        setChain(data.chain);
      } else {
        const body = await res.json().catch(() => ({}));
        setLinkError(body.error || `Failed to load this record (HTTP ${res.status}).`);
        setSelectedSfOrderId(null);
      }
    } catch {
      setLinkError('Network error loading this record.');
      setSelectedSfOrderId(null);
    }
    setLoadingChain(false);
  }, [selectedSfOrderId]);

  // Deep link from Shop Orders ("Investigate full history" button) — jump straight
  // to this order's audit trail without making the owner search for it again.
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId) loadChain(orderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const allResults: SearchResult[] = results
    ? [...(results.orders || []), ...(results.warranties || []), ...(results.supplierInvoices || [])]
    : [];

  return (
    <div className="flex gap-6 h-full min-h-[calc(100vh-120px)]">
      {/* ── Left: Search + results ── */}
      <div className="w-80 shrink-0 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-5 h-5" style={{ color: NAVY }} />
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Global Traceability</h1>
          </div>
          <p className="text-sm max-w-md" style={{ color: '#64748b' }}>
            The forensic view — find any order by <strong>serial number, warranty number, or
            supplier invoice number</strong> (not just order # or customer, like Shop Orders), then
            see its complete history: items, procurement, payments, warranty, and every email sent.
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: '#e2e8f0' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            placeholder="Serial, order #, PO, customer…"
            className="flex-1 text-sm outline-none bg-transparent placeholder-slate-400"
            style={{ color: '#0f172a' }}
          />
          {searching && (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: NAVY, borderTopColor: 'transparent' }} />
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {linkError && (
            <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: '#fefce8', color: '#854d0e', border: '1px solid #fde68a' }}>
              {linkError}
            </div>
          )}
          {results && allResults.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: '#94a3b8' }}>No results for "{query}"</div>
          )}

          {allResults.map((item) => {
            const Icon = TYPE_ICON[item.type] || Search;
            const color = TYPE_COLOR[item.type] || TYPE_COLOR_DEFAULT;
            const label = TYPE_LABEL[item.type] || item.type;
            const isSelected = item.sfOrderId === selectedSfOrderId;
            const cardStyle = isSelected
              ? { borderColor: '#D9D4FB', background: '#EEF0FE' }
              : item.sfOrderId
              ? { borderColor: '#e2e8f0', background: '#fff' }
              : { borderColor: '#f1f5f9', background: '#f8fafc' };
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => item.sfOrderId ? loadChain(item.sfOrderId) : setLinkError(`Could not find a linked order for "${item.title}".`)}
                className="w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm"
                style={cardStyle}
              >
                <div className="p-1.5 rounded-lg shrink-0" style={{ background: color.bg, color: color.color }}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs" style={{ color: '#0f172a' }}>{item.title}</span>
                    <span className="px-1.5 py-px rounded text-[9px] font-bold" style={{ background: color.bg, color: color.color }}>{label}</span>
                  </div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: '#64748b' }}>{item.subtitle}</div>
                  <div className="text-[10px] mt-0.5 truncate" style={{ color: '#94a3b8' }}>{item.meta}</div>
                </div>
                {item.sfOrderId && <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#cbd5e1' }} />}
              </button>
            );
          })}

          {!results && !searching && (
            <div className="text-center py-16">
              <Search className="w-10 h-10 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Start typing to search the supply chain</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Investigation Panel ── */}
      <div className="flex-1 min-w-0 border-l pl-6 overflow-y-auto" style={{ borderColor: '#e2e8f0' }}>
        {loadingChain && (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3" style={{ color: '#94a3b8' }}>
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: NAVY, borderTopColor: 'transparent' }} />
              <span className="text-sm">Loading investigation chain…</span>
            </div>
          </div>
        )}

        {!loadingChain && chain && <InvestigationPanel chain={chain} />}

        {!loadingChain && !chain && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#f8fafc' }}>
              <Search className="w-7 h-7" style={{ color: '#cbd5e1' }} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: '#475569' }}>Select a result to investigate</h2>
            <p className="text-xs mt-1 max-w-xs" style={{ color: '#94a3b8' }}>
              The full audit trail — items, procurement, fulfilment, accounts payable, warranties, and email communications — will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
