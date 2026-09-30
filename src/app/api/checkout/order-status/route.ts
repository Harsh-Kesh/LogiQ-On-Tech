import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Polled by the confirmation page after Stripe redirects back.
// Returns order details once the webhook has created the StorefrontOrder.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required.' }, { status: 400 });
  }

  const order = await prisma.storefrontOrder.findUnique({
    where: { stripeSessionId: sessionId },
    select: {
      orderNumber: true,
      status: true,
      customerName: true,
      totalAmount: true,
      currency: true,
    },
  });

  if (!order) {
    // Webhook not yet processed — tell the client to retry
    return NextResponse.json({ pending: true }, { status: 202 });
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    totalAmount: Number(order.totalAmount),
    currency: order.currency,
  });
}
