// Storefront order flow after the supplier invoice arrives:
//   INVOICE_RECEIVED → 3-way match → MATCHED → supplier bill → BILL_CREATED → dispatch (FULFILLED)
// The supplier only invoices once goods have shipped, so the invoice's courier tracking
// number is what we email the customer. No supplier-payment step — that happens outside the app.

import type { UserRole } from '@prisma/client';
import { prisma } from './prisma';
import { runThreeWayMatch, createSupplierBill } from './three-way-match';
import { convertMyobSalesOrderToInvoice } from './myob';
import { sendTransactionalEmail, renderEmailShell, emailInfoTable, emailItemsTable, emailCallout, emailButton } from './email';
import { logAuditEvent } from './audit';
import { escapeHtml } from './mail-helpers';
import { carrierLabel, normalizeCarrier, trackingUrl } from './carriers';

export interface DispatchInput {
  trackingNumber: string;
  carrier?: string | null;
  dispatchDate?: Date;
  actor?: { userId?: string; role?: UserRole };
}

/**
 * BILL_CREATED → FULFILLED: records tracking, starts the warranty clock, converts the
 * MYOB Sales Order to an invoice (stub while MYOB is deferred) and emails the customer
 * their tracking link + tax invoice. Throws if the order is not at BILL_CREATED.
 */
