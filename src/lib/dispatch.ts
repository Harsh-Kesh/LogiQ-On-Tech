// Storefront order flow after the supplier invoice arrives:
//   INVOICE_RECEIVED → 3-way match → MATCHED → supplier bill → BILL_CREATED
//   → DISPATCHED (tracking email) → FULFILLED (delivered to the customer)
// The supplier only invoices once goods have shipped, so the invoice's courier tracking
// number is what we email the customer. Delivery comes from the courier (src/lib/tracking.ts)
// or the owner's "Mark Delivered" button. No supplier-payment step — that happens outside the app.

import type { UserRole } from '@prisma/client';
import { prisma } from './prisma';
import { runThreeWayMatch, createSupplierBill } from './three-way-match';
import { convertMyobSalesOrderToInvoice } from './myob';
import { sendTransactionalEmail, renderEmailShell, emailInfoTable, emailItemsTable, emailCallout, emailButton } from './email';
import { logAuditEvent } from './audit';
import { escapeHtml } from './mail-helpers';
import { carrierLabel, normalizeCarrier, trackingUrl } from './carriers';
import { tntResultUrl } from './couriers/tnt';

type Actor = { userId?: string; role?: UserRole };

export interface DispatchInput {
  trackingNumber: string;
  carrier?: string | null;
  dispatchDate?: Date;
  estimatedDelivery?: Date | null;
  actor?: Actor;
}

/** Customer-facing date, in Australian time so a UTC midnight date doesn't shift a day. */
export function auDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' });
}

/** Customer tracking link. TNT needs its per-consignment link looked up (not stored — looked up
 * each time it's needed); falls back to the search page. */
export async function resolveTrackingUrl(carrier: string | null, trackingNumber: string): Promise<string | null> {
  if (carrier === 'tnt') {
    return tntResultUrl(trackingNumber).catch((err) => {
      console.warn('[dispatch] TNT link lookup failed, using search page:', err.message);
      return trackingUrl(carrier, trackingNumber);
    });
  }
  return trackingUrl(carrier, trackingNumber);
}

function trackingHtml(carrier: string | null, trackingNumber: string, storedUrl?: string | null) {
  const url = storedUrl || trackingUrl(carrier, trackingNumber);
  return {
    url,
    html: url
      ? `<a href="${url}" style="color:#4C3AE3;font-weight:700">${escapeHtml(trackingNumber)}</a>`
      : `<strong>${escapeHtml(trackingNumber)}</strong>`,
  };
}

/**
 * BILL_CREATED → DISPATCHED: records tracking (+ estimated delivery if known), converts the
 * MYOB Sales Order to an invoice (stub while MYOB is deferred) and emails the customer their
 * tracking link, estimated delivery and tax invoice. Throws if the order isn't at BILL_CREATED.
 */
