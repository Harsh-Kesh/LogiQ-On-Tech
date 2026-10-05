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
import { sendTransactionalEmail, renderEmailShell, emailInfoTable, emailItemsTable, emailCallout } from '@/lib/email';
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

  if (isFinalDelivery) {
    // Full delivery email with tax invoice
    const html = renderEmailShell({
      eyebrow: 'Delivery Confirmation',
      heading: 'Your order has been delivered',
      subheading: `Hi ${sfOrder.customerName}, here's your tax invoice for your records`,
      tone: 'success',
      bodyHtml: `
        ${emailInfoTable([
          { label: 'Order #', value: sfOrder.orderNumber, accent: true },
          { label: 'Invoice #', value: myobInvoiceNumber || 'Pending' },
          { label: 'Tracking', value: trackingNumber || sfOrder.sektorTrackingNumber || '—' },
        ])}
        <p style="margin:16px 0 4px;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">Tax Invoice</p>
        ${emailItemsTable(
          sfOrder.items.map((item) => ({ label: item.itemName, qty: item.quantity, lineTotal: Number(item.lineTotal) })),
          'AUD',
          {
            totals: [
              { label: 'Subtotal (ex GST)', value: `AUD ${totalEx.toFixed(2)}` },
              { label: 'GST (10%)', value: `AUD ${gst.toFixed(2)}` },
              { label: 'Total Paid (inc GST)', value: `AUD ${totalInc.toFixed(2)}`, strong: true },
            ],
          }
        )}
        <p style="margin:0 0 4px;font-size:11.5px;color:#94a3b8">ABN: [LogiQ-On Tech ABN] · Payment received ${sfOrder.paidAt ? new Date(sfOrder.paidAt).toLocaleDateString('en-AU') : invoiceDate}</p>
        <p style="margin:0;font-size:13px;color:#64748b">Thank you for your business.</p>`,
    });
    await sendTransactionalEmail({
      to: sfOrder.customerEmail,
      subject: `Delivered + Tax Invoice — ${sfOrder.orderNumber}`,
      html,
    }).catch((err) => console.warn('[Sektor webhook] Delivery email failed:', err));
  } else {
    // Status update email
    const html = renderEmailShell({
      eyebrow: 'Order Update',
      heading: statusLabel.replace(' ✓', ''),
      subheading: `Order ${sfOrder.orderNumber}`,
      bodyHtml: `
        <p>Hi <strong>${sfOrder.customerName}</strong>, here's an update on your order.</p>
        ${emailCallout(
          `<strong style="display:block;font-size:14px;margin-bottom:${trackingNumber ? '6px' : '0'}">${statusLabel}</strong>${trackingNumber ? `Tracking: <strong>${trackingNumber}</strong>` : ''}`
        )}
        <p style="margin:0;font-size:13px;color:#64748b">Thank you for your business.</p>`,
    });
    await sendTransactionalEmail({
      to: sfOrder.customerEmail,
      subject: `Order Update — ${sfOrder.orderNumber} — ${statusLabel.split('—')[0].trim()}`,
      html,
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
