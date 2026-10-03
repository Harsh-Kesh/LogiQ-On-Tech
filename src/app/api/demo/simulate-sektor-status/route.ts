// Demo-only: advance a SUPPLIER_PAID order through Sektor's delivery stages
// one step at a time (PROCESSING → DISPATCHED → OUT_FOR_DELIVERY → DELIVERED).
// At DELIVERED the order becomes FULFILLED, the MYOB Sales Order is converted
// to a Customer Invoice, and the customer receives their tax invoice email.
// In production this happens automatically via /api/webhooks/sektor.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTransactionalEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/audit';
import { convertMyobSalesOrderToInvoice } from '@/lib/myob';

const STAGE_ORDER = ['PROCESSING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
type SektorStage = typeof STAGE_ORDER[number];

function nextStage(current: string | null): SektorStage {
  if (!current) return 'PROCESSING';
  const idx = STAGE_ORDER.indexOf(current as SektorStage);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return 'DELIVERED';
  return STAGE_ORDER[idx + 1];
}

const STAGE_LABELS: Record<SektorStage, string> = {
  PROCESSING: 'Processing — your order is being picked and prepared',
  DISPATCHED: 'Dispatched — your order has left the warehouse and is in transit',
  OUT_FOR_DELIVERY: 'Out for delivery — your order is with the courier today',
  DELIVERED: 'Delivered ✓',
};

const STAGE_COLORS: Record<SektorStage, string> = {
  PROCESSING: '#f59e0b',
  DISPATCHED: '#6366f1',
  OUT_FOR_DELIVERY: '#3b82f6',
  DELIVERED: '#059669',
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { storefrontOrderId } = await req.json();
  if (!storefrontOrderId) {
    return NextResponse.json({ error: 'storefrontOrderId required' }, { status: 400 });
  }

  const sfOrder = await prisma.storefrontOrder.findUniqueOrThrow({
    where: { id: storefrontOrderId },
    include: { items: true },
  });

  if (sfOrder.status !== 'SUPPLIER_PAID') {
    return NextResponse.json(
      { error: `Order must be in SUPPLIER_PAID status (current: ${sfOrder.status})` },
      { status: 422 }
    );
  }

  const stage = nextStage(sfOrder.sektorStatus);
  const isFinal = stage === 'DELIVERED';
  const now = new Date();
  const trackingNumber = sfOrder.sektorTrackingNumber || `SEKT-TRACK-${Date.now()}`;

  // Determine order status update
  const orderStatusUpdate = isFinal
    ? { status: 'FULFILLED' as const, fulfilledAt: now, sektorStatus: stage, sektorStatusUpdatedAt: now, sektorTrackingNumber: trackingNumber }
    : { sektorStatus: stage, sektorStatusUpdatedAt: now, sektorTrackingNumber: trackingNumber };

  await prisma.storefrontOrder.update({ where: { id: storefrontOrderId }, data: orderStatusUpdate });

  // On final delivery: convert MYOB Sales Order → Customer Invoice
  let myobInvoiceNumber: string | null = null;
  if (isFinal && sfOrder.myobSoGuid) {
    try {
      const invoiceDate = now.toISOString().split('T')[0];
      const inv = await convertMyobSalesOrderToInvoice(
        sfOrder.myobSoGuid,
        invoiceDate,
        `Tax Invoice — ${sfOrder.orderNumber} — delivered ${invoiceDate}`
      );
      myobInvoiceNumber = inv.invoiceNumber;
      await prisma.storefrontOrder.update({
        where: { id: storefrontOrderId },
        data: { myobInvoiceGuid: inv.guid, myobInvoiceNumber: inv.invoiceNumber },
      });
    } catch (err) {
      console.warn('[simulate-sektor-status] MYOB SO→Invoice conversion failed:', err);
    }
  }

  // Send status update email to customer
  const stageLabel = STAGE_LABELS[stage];
  const accentColor = STAGE_COLORS[stage];
  const invoiceDate = now.toISOString().split('T')[0];
  const totalInc = Number(sfOrder.totalAmount);
  const totalEx = +(totalInc / 1.1).toFixed(2);
  const gst = +(totalInc - totalEx).toFixed(2);

  const itemRows = sfOrder.items
    .map(
      (item) => `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${item.itemName}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.quantity}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">AUD ${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">AUD ${Number(item.lineTotal).toFixed(2)}</td>
    </tr>`
    )
    .join('');

  const emailHtml = isFinal
    ? `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
        <div style="background:${accentColor};padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="color:#ffffff;margin:0;font-size:20px">Order Delivered ✓</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">Your order from LogiQ-On Tech has arrived.</p>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p style="margin:0 0 16px">Hi <strong>${sfOrder.customerName}</strong>,</p>
          <p style="margin:0 0 24px">Great news — your order has been delivered. Please find your tax invoice below for your records.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr style="background:#f8fafc">
              <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b">Order #</td>
              <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b">Invoice #</td>
              <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b">Tracking</td>
              <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b">Date</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;font-weight:700">${sfOrder.orderNumber}</td>
              <td style="padding:8px 12px;font-weight:700;color:#4f46e5">${myobInvoiceNumber || 'Pending'}</td>
              <td style="padding:8px 12px;font-size:13px">${trackingNumber}</td>
              <td style="padding:8px 12px;font-size:13px">${invoiceDate}</td>
            </tr>
          </table>
          <p style="margin:0 0 8px;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">Tax Invoice</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <thead><tr style="background:#f8fafc">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b">Item</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b">Qty</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#64748b">Unit Price</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#64748b">Line Total</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr><td colspan="3" style="padding:6px 12px;text-align:right;font-size:13px;color:#64748b">Subtotal (ex GST)</td><td style="padding:6px 12px;text-align:right;font-size:13px">AUD ${totalEx.toFixed(2)}</td></tr>
              <tr><td colspan="3" style="padding:6px 12px;text-align:right;font-size:13px;color:#64748b">GST (10%)</td><td style="padding:6px 12px;text-align:right;font-size:13px">AUD ${gst.toFixed(2)}</td></tr>
              <tr style="background:#f8fafc"><td colspan="3" style="padding:8px 12px;text-align:right;font-weight:700">Total Paid (inc GST)</td><td style="padding:8px 12px;text-align:right;font-weight:700">AUD ${totalInc.toFixed(2)}</td></tr>
            </tfoot>
          </table>
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8">ABN: [LogiQ-On Tech ABN] | Payment received ${sfOrder.paidAt ? new Date(sfOrder.paidAt).toLocaleDateString('en-AU') : invoiceDate}.</p>
          <p style="margin:0;font-size:13px;color:#64748b">Thank you for your business,<br/><strong>LogiQ-On Tech</strong></p>
        </div>
      </div>`
    : `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
        <div style="background:${accentColor};padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="color:#ffffff;margin:0;font-size:20px">Order Update</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">Your LogiQ-On Tech order ${sfOrder.orderNumber}</p>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p style="margin:0 0 16px">Hi <strong>${sfOrder.customerName}</strong>,</p>
          <p style="margin:0 0 16px">Here is the latest update on your order:</p>
          <div style="background:#f8fafc;border-left:4px solid ${accentColor};padding:16px 20px;margin:0 0 24px;border-radius:0 8px 8px 0">
            <p style="margin:0;font-weight:700;font-size:15px;color:#0f172a">${stageLabel}</p>
            <p style="margin:8px 0 0;font-size:13px;color:#64748b">Tracking: <strong>${trackingNumber}</strong></p>
          </div>
          <p style="margin:0 0 16px;font-size:13px;color:#64748b">Once delivered, you'll receive your tax invoice by email.</p>
          <p style="margin:0;font-size:13px;color:#64748b">Thank you,<br/><strong>LogiQ-On Tech</strong></p>
        </div>
      </div>`;

  const emailSubject = isFinal
    ? `Delivered + Tax Invoice — ${sfOrder.orderNumber}`
    : `Order Update — ${sfOrder.orderNumber} — ${stage.replace(/_/g, ' ')}`;

  await sendTransactionalEmail({
    to: sfOrder.customerEmail,
    subject: emailSubject,
    html: emailHtml,
    orderId: sfOrder.id,
  }).catch((err) => console.warn('[simulate-sektor-status] Email failed:', err));

  await logAuditEvent({
    action: 'SEKTOR_STATUS_SIMULATE',
    module: 'GOVERNANCE',
    targetId: storefrontOrderId,
    payloadJson: { orderNumber: sfOrder.orderNumber, stage, trackingNumber, myobInvoiceNumber, demo: true },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    stage,
    trackingNumber,
    myobInvoiceNumber,
    fulfilled: isFinal,
    nextStage: isFinal ? null : nextStage(stage),
  });
}
