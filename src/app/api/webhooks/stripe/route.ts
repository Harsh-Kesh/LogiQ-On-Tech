import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Stripe requires the raw request body for signature verification.
// Disabling Next.js body parsing lets us read it as an ArrayBuffer.
export const config = { api: { bodyParser: false } };
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { nextDocumentNumber } from '@/lib/document-sequences';
import { createSalesOrder } from '@/lib/sales-orders';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/audit';

// Stripe requires the raw body for signature verification — Next.js App Router
// provides it via req.arrayBuffer() as long as we do NOT call req.json() first.
export async function POST(req: Request) {
  const rawBody = await req.arrayBuffer();
  const rawBodyBuffer = Buffer.from(rawBody);
  const sig = headers().get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing stripe signature or webhook secret.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBodyBuffer, sig, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    // ACK all other events — we don't process them yet
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;

  // Idempotency guard — if we already processed this session, skip
  const existing = await prisma.storefrontOrder.findUnique({ where: { stripeSessionId: sessionId } });
  if (existing) {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  // Pull metadata we packed into the session at creation time
  const meta = session.metadata || {};
  const customerName = meta.customerName || 'Online Customer';
  const customerEmail = session.customer_email || meta.customerEmail || '';
  const customerPhone = meta.customerPhone || '';
  const deliveryAddress = meta.deliveryAddress || '';

  let resolvedLines: { sku: string; itemName: string; qty: number; unitPrice: number; taxPercent: number }[] = [];
  try {
    resolvedLines = JSON.parse(meta.linesJson || '[]');
  } catch {
    console.error('Stripe webhook: failed to parse linesJson metadata for session', sessionId);
    return NextResponse.json({ error: 'Invalid line metadata.' }, { status: 400 });
  }

  const subtotal = resolvedLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const taxTotal = resolvedLines.reduce((s, l) => s + l.qty * l.unitPrice * (l.taxPercent / 100), 0);
  const totalAmount = subtotal + taxTotal;

  // Generate the StorefrontOrder number atomically
  const orderNumber = await nextDocumentNumber('SFO');

  // Create StorefrontOrder + its items in a transaction
  const storefrontOrder = await prisma.$transaction(async (tx) => {
    const sfOrder = await tx.storefrontOrder.create({
      data: {
        orderNumber,
        customerName,
        customerEmail,
        deliveryAddress,
        currency: 'AUD',
        subtotal,
        taxTotal,
        totalAmount,
        status: 'PAID',
        stripeSessionId: sessionId,
        stripePaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id ?? null,
        paidAt: new Date(),
        items: {
          create: resolvedLines.map((l) => ({
            itemCode: l.sku,
            itemName: l.itemName,
            quantity: l.qty,
            unitPrice: l.unitPrice,
            taxPercent: l.taxPercent,
            lineTotal: Math.round(l.qty * l.unitPrice * (1 + l.taxPercent / 100) * 10000) / 10000,
          })),
        },
      },
    });
    return sfOrder;
  });

  // Create a linked SalesOrder (standard fulfilment pipeline entry)
  let salesOrder: Awaited<ReturnType<typeof createSalesOrder>> | null = null;
  try {
    const soLines = resolvedLines.map((l, i) => ({
      id: `sol_sfo_${storefrontOrder.id}_${i}`,
      itemCode: l.sku,
      itemName: l.itemName,
      quantity: l.qty,
      sellingPrice: l.unitPrice,
      taxPercent: l.taxPercent,
      lineTotal: Math.round(l.qty * l.unitPrice * (1 + l.taxPercent / 100) * 100) / 100,
    }));

    salesOrder = await createSalesOrder({
      customerName,
      customerEmail,
      customerPhone: customerPhone || undefined,
      deliveryLocation: deliveryAddress,
      paymentTerms: 'Prepaid',
      currency: 'AUD',
      lines: soLines,
      subtotal,
      taxTotal,
      totalValue: totalAmount,
      source: 'ONLINE_STORE',
      createdBy: customerEmail,
      status: 'DRAFT',
    });

    // Link the SO back to the StorefrontOrder and advance status
    await prisma.storefrontOrder.update({
      where: { id: storefrontOrder.id },
      data: {
        salesOrderId: salesOrder.id,
        status: 'SO_CREATED',
      },
    });
  } catch (err) {
    console.error('Stripe webhook: SalesOrder creation failed for storefront order', storefrontOrder.id, err);
    // StorefrontOrder is still created and paid — don't fail the webhook response.
    // An admin can manually link / re-trigger the SO creation.
  }

  // Send order confirmation email
  if (salesOrder) {
    await sendOrderConfirmationEmail(
      customerEmail,
      customerName,
      salesOrder.salesOrderNumber,
      salesOrder.lines,
      salesOrder.totalValue,
      salesOrder.currency
    ).catch((err) => console.warn('Stripe webhook: confirmation email failed:', err));
  }

  await logAuditEvent({
    action: 'STOREFRONT_ORDER_PAID',
    module: 'GOVERNANCE',
    targetId: storefrontOrder.id,
    payloadJson: {
      orderNumber,
      customerEmail,
      totalAmount,
      stripeSessionId: sessionId,
      salesOrderNumber: salesOrder?.salesOrderNumber,
    },
  }).catch(() => {});

  return NextResponse.json({ received: true, orderNumber });
}
