// Sektor delivery status webhook — POST /api/webhooks/sektor
// Sektor calls this URL whenever an order's fulfilment status changes.
// Configure in Sektor portal: Webhook URL = https://yourdomain.com/api/webhooks/sektor
// Set SEKTOR_WEBHOOK_SECRET in Vercel env vars to the secret Sektor provides.
//
// Status progression Sektor sends:
//   PROCESSING       → order received by Sektor, being picked
//   DISPATCHED       → left Sektor warehouse, in transit
//   OUT_FOR_DELIVERY → with last-mile courier
//   DELIVERED        → confirmed delivered (triggers FULFILLED + SO→Invoice)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTransactionalEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/audit';
import { convertMyobSalesOrderToInvoice } from '@/lib/myob';
import crypto from 'crypto';

// Sektor signs every webhook with HMAC-SHA256 using the shared secret.
function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

const STATUS_LABELS: Record<string, string> = {
  PROCESSING: 'Processing — being prepared for dispatch',
  DISPATCHED: 'Dispatched — in transit to you',
  OUT_FOR_DELIVERY: 'Out for delivery — arriving today',
  DELIVERED: 'Delivered ✓',
};

export async function POST(req: Request) {
  const rawBody = await req.text();
  const webhookSecret = process.env.SEKTOR_WEBHOOK_SECRET;

  // Verify signature if secret is configured
  if (webhookSecret) {
    const sig = req.headers.get('x-sektor-signature');
    if (!verifySignature(rawBody, sig, webhookSecret)) {
      console.warn('[Sektor webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Sektor sends: { poNumber, sektorOrderId, status, trackingNumber, estimatedDelivery, updatedAt }
  const { poNumber, sektorOrderId, status, trackingNumber, updatedAt } = payload;
  if (!poNumber || !status) {
    return NextResponse.json({ error: 'poNumber and status are required' }, { status: 400 });
  }

  // Match to our StorefrontOrder by PO number
  const sfOrder = await prisma.storefrontOrder.findFirst({
    where: { myobPoNumber: poNumber },
    include: { items: true },
  });

  if (!sfOrder) {
    console.warn(`[Sektor webhook] No order found for PO ${poNumber}`);
    return NextResponse.json({ received: true, matched: false });
  }

  const statusAt = updatedAt ? new Date(updatedAt) : new Date();
  const isFinalDelivery = status === 'DELIVERED';

  // Update Sektor status fields
  const updateData: any = {
    sektorStatus: status,
    sektorStatusUpdatedAt: statusAt,
    ...(trackingNumber ? { sektorTrackingNumber: trackingNumber } : {}),
    ...(sektorOrderId ? { sektorOrderRef: sektorOrderId } : {}),
  };

  if (isFinalDelivery && sfOrder.status === 'SUPPLIER_PAID') {
    updateData.status = 'FULFILLED';
    updateData.fulfilledAt = statusAt;
  }

  await prisma.storefrontOrder.update({ where: { id: sfOrder.id }, data: updateData });

  // Convert MYOB Sales Order → Customer Invoice on delivery
  let myobInvoiceNumber: string | null = null;
  if (isFinalDelivery && sfOrder.myobSoGuid) {
    try {
      const invoiceDate = statusAt.toISOString().split('T')[0];
      const invoiceResult = await convertMyobSalesOrderToInvoice(
        sfOrder.myobSoGuid,
        invoiceDate,
        `Tax Invoice — ${sfOrder.orderNumber} — delivered ${invoiceDate}`
      );
      myobInvoiceNumber = invoiceResult.invoiceNumber;
      await prisma.storefrontOrder.update({
        where: { id: sfOrder.id },
        data: { myobInvoiceGuid: invoiceResult.guid, myobInvoiceNumber: invoiceResult.invoiceNumber },
      });
    } catch (err) {
      console.warn('[Sektor webhook] MYOB SO→Invoice conversion failed:', err);
    }
  }

  // Email customer with status update
  const statusLabel = STATUS_LABELS[status] || status;
  const totalInc = Number(sfOrder.totalAmount);
  const totalEx = +(totalInc / 1.1).toFixed(2);
  const gst = +(totalInc - totalEx).toFixed(2);
  const invoiceDate = statusAt.toISOString().split('T')[0];

  const itemRows = sfOrder.items.map((item) =>
    `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${item.itemName}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.quantity}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">AUD ${Number(item.lineTotal).toFixed(2)}</td>
    </tr>`
  ).join('');

  if (isFinalDelivery) {
    // Full delivery email with tax invoice
    await sendTransactionalEmail({
      to: sfOrder.customerEmail,
      subject: `Delivered + Tax Invoice — ${sfOrder.orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
          <div style="background:#059669;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#ffffff;margin:0;font-size:20px">Order Delivered ✓</h1>
          </div>
          <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
            <p>Hi <strong>${sfOrder.customerName}</strong>, your order has been delivered.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tr style="background:#f8fafc">
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b">Order #</td>
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b">Invoice #</td>
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b">Tracking</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;font-weight:700">${sfOrder.orderNumber}</td>
                <td style="padding:8px 12px;font-weight:700;color:#4f46e5">${myobInvoiceNumber || 'Pending'}</td>
                <td style="padding:8px 12px">${trackingNumber || sfOrder.sektorTrackingNumber || '—'}</td>
              </tr>
            </table>
            <p style="font-weight:700;font-size:14px;margin:0 0 8px">TAX INVOICE</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <thead><tr style="background:#f8fafc">
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b">Item</th>
                <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b">Qty</th>
                <th style="padding:8px 12px;text-align:right;font-size:12px;color:#64748b">Total</th>
              </tr></thead>
              <tbody>${itemRows}</tbody>
              <tfoot>
                <tr><td colspan="2" style="padding:6px 12px;text-align:right;color:#64748b">Subtotal (ex GST)</td><td style="padding:6px 12px;text-align:right">AUD ${totalEx.toFixed(2)}</td></tr>
                <tr><td colspan="2" style="padding:6px 12px;text-align:right;color:#64748b">GST (10%)</td><td style="padding:6px 12px;text-align:right">AUD ${gst.toFixed(2)}</td></tr>
                <tr style="background:#f8fafc"><td colspan="2" style="padding:8px 12px;text-align:right;font-weight:700">Total Paid (inc GST)</td><td style="padding:8px 12px;text-align:right;font-weight:700">AUD ${totalInc.toFixed(2)}</td></tr>
              </tfoot>
            </table>
            <p style="font-size:12px;color:#94a3b8">ABN: [LogiQ-On Tech ABN] | Payment received ${sfOrder.paidAt ? new Date(sfOrder.paidAt).toLocaleDateString('en-AU') : invoiceDate}</p>
            <p style="font-size:13px;color:#64748b">Thank you,<br/><strong>LogiQ-On Tech</strong></p>
          </div>
        </div>`,
    }).catch((err) => console.warn('[Sektor webhook] Delivery email failed:', err));
  } else {
    // Status update email
    await sendTransactionalEmail({
      to: sfOrder.customerEmail,
      subject: `Order Update — ${sfOrder.orderNumber} — ${statusLabel.split('—')[0].trim()}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
          <div style="background:#4f46e5;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#ffffff;margin:0;font-size:20px">Order Update</h1>
          </div>
          <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
            <p>Hi <strong>${sfOrder.customerName}</strong>,</p>
            <p>Here's an update on your order <strong>${sfOrder.orderNumber}</strong>:</p>
            <div style="background:#f8fafc;border-left:4px solid #4f46e5;padding:16px 20px;margin:16px 0;border-radius:0 8px 8px 0">
              <p style="margin:0;font-weight:700;font-size:15px">${statusLabel}</p>
              ${trackingNumber ? `<p style="margin:8px 0 0;font-size:13px;color:#64748b">Tracking: <strong>${trackingNumber}</strong></p>` : ''}
            </div>
            <p style="font-size:13px;color:#64748b">Thank you,<br/><strong>LogiQ-On Tech</strong></p>
          </div>
        </div>`,
    }).catch((err) => console.warn('[Sektor webhook] Status email failed:', err));
  }

  await logAuditEvent({
    action: 'SEKTOR_STATUS_UPDATE',
    module: 'GOVERNANCE',
    targetId: sfOrder.id,
    payloadJson: { orderNumber: sfOrder.orderNumber, status, trackingNumber, myobInvoiceNumber },
  }).catch(() => {});

  return NextResponse.json({ received: true, matched: true, orderNumber: sfOrder.orderNumber, status });
}
