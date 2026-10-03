// Demo-only: simulates Sektor confirming delivery (in production this comes via
// Sektor's delivery webhook at /api/webhooks/sektor).
// Advances SUPPLIER_PAID → FULFILLED, converts the MYOB Sales Order to a
// Customer Invoice, and sends the customer a delivery confirmation with invoice.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTransactionalEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/audit';
import { convertMyobSalesOrderToInvoice } from '@/lib/myob';

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
      { error: `Order must be SUPPLIER_PAID to simulate delivery (current: ${sfOrder.status})` },
      { status: 422 }
    );
  }

  const trackingNumber = `SEKT-TRACK-${Date.now()}`;
  const deliveredAt = new Date();
  const invoiceDate = deliveredAt.toISOString().split('T')[0];

  // Convert MYOB Sales Order → Customer Invoice now that goods are delivered
  let myobInvoiceNumber: string | null = null;
  if (sfOrder.myobSoGuid) {
    try {
      const invoiceResult = await convertMyobSalesOrderToInvoice(
        sfOrder.myobSoGuid,
        invoiceDate,
        `Tax Invoice — ${sfOrder.orderNumber} — delivered ${invoiceDate}`
      );
      myobInvoiceNumber = invoiceResult.invoiceNumber;
      await prisma.storefrontOrder.update({
        where: { id: storefrontOrderId },
        data: { myobInvoiceGuid: invoiceResult.guid, myobInvoiceNumber: invoiceResult.invoiceNumber },
      });
    } catch (err) {
      console.warn('MYOB SO→Invoice conversion failed (non-fatal):', err);
    }
  }

  await prisma.storefrontOrder.update({
    where: { id: storefrontOrderId },
    data: {
      status: 'FULFILLED',
      sektorStatus: 'DELIVERED',
      sektorStatusUpdatedAt: deliveredAt,
      sektorTrackingNumber: trackingNumber,
      fulfilledAt: deliveredAt,
    },
  });

  // Build item rows for the invoice email
  const totalInc = Number(sfOrder.totalAmount);
  const totalEx = +(totalInc / 1.1).toFixed(2);
  const gst = +(totalInc - totalEx).toFixed(2);

  const itemRows = sfOrder.items.map((item) =>
    `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${item.itemName}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.quantity}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">AUD ${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">AUD ${Number(item.lineTotal).toFixed(2)}</td>
    </tr>`
  ).join('');

  // Delivery confirmation + Tax Invoice email to customer
  await sendTransactionalEmail({
    to: sfOrder.customerEmail,
    subject: `Delivered + Tax Invoice — ${sfOrder.orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
        <div style="background:#059669;padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="color:#ffffff;margin:0;font-size:20px">Order Delivered ✓</h1>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p style="margin:0 0 16px">Hi <strong>${sfOrder.customerName}</strong>,</p>
          <p style="margin:0 0 24px">Your order has been delivered. Please find your tax invoice below.</p>

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

          <p style="margin:0 0 8px;font-weight:700;font-size:14px">TAX INVOICE</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b">Item</th>
                <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b">Qty</th>
                <th style="padding:8px 12px;text-align:right;font-size:12px;color:#64748b">Unit Price</th>
                <th style="padding:8px 12px;text-align:right;font-size:12px;color:#64748b">Line Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding:6px 12px;text-align:right;font-size:13px;color:#64748b">Subtotal (ex GST)</td>
                <td style="padding:6px 12px;text-align:right;font-size:13px">AUD ${totalEx.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding:6px 12px;text-align:right;font-size:13px;color:#64748b">GST (10%)</td>
                <td style="padding:6px 12px;text-align:right;font-size:13px">AUD ${gst.toFixed(2)}</td>
              </tr>
              <tr style="background:#f8fafc">
                <td colspan="3" style="padding:8px 12px;text-align:right;font-weight:700">Total Paid (inc GST)</td>
                <td style="padding:8px 12px;text-align:right;font-weight:700">AUD ${totalInc.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8">ABN: [LogiQ-On Tech ABN]</p>
          <p style="margin:0 0 24px;font-size:12px;color:#94a3b8">Payment received via Stripe on ${sfOrder.paidAt ? new Date(sfOrder.paidAt).toLocaleDateString('en-AU') : invoiceDate}. This is your tax invoice.</p>
          <p style="margin:0;font-size:13px;color:#64748b">Thank you for your business,<br/><strong>LogiQ-On Tech</strong></p>
        </div>
      </div>`,
  }).catch((err) => console.warn('Delivery/invoice email failed:', err));

  await logAuditEvent({
    action: 'STOREFRONT_ORDER_FULFILLED',
    module: 'GOVERNANCE',
    targetId: storefrontOrderId,
    payloadJson: { orderNumber: sfOrder.orderNumber, trackingNumber, myobInvoiceNumber, demo: true },
  }).catch(() => {});

  return NextResponse.json({ success: true, trackingNumber, myobInvoiceNumber, status: 'FULFILLED' });
}
