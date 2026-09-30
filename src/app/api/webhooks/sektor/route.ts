// Phase 8 — Sektor tracking webhook relay.
// Sektor posts tracking events here; we update the relevant StorefrontOrder/DispatchNote
// and forward relevant events to the customer by email.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTransactionalEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/audit';
import crypto from 'crypto';

interface SektorEvent {
  eventType: string;           // e.g. 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION'
  trackingNumber: string;
  orderReference?: string;     // our PO or SFO number
  status?: string;
  location?: string;
  estimatedDelivery?: string;  // ISO date string
  notes?: string;
  timestamp: string;           // ISO timestamp
}

function verifySignature(rawBody: Buffer, sig: string | null, secret: string): boolean {
  if (!sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export async function POST(req: Request) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const sektorSecret = process.env.SEKTOR_WEBHOOK_SECRET;

  if (sektorSecret) {
    const sig = req.headers.get('x-sektor-signature');
    if (!verifySignature(rawBody, sig, sektorSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let event: SektorEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { eventType, trackingNumber, orderReference, status, location, estimatedDelivery, notes, timestamp } = event;

  // Try to find a matching StorefrontOrder by PO number or order number
  const sfOrder = orderReference
    ? await prisma.storefrontOrder.findFirst({
        where: {
          OR: [
            { myobPoNumber: orderReference },
            { orderNumber: orderReference },
          ],
        },
      })
    : null;

  // Try to find a matching DispatchNote by tracking number
  const dispatchNote = await prisma.dispatchNote.findFirst({
    where: { trackingNumber },
  }).catch(() => null);

  // Advance StorefrontOrder status on DELIVERED event
  if (sfOrder && eventType === 'DELIVERED') {
    await prisma.storefrontOrder.update({
      where: { id: sfOrder.id },
      data: { status: 'FULFILLED' },
    });
  }

  // Notify customer on key events
  const NOTIFY_EVENTS = ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION'];
  if (sfOrder && NOTIFY_EVENTS.includes(eventType)) {
    const eventLabel: Record<string, string> = {
      DISPATCHED: 'Your order has been dispatched',
      IN_TRANSIT: 'Your order is in transit',
      OUT_FOR_DELIVERY: 'Your order is out for delivery today',
      DELIVERED: 'Your order has been delivered',
      EXCEPTION: 'A delivery exception has occurred',
    };
    const subject = `${eventLabel[eventType] || eventType} — Order ${sfOrder.orderNumber}`;
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0f172a">${eventLabel[eventType] || eventType}</h2>
        <p>Hi ${sfOrder.customerName},</p>
        <p>Here is an update on your order <strong>${sfOrder.orderNumber}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:12px 0">
          <tr><td style="padding:6px;color:#64748b">Tracking #</td><td style="padding:6px"><strong>${trackingNumber}</strong></td></tr>
          ${status ? `<tr><td style="padding:6px;color:#64748b">Status</td><td style="padding:6px">${status}</td></tr>` : ''}
          ${location ? `<tr><td style="padding:6px;color:#64748b">Location</td><td style="padding:6px">${location}</td></tr>` : ''}
          ${estimatedDelivery ? `<tr><td style="padding:6px;color:#64748b">Est. Delivery</td><td style="padding:6px">${estimatedDelivery}</td></tr>` : ''}
          ${notes ? `<tr><td style="padding:6px;color:#64748b">Notes</td><td style="padding:6px">${notes}</td></tr>` : ''}
        </table>
        <p style="color:#64748b;font-size:12px">LogiQ-On Tech — Logistics</p>
      </div>`;

    await sendTransactionalEmail({ to: sfOrder.customerEmail, subject, html }).catch(() => {});
  }

  await logAuditEvent({
    action: 'SEKTOR_TRACKING_EVENT',
    module: 'GOVERNANCE',
    targetId: sfOrder?.id || trackingNumber,
    payloadJson: { eventType, trackingNumber, orderReference, status, location, timestamp },
  }).catch(() => {});

  return NextResponse.json({ received: true });
}
