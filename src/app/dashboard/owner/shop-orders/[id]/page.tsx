'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Package, User, MapPin, CreditCard, Truck,
  CheckCircle2, Clock, Send, Mail, ExternalLink,
} from 'lucide-react';

interface OrderItem {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: string | number;
  taxPercent: string | number;
  lineTotal: string | number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  deliveryAddress: string;
  currency: string;
  subtotal: string | number;
  taxTotal: string | number;
  totalAmount: string | number;
  status: string;
  stripeSessionId?: string;
  stripePaymentId?: string;
  paidAt?: string;
  createdAt: string;
  // MYOB / supplier
  myobSoNumber?: string;
  myobPoNumber?: string;
  poEmailSentTo?: string;
  poEmailSentAt?: string;
  // SO link
  salesOrder?: {
    salesOrderNumber: string;
    status: string;
  } | null;
  items: OrderItem[];
}

const STAGES = [
  { key: 'PAID',       label: 'Payment Received', icon: CreditCard },
  { key: 'SO_CREATED', label: 'Sales Order Created', icon: Package },
  { key: 'PO_SENT',    label: 'PO Sent to Supplier', icon: Send },
  { key: 'SHIPPED',    label: 'Shipped', icon: Truck },
  { key: 'DELIVERED',  label: 'Delivered', icon: CheckCircle2 },
];

const STAGE_ORDER = STAGES.map((s) => s.key);

