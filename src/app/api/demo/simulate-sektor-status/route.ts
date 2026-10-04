// Mark a SUPPLIER_PAID order as fulfilled — a manual, owner-triggered action.
// There is no real courier integration, so delivery updates never arrive on their
// own; once the supplier has been paid, the owner confirms delivery themselves.
// This converts the MYOB Sales Order to a Customer Invoice and emails the
// customer their tax invoice. In a future integration this could instead be
// triggered automatically by a real courier webhook.

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
      { error: `Order must be in SUPPLIER_PAID status (current: ${sfOrder.status})` },
      { status: 422 }
    );
  }

  const now = new Date();
  const trackingNumber = sfOrder.sektorTrackingNumber || `TRACK-${Date.now()}`;

  await prisma.storefrontOrder.update({
    where: { id: storefrontOrderId },
    data: {
      status: 'FULFILLED',
      fulfilledAt: now,
      sektorStatus: 'DELIVERED',
      sektorStatusUpdatedAt: now,
      sektorTrackingNumber: trackingNumber,
    },
  });

  // Update warranty records' delivery date (start of warranty clock)
  if (sfOrder.salesOrderId) {
    const warrantyRecords = await prisma.warrantyRecord.findMany({
      where: { salesOrderId: sfOrder.salesOrderId, status: { not: 'CLOSED' } },
    });
    for (const wr of warrantyRecords) {
      if (wr.warrantyStartRule === 'DELIVERY_DATE') {
        const newStart = now;
        const newExpiry = new Date(newStart);
        newExpiry.setMonth(newExpiry.getMonth() + wr.warrantyPeriodMonths);
        const remainingDays = Math.ceil((newExpiry.getTime() - now.getTime()) / 86_400_000);
        const newStatus = remainingDays <= 30 ? 'EXPIRING_SOON' : remainingDays <= 180 ? 'FINAL_SIX_MONTHS' : 'ACTIVE';
        await prisma.warrantyRecord.update({
          where: { id: wr.id },
          data: {
            deliveryDate: now,
            warrantyStartDate: newStart,
            warrantyExpiryDate: newExpiry,
            remainingDays,
            status: newStatus as any,
          },
        });
      }
    }
  }

  // Convert MYOB Sales Order → Customer Invoice
  let myobInvoiceNumber: string | null = null;
  if (sfOrder.myobSoGuid) {
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
      console.warn('[mark-fulfilled] MYOB SO→Invoice conversion failed:', err);
    }
  }

  // Send delivery + tax invoice email to customer
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

  const emailHtml = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
      <div style="background:#059669;padding:24px 32px;border-radius:8px 8px 0 0">
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
            <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b">Date</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:700">${sfOrder.orderNumber}</td>
            <td style="padding:8px 12px;font-weight:700;color:#4f46e5">${myobInvoiceNumber || 'Pending'}</td>
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
    </div>`;

  await sendTransactionalEmail({
    to: sfOrder.customerEmail,
    subject: `Delivered + Tax Invoice — ${sfOrder.orderNumber}`,
    html: emailHtml,
    orderId: sfOrder.id,
  }).catch((err) => console.warn('[mark-fulfilled] Email failed:', err));

  await logAuditEvent({
    action: 'ORDER_MARKED_FULFILLED',
    module: 'GOVERNANCE',
    targetId: storefrontOrderId,
    payloadJson: { orderNumber: sfOrder.orderNumber, trackingNumber, myobInvoiceNumber },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    trackingNumber,
    myobInvoiceNumber,
    fulfilled: true,
  });
}
