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
import { sendTransactionalEmail, renderEmailShell, emailInfoTable, emailItemsTable } from '@/lib/email';
import { logAuditEvent } from '@/lib/audit';
import { convertMyobSalesOrderToInvoice } from '@/lib/myob';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { storefrontOrderId, deliveryDate: deliveryDateInput } = await req.json();
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
  // The owner picks the actual date goods reached the customer — this may well be
  // earlier than today if they're only getting around to marking it now. The
  // warranty clock starts from THIS date, not from when the button was clicked.
  const deliveryDate = deliveryDateInput ? new Date(deliveryDateInput) : now;
  if (isNaN(deliveryDate.getTime())) {
    return NextResponse.json({ error: 'Invalid deliveryDate' }, { status: 400 });
  }
  const trackingNumber = sfOrder.sektorTrackingNumber || `TRACK-${Date.now()}`;

  await prisma.storefrontOrder.update({
    where: { id: storefrontOrderId },
    data: {
      status: 'FULFILLED',
      fulfilledAt: deliveryDate,
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
        const newStart = deliveryDate;
        const newExpiry = new Date(newStart);
        newExpiry.setMonth(newExpiry.getMonth() + wr.warrantyPeriodMonths);
        const remainingDays = Math.ceil((newExpiry.getTime() - now.getTime()) / 86_400_000);
        const newStatus = remainingDays <= 30 ? 'EXPIRING_SOON' : remainingDays <= 180 ? 'FINAL_SIX_MONTHS' : 'ACTIVE';
        await prisma.warrantyRecord.update({
          where: { id: wr.id },
          data: {
            deliveryDate: newStart,
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
      const invoiceDate = deliveryDate.toISOString().split('T')[0];
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
  const invoiceDate = deliveryDate.toISOString().split('T')[0];
  const totalInc = Number(sfOrder.totalAmount);
  const totalEx = +(totalInc / 1.1).toFixed(2);
  const gst = +(totalInc - totalEx).toFixed(2);

  const emailHtml = renderEmailShell({
    eyebrow: 'Delivery Confirmation',
    heading: 'Your order has been delivered',
    subheading: `Hi ${sfOrder.customerName}, here's your tax invoice for your records`,
    tone: 'success',
    bodyHtml: `
      ${emailInfoTable([
        { label: 'Order #', value: sfOrder.orderNumber, accent: true },
        { label: 'Invoice #', value: myobInvoiceNumber || 'Pending' },
        { label: 'Date', value: invoiceDate },
      ])}
      <p style="margin:16px 0 4px;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">Tax Invoice</p>
      ${emailItemsTable(
        sfOrder.items.map((item) => ({ label: item.itemName, qty: item.quantity, unitPrice: Number(item.unitPrice), lineTotal: Number(item.lineTotal) })),
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
    html: emailHtml,
    orderId: sfOrder.id,
  }).catch((err) => console.warn('[mark-fulfilled] Email failed:', err));

  await logAuditEvent({
    action: 'ORDER_MARKED_FULFILLED',
    module: 'GOVERNANCE',
    targetId: storefrontOrderId,
    payloadJson: { orderNumber: sfOrder.orderNumber, trackingNumber, myobInvoiceNumber, deliveryDate: deliveryDate.toISOString() },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    trackingNumber,
    myobInvoiceNumber,
    deliveryDate: deliveryDate.toISOString(),
    fulfilled: true,
  });
}
