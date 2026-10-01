// Demo-only: simulates Sektor confirming delivery (normally comes via webhook).
// Advances SUPPLIER_PAID → FULFILLED and sends a customer notification email.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTransactionalEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/audit';

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
  });

  if (sfOrder.status !== 'SUPPLIER_PAID') {
    return NextResponse.json(
      { error: `Order must be SUPPLIER_PAID to simulate delivery (current: ${sfOrder.status})` },
      { status: 422 }
    );
  }

  const trackingNumber = `DEMO-TRACK-${Date.now()}`;

  await prisma.storefrontOrder.update({
    where: { id: storefrontOrderId },
    data: { status: 'FULFILLED' },
  });

  // Notify customer
  await sendTransactionalEmail({
    to: sfOrder.customerEmail,
    subject: `Your order ${sfOrder.orderNumber} has been delivered`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0f172a">Order Delivered ✓</h2>
        <p>Hi ${sfOrder.customerName},</p>
        <p>Great news — your order <strong>${sfOrder.orderNumber}</strong> has been delivered.</p>
        <p><strong>Tracking reference:</strong> ${trackingNumber}</p>
        <p>If you have any questions, please contact us.</p>
        <p>Thank you for your business,<br/>LogiQ-On Tech</p>
      </div>`,
  }).catch((err) => console.warn('Delivery notification email failed:', err));

  await logAuditEvent({
    action: 'STOREFRONT_ORDER_FULFILLED',
    module: 'GOVERNANCE',
    targetId: storefrontOrderId,
    payloadJson: { orderNumber: sfOrder.orderNumber, trackingNumber, demo: true },
  }).catch(() => {});

  return NextResponse.json({ success: true, trackingNumber, status: 'FULFILLED' });
}
