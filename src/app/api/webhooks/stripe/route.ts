import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { nextDocumentNumber } from '@/lib/document-sequences';
import { createSalesOrder } from '@/lib/sales-orders';
import { sendOrderConfirmationEmail, sendTransactionalEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/audit';
import { createMyobPurchaseOrder } from '@/lib/myob';

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

  // Phase 3 — Create MYOB Purchase Order + email PO to supplier
  if (salesOrder) {
    try {
      // Find the vendor for this order (all items assumed same vendor via ItemMaster)
      const firstSku = resolvedLines[0]?.sku;
      const itemMaster = firstSku
        ? await prisma.itemMaster.findFirst({
            where: { sku: firstSku },
            include: { vendor: true },
          })
        : null;

      const vendor = itemMaster?.vendor;
      const poNumber = await nextDocumentNumber('PO');

      if (vendor?.myobContactId) {
        const myobResult = await createMyobPurchaseOrder({
          supplierContactId: vendor.myobContactId,
          poNumber,
          deliveryAddress,
          currency: 'AUD',
          lines: resolvedLines.map((l) => ({
            itemCode: l.sku,
            description: l.itemName,
            quantity: l.qty,
            unitPrice: l.unitPrice,
            taxCode: 'GST',
          })),
          memo: `Storefront order ${orderNumber} — ${customerName}`,
        });

        await prisma.storefrontOrder.update({
          where: { id: storefrontOrder.id },
          data: {
            myobPoGuid: myobResult.guid,
            myobPoNumber: myobResult.poNumber,
            status: 'PO_SENT',
            poEmailSentTo: vendor.poEmail || undefined,
            poEmailSentAt: new Date(),
          },
        });
      } else {
        // MYOB contact not configured — still create internal PO record and email supplier
        await prisma.storefrontOrder.update({
          where: { id: storefrontOrder.id },
          data: {
            myobPoNumber: poNumber,
            status: 'PO_SENT',
            poEmailSentTo: vendor?.poEmail || undefined,
            poEmailSentAt: new Date(),
          },
        });
      }

      // Email PO to supplier
      const supplierEmail = vendor?.poEmail || itemMaster?.supplierEmail;
      if (supplierEmail) {
        const poLines = resolvedLines.map((l) =>
          `<tr><td style="padding:4px 8px;border:1px solid #e2e8f0">${l.sku}</td><td style="padding:4px 8px;border:1px solid #e2e8f0">${l.itemName}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center">${l.qty}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:right">AUD ${l.unitPrice.toFixed(2)}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:right">AUD ${(l.qty * l.unitPrice).toFixed(2)}</td></tr>`
        ).join('');
        await sendTransactionalEmail({
          to: supplierEmail,
          subject: `Purchase Order ${poNumber} — LogiQ-On Tech`,
          html: `
            <div style="font-family:sans-serif;max-width:680px;margin:0 auto">
              <h2 style="color:#0f172a">Purchase Order — ${poNumber}</h2>
              <p>Dear ${vendor?.companyName || 'Supplier'},</p>
              <p>Please find below a Purchase Order from <strong>LogiQ-On Tech</strong>.</p>
              <p><strong>Deliver to:</strong> ${deliveryAddress}</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <thead><tr style="background:#f1f5f9">
                  <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left">SKU</th>
                  <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left">Description</th>
                  <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center">Qty</th>
                  <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">Unit Price</th>
                  <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">Line Total</th>
                </tr></thead>
                <tbody>${poLines}</tbody>
              </table>
              <p><strong>Total (ex GST):</strong> AUD ${subtotal.toFixed(2)}<br/>
              <strong>GST:</strong> AUD ${taxTotal.toFixed(2)}<br/>
              <strong>Total (inc GST):</strong> AUD ${totalAmount.toFixed(2)}</p>
              <p>Please send your invoice to <a href="mailto:${process.env.IMAP_USER || 'accounts@logiqon.com'}">${process.env.IMAP_USER || 'accounts@logiqon.com'}</a> quoting PO number <strong>${poNumber}</strong>.</p>
              <p>Thank you,<br/>LogiQ-On Tech Procurement Team</p>
            </div>`,
        }).catch((err) => console.warn('PO email failed:', err));
      }
    } catch (err) {
      console.error('Phase 3: MYOB PO creation failed for storefront order', storefrontOrder.id, err);
      // Non-fatal — order is still paid, admin can retry from pipeline view
    }
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