function stageIndex(status: string) {
  const idx = STAGE_ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

export default function ShopOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/storefront/orders/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setOrder)
      .catch(() => setError('Order not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <style>{`@keyframes _spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#1e3a8a', animation: '_spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-32">
        <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>{error || 'Order not found.'}</p>
        <Link href="/dashboard/owner/shop-orders" className="text-xs mt-4 inline-block" style={{ color: '#1e3a8a' }}>← Back to orders</Link>
      </div>
    );
  }

  const fmt = (v: string | number) => Number(v).toFixed(2);
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const currentStage = stageIndex(order.status);

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Back + header */}
      <div>
        <Link href="/dashboard/owner/shop-orders" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4 hover:underline" style={{ color: '#1e3a8a' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Shop Orders
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Order</p>
            <h1 className="text-2xl font-extrabold font-mono" style={{ color: '#0f172a' }}>{order.orderNumber}</h1>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Placed {fmtDate(order.createdAt)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Stage timeline */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e2e8f0' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: '#94a3b8' }}>Order Progress</p>
        <div className="flex items-start gap-0">
          {STAGES.map((stage, i) => {
            const done = i <= currentStage;
            const active = i === currentStage;
            const Icon = stage.icon;
            return (
              <div key={stage.key} className="flex-1 flex flex-col items-center text-center relative">
                {/* Connector line */}
                {i > 0 && (
                  <div style={{
                    position: 'absolute', top: 16, right: '50%', width: '100%', height: 2,
                    background: done ? '#1e3a8a' : '#e2e8f0',
                    zIndex: 0,
                  }} />
                )}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', position: 'relative', zIndex: 1,
                  background: done ? '#1e3a8a' : '#f1f5f9',
                  border: `2px solid ${done ? '#1e3a8a' : '#e2e8f0'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: active ? '0 0 0 4px rgba(30,58,138,0.12)' : 'none',
                }}>
                  <Icon style={{ width: 14, height: 14, color: done ? '#fff' : '#cbd5e1' }} />
                </div>
                <p className="text-[10px] font-semibold mt-2 leading-tight px-1" style={{ color: done ? '#0f172a' : '#94a3b8' }}>
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer */}
        <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4" style={{ color: '#1e3a8a' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Customer</p>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#0f172a' }}>{order.customerName}</p>
            <a href={`mailto:${order.customerEmail}`} className="text-xs hover:underline" style={{ color: '#1e3a8a' }}>{order.customerEmail}</a>
          </div>
          <div className="flex items-start gap-2 pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#94a3b8' }} />
            <p className="text-xs leading-snug" style={{ color: '#475569' }}>{order.deliveryAddress}</p>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4" style={{ color: '#1e3a8a' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Payment</p>
          </div>
          <div className="space-y-2">
            <Row label="Paid at" value={fmtDate(order.paidAt)} />
            {order.stripePaymentId && (
              <Row label="Stripe Payment" value={
                <span className="font-mono text-[10px] truncate block" style={{ color: '#64748b' }}>{order.stripePaymentId}</span>
              } />
            )}
            <div className="border-t pt-2 space-y-1.5" style={{ borderColor: '#f1f5f9' }}>
              <Row label="Subtotal" value={`${order.currency} ${fmt(order.subtotal)}`} />
              <Row label="GST (10%)" value={`${order.currency} ${fmt(order.taxTotal)}`} />
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-bold" style={{ color: '#0f172a' }}>Total Paid</span>
                <span className="text-sm font-black font-mono" style={{ color: '#0f172a' }}>{order.currency} {fmt(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#f1f5f9' }}>
          <Package className="w-4 h-4" style={{ color: '#1e3a8a' }} />
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Items Ordered</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>SKU</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Item</th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Qty</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Unit (ex GST)</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: i < order.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{item.itemCode}</td>
                  <td className="px-5 py-3 font-semibold text-xs" style={{ color: '#0f172a' }}>{item.itemName}</td>
                  <td className="px-5 py-3 text-center text-xs font-mono" style={{ color: '#0f172a' }}>{item.quantity}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs" style={{ color: '#0f172a' }}>{order.currency} {fmt(item.unitPrice)}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs font-bold" style={{ color: '#0f172a' }}>{order.currency} {fmt(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier / SO / PO */}
      {(order.salesOrder || order.myobPoNumber || order.poEmailSentTo) && (
        <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-4 h-4" style={{ color: '#1e3a8a' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Supplier & Fulfilment</p>
          </div>
          <div className="space-y-2">
            {order.salesOrder?.salesOrderNumber && (
              <Row label="Sales Order" value={
                <Link href="/dashboard/owner/pipeline" className="font-mono text-xs hover:underline" style={{ color: '#1e3a8a' }}>
                  {order.salesOrder.salesOrderNumber}
                </Link>
              } />
            )}
            {order.myobSoNumber && <Row label="MYOB SO #" value={order.myobSoNumber} mono />}
            {order.myobPoNumber && <Row label="Purchase Order #" value={order.myobPoNumber} mono />}
            {order.poEmailSentTo && (
              <Row label="PO Emailed to" value={
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" style={{ color: '#94a3b8' }} />
                  <a href={`mailto:${order.poEmailSentTo}`} className="text-xs hover:underline" style={{ color: '#1e3a8a' }}>{order.poEmailSentTo}</a>
                </span>
              } />
            )}
            {order.poEmailSentAt && <Row label="PO Sent at" value={fmtDate(order.poEmailSentAt)} />}
          </div>
          <div className="pt-3 border-t" style={{ borderColor: '#f1f5f9' }}>
            <Link
              href="/dashboard/owner/emails"
              className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
              style={{ color: '#1e3a8a' }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> View all sent emails (PO, confirmation)
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    PAID:        { label: 'Paid',        bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    SO_CREATED:  { label: 'SO Created',  bg: '#eff6ff', color: '#1e3a8a', border: '#bfdbfe' },
    PO_SENT:     { label: 'PO Sent',     bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
    SHIPPED:     { label: 'Shipped',     bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    DELIVERED:   { label: 'Delivered',   bg: '#ecfdf5', color: '#15803d', border: '#86efac' },
    CANCELLED:   { label: 'Cancelled',   bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
    PENDING_PAYMENT: { label: 'Pending', bg: '#fafafa', color: '#71717a', border: '#e4e4e7' },
  };
  const s = map[status] ?? map.PENDING_PAYMENT;
  return (
    <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs shrink-0" style={{ color: '#94a3b8' }}>{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono' : 'font-semibold'}`} style={{ color: '#0f172a' }}>{value}</span>
    </div>
  );
}