export async function dispatchOrder(storefrontOrderId: string, input: DispatchInput) {
  const trackingNumber = input.trackingNumber.trim();
  if (!trackingNumber) throw new Error('Tracking number is required');
  const carrier = normalizeCarrier(input.carrier);
  const now = new Date();
  const dispatchDate = input.dispatchDate ?? now;

  // Claim the transition atomically so the email can never go out twice
  // (e.g. invoice poller and the owner's button at the same moment).
  const claimed = await prisma.storefrontOrder.updateMany({
    // SUPPLIER_PAID: legacy orders from before the supplier-payment step was removed.
    where: { id: storefrontOrderId, status: { in: ['BILL_CREATED', 'SUPPLIER_PAID'] } },
    data: {
      status: 'FULFILLED',
      fulfilledAt: dispatchDate,
      sektorStatus: 'DISPATCHED',
      sektorStatusUpdatedAt: now,
      sektorTrackingNumber: trackingNumber,
      trackingCarrier: carrier,
    },
  });
  const sfOrder = await prisma.storefrontOrder.findUniqueOrThrow({ where: { id: storefrontOrderId }, include: { items: true } });
  if (claimed.count === 0) {
    throw new Error(`Order must be at Bill Created to dispatch (current: ${sfOrder.status})`);
  }

  // Warranty clock starts at dispatch (we get no delivery confirmation).
  if (sfOrder.salesOrderId) {
    const records = await prisma.warrantyRecord.findMany({
      where: { salesOrderId: sfOrder.salesOrderId, status: { not: 'CLOSED' }, warrantyStartRule: 'DELIVERY_DATE' },
    });
    for (const wr of records) {
      const expiry = new Date(dispatchDate);
      expiry.setMonth(expiry.getMonth() + wr.warrantyPeriodMonths);
      const remainingDays = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
      await prisma.warrantyRecord.update({
        where: { id: wr.id },
        data: {
          deliveryDate: dispatchDate,
          warrantyStartDate: dispatchDate,
          warrantyExpiryDate: expiry,
          remainingDays,
          status: (remainingDays <= 30 ? 'EXPIRING_SOON' : remainingDays <= 180 ? 'FINAL_SIX_MONTHS' : 'ACTIVE') as any,
        },
      });
    }
  }

  const invoiceDate = dispatchDate.toISOString().split('T')[0];
  let myobInvoiceNumber: string | null = null;
  if (sfOrder.myobSoGuid) {
    try {
      const inv = await convertMyobSalesOrderToInvoice(sfOrder.myobSoGuid, invoiceDate, `Tax Invoice — ${sfOrder.orderNumber} — dispatched ${invoiceDate}`);
      myobInvoiceNumber = inv.invoiceNumber;
      await prisma.storefrontOrder.update({
        where: { id: storefrontOrderId },
        data: { myobInvoiceGuid: inv.guid, myobInvoiceNumber: inv.invoiceNumber },
      });
    } catch (err) {
      console.warn('[dispatch] MYOB SO→Invoice conversion failed:', err);
    }
  }

  const url = trackingUrl(carrier, trackingNumber);
  const label = carrierLabel(carrier);
  const trackingHtml = url
    ? `<a href="${url}" style="color:#4C3AE3;font-weight:700">${escapeHtml(trackingNumber)}</a>`
    : `<strong>${escapeHtml(trackingNumber)}</strong>`;
  const totalInc = Number(sfOrder.totalAmount);
  const totalEx = +(totalInc / 1.1).toFixed(2);
  const gst = +(totalInc - totalEx).toFixed(2);

  const html = renderEmailShell({
    eyebrow: 'Dispatch Notification',
    heading: 'Your order is on its way',
    subheading: `Hi ${escapeHtml(sfOrder.customerName)}, your order ${sfOrder.orderNumber} has been dispatched`,
    tone: 'success',
    bodyHtml: `
      ${emailCallout(`Shipped with <strong>${escapeHtml(label)}</strong><br/>Tracking number: ${trackingHtml}`, 'success')}
      ${url ? emailButton('Track your delivery', url) : `<p style="font-size:13px;color:#64748b">Use the tracking number above on the ${escapeHtml(label)} website to follow your delivery.</p>`}
      ${emailInfoTable([
        { label: 'Order #', value: sfOrder.orderNumber, accent: true },
        { label: 'Invoice #', value: myobInvoiceNumber || 'Pending' },
        { label: 'Dispatched', value: dispatchDate.toLocaleDateString('en-AU') },
        { label: 'Deliver to', value: escapeHtml(sfOrder.deliveryAddress) },
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

  const email = await sendTransactionalEmail({
    to: sfOrder.customerEmail,
    subject: `Dispatched — ${sfOrder.orderNumber} — tracking ${trackingNumber}`,
    html,
    orderId: sfOrder.id,
  }).catch((err) => {
    console.warn('[dispatch] Tracking email failed:', err);
    return { success: false };
  });

  await logAuditEvent({
    userId: input.actor?.userId,
    role: input.actor?.role,
    action: 'STOREFRONT_ORDER_DISPATCHED',
    module: 'GOVERNANCE',
    targetId: storefrontOrderId,
    payloadJson: { orderNumber: sfOrder.orderNumber, trackingNumber, carrier, emailSent: email.success, myobInvoiceNumber },
  }).catch(() => {});

  return { trackingNumber, carrier, trackingUrl: url, myobInvoiceNumber, emailSent: email.success };
}

/** Dispatch automatically when the order is billed and the invoice gave us a tracking number. */
export async function dispatchIfTracked(storefrontOrderId: string): Promise<boolean> {
  const o = await prisma.storefrontOrder.findUnique({
    where: { id: storefrontOrderId },
    select: { status: true, sektorTrackingNumber: true, trackingCarrier: true },
  });
  if (o?.status !== 'BILL_CREATED' || !o.sektorTrackingNumber) return false;
  await dispatchOrder(storefrontOrderId, { trackingNumber: o.sektorTrackingNumber, carrier: o.trackingCarrier });
  return true;
}

/** Everything after a supplier invoice is linked to an order: match → bill → dispatch. */
export async function advanceAfterInvoice(storefrontOrderId: string, supplierInvoiceId: string) {
  const match = await runThreeWayMatch(storefrontOrderId, supplierInvoiceId);
  let billNumber: string | null = null;
  let dispatched = false;
  if (match.matched) {
    try {
      billNumber = (await createSupplierBill(storefrontOrderId, supplierInvoiceId)).billNumber;
      dispatched = await dispatchIfTracked(storefrontOrderId);
    } catch (err: any) {
      // Match is recorded either way — the owner can finish from the order page.
      console.error('[advanceAfterInvoice] bill/dispatch failed:', err.message);
    }
  }
  return { matched: match.matched, notes: match.notes, billNumber, dispatched };
}