export async function dispatchOrder(storefrontOrderId: string, input: DispatchInput) {
  const trackingNumber = input.trackingNumber.trim();
  if (!trackingNumber) throw new Error('Tracking number is required');
  const carrier = normalizeCarrier(input.carrier);
  const now = new Date();
  const dispatchDate = input.dispatchDate ?? now;
  const url = await resolveTrackingUrl(carrier, trackingNumber);

  // Claim the transition atomically so the email can never go out twice
  // (e.g. invoice poller and the owner's button at the same moment).
  const claimed = await prisma.storefrontOrder.updateMany({
    // SUPPLIER_PAID: legacy orders from before the supplier-payment step was removed.
    where: { id: storefrontOrderId, status: { in: ['BILL_CREATED', 'SUPPLIER_PAID'] } },
    data: {
      status: 'DISPATCHED',
      dispatchedAt: dispatchDate,
      sektorStatus: 'DISPATCHED',
      sektorStatusUpdatedAt: now,
      sektorTrackingNumber: trackingNumber,
      trackingCarrier: carrier,
      ...(input.estimatedDelivery ? { estimatedDeliveryAt: input.estimatedDelivery } : {}),
    },
  });
  const sfOrder = await prisma.storefrontOrder.findUniqueOrThrow({ where: { id: storefrontOrderId }, include: { items: true } });
  if (claimed.count === 0) {
    throw new Error(`Order must be at Bill Created to dispatch (current: ${sfOrder.status})`);
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

  const tracking = trackingHtml(carrier, trackingNumber, url);
  const label = carrierLabel(carrier);
  const eta = sfOrder.estimatedDeliveryAt;
  const totalInc = Number(sfOrder.totalAmount);
  const totalEx = +(totalInc / 1.1).toFixed(2);
  const gst = +(totalInc - totalEx).toFixed(2);

  const html = renderEmailShell({
    eyebrow: 'Dispatch Notification',
    heading: 'Your order is on its way',
    subheading: `Hi ${escapeHtml(sfOrder.customerName)}, your order ${sfOrder.orderNumber} has been dispatched`,
    tone: 'success',
    bodyHtml: `
      ${emailCallout(`Shipped with <strong>${escapeHtml(label)}</strong><br/>Tracking number: ${tracking.html}${eta ? `<br/>Estimated delivery: <strong>${auDate(eta)}</strong>` : ''}`, 'success')}
      ${tracking.url ? emailButton('Track your delivery', tracking.url) : `<p style="font-size:13px;color:#64748b">Use the tracking number above on the ${escapeHtml(label)} website to follow your delivery.</p>`}
      ${emailInfoTable([
        { label: 'Order #', value: sfOrder.orderNumber, accent: true },
        { label: 'Invoice #', value: myobInvoiceNumber || 'Pending' },
        { label: 'Dispatched', value: auDate(dispatchDate) },
        ...(eta ? [{ label: 'Estimated delivery', value: auDate(eta) }] : []),
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
    payloadJson: { orderNumber: sfOrder.orderNumber, trackingNumber, carrier, estimatedDelivery: eta?.toISOString() ?? null, emailSent: email.success, myobInvoiceNumber },
  }).catch(() => {});

  return { trackingNumber, carrier, trackingUrl: tracking.url, myobInvoiceNumber, emailSent: email.success };
}

/**
 * DISPATCHED → FULFILLED: the customer has the goods. Starts the warranty clock from the
 * delivery date and emails a delivery confirmation. Throws if the order isn't DISPATCHED.
 */
export async function markDelivered(storefrontOrderId: string, opts: { deliveredAt?: Date; source: 'courier' | 'owner'; actor?: Actor }) {
  const now = new Date();
  const deliveredAt = opts.deliveredAt ?? now;

  const claimed = await prisma.storefrontOrder.updateMany({
    where: { id: storefrontOrderId, status: 'DISPATCHED' },
    data: { status: 'FULFILLED', fulfilledAt: deliveredAt, sektorStatus: 'DELIVERED', sektorStatusUpdatedAt: now },
  });
  const sfOrder = await prisma.storefrontOrder.findUniqueOrThrow({ where: { id: storefrontOrderId } });
  if (claimed.count === 0) {
    throw new Error(`Order must be Dispatched to mark it delivered (current: ${sfOrder.status})`);
  }

  // Warranty clock starts on delivery.
  if (sfOrder.salesOrderId) {
    const records = await prisma.warrantyRecord.findMany({
      where: { salesOrderId: sfOrder.salesOrderId, status: { not: 'CLOSED' }, warrantyStartRule: 'DELIVERY_DATE' },
    });
    for (const wr of records) {
      const expiry = new Date(deliveredAt);
      expiry.setMonth(expiry.getMonth() + wr.warrantyPeriodMonths);
      const remainingDays = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
      await prisma.warrantyRecord.update({
        where: { id: wr.id },
        data: {
          deliveryDate: deliveredAt,
          warrantyStartDate: deliveredAt,
          warrantyExpiryDate: expiry,
          remainingDays,
          status: (remainingDays <= 30 ? 'EXPIRING_SOON' : remainingDays <= 180 ? 'FINAL_SIX_MONTHS' : 'ACTIVE') as any,
        },
      });
    }
  }

  const html = renderEmailShell({
    eyebrow: 'Delivery Confirmation',
    heading: 'Your order has been delivered',
    subheading: `Hi ${escapeHtml(sfOrder.customerName)}, order ${sfOrder.orderNumber} was delivered on ${auDate(deliveredAt)}`,
    tone: 'success',
    bodyHtml: `
      ${emailInfoTable([
        { label: 'Order #', value: sfOrder.orderNumber, accent: true },
        { label: 'Delivered', value: auDate(deliveredAt) },
        ...(sfOrder.sektorTrackingNumber ? [{ label: 'Tracking', value: trackingHtml(sfOrder.trackingCarrier, sfOrder.sektorTrackingNumber, await resolveTrackingUrl(sfOrder.trackingCarrier, sfOrder.sektorTrackingNumber)).html }] : []),
      ])}
      <p style="margin:0;font-size:13px;color:#64748b">If anything is missing or damaged, just reply to this email. Your warranty starts from the delivery date.</p>`,
  });
  const email = await sendTransactionalEmail({
    to: sfOrder.customerEmail,
    subject: `Delivered — ${sfOrder.orderNumber}`,
    html,
    orderId: sfOrder.id,
  }).catch((err) => {
    console.warn('[delivered] Delivery email failed:', err);
    return { success: false };
  });

  await logAuditEvent({
    userId: opts.actor?.userId,
    role: opts.actor?.role,
    action: 'STOREFRONT_ORDER_DELIVERED',
    module: 'GOVERNANCE',
    targetId: storefrontOrderId,
    payloadJson: { orderNumber: sfOrder.orderNumber, deliveredAt: deliveredAt.toISOString(), source: opts.source, emailSent: email.success },
  }).catch(() => {});

  return { deliveredAt, emailSent: email.success };
}

export type ShipmentStatus = 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'unknown';
export interface TrackingUpdate { status: ShipmentStatus; deliveredAt?: Date; estimatedDelivery?: Date }

/**
 * One courier status reading for a DISPATCHED order: records the status, stores a new
 * estimated delivery date (emailing the customer the first time one becomes known),
 * and marks the order delivered when the courier says so.
 */
export async function applyTrackingUpdate(storefrontOrderId: string, update: TrackingUpdate) {
  const o = await prisma.storefrontOrder.findUniqueOrThrow({ where: { id: storefrontOrderId } });
  if (o.status !== 'DISPATCHED') return { changed: false };

  if (update.status === 'delivered') {
    await markDelivered(storefrontOrderId, { deliveredAt: update.deliveredAt, source: 'courier' });
    return { changed: true, delivered: true };
  }

  const etaChanged = !!update.estimatedDelivery && update.estimatedDelivery.getTime() !== o.estimatedDeliveryAt?.getTime();
  await prisma.storefrontOrder.update({
    where: { id: storefrontOrderId },
    data: {
      sektorStatus: update.status.toUpperCase(),
      sektorStatusUpdatedAt: new Date(),
      ...(etaChanged ? { estimatedDeliveryAt: update.estimatedDelivery } : {}),
    },
  });

  // First estimate after dispatch (the invoice had none) → tell the customer once.
  if (etaChanged && !o.estimatedDeliveryAt && o.sektorTrackingNumber) {
    const tracking = trackingHtml(o.trackingCarrier, o.sektorTrackingNumber, await resolveTrackingUrl(o.trackingCarrier, o.sektorTrackingNumber));
    await sendTransactionalEmail({
      to: o.customerEmail,
      subject: `Estimated delivery ${auDate(update.estimatedDelivery!)} — ${o.orderNumber}`,
      orderId: o.id,
      html: renderEmailShell({
        eyebrow: 'Delivery Update',
        heading: `Arriving ${auDate(update.estimatedDelivery!)}`,
        subheading: `Hi ${escapeHtml(o.customerName)}, here's the estimated delivery date for order ${o.orderNumber}`,
        bodyHtml: `
          ${emailCallout(`Estimated delivery: <strong>${auDate(update.estimatedDelivery!)}</strong><br/>${escapeHtml(carrierLabel(o.trackingCarrier))} tracking: ${tracking.html}`)}
          ${tracking.url ? emailButton('Track your delivery', tracking.url) : ''}`,
      }),
    }).catch((err) => console.warn('[tracking] ETA email failed:', err));
  }
  return { changed: true, delivered: false };
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
