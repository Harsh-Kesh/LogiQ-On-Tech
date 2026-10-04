import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { nextDocumentNumber } from '@/lib/document-sequences';
import { createSalesOrder } from '@/lib/sales-orders';
import { sendOrderConfirmationEmail, sendTransactionalEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/audit';
import { createMyobPurchaseOrder, createMyobSalesOrder, createMyobSupplierCard } from '@/lib/myob';

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
    return NextResponse.json({ received: true });
  }

  try {
    return await handleCheckoutCompleted(event);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] Unhandled error:', message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleCheckoutCompleted(event: Stripe.Event) {
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

  // Create MYOB Sales Order (goods paid but not yet shipped — SO stays open until delivery)
  let myobSoNumber: string | null = null;
  if (salesOrder) {
    try {
      const soResult = await createMyobSalesOrder({
        customerContactId: 'DEMO-CUSTOMER',
        soNumber: salesOrder.salesOrderNumber,
        orderDate: new Date().toISOString().split('T')[0],
        deliveryAddress,
        lines: resolvedLines.map((l) => ({
          itemCode: l.sku,
          description: l.itemName,
          quantity: l.qty,
          unitPrice: l.unitPrice,
          taxCode: 'GST',
        })),
        memo: `Sales Order ${orderNumber} — ${customerName} — prepaid online`,
      });
      myobSoNumber = soResult.soNumber;
      await prisma.storefrontOrder.update({
        where: { id: storefrontOrder.id },
        data: { myobSoGuid: soResult.guid, myobSoNumber: soResult.soNumber },
      }).catch(() => {});
    } catch (err) {
      console.warn('MYOB Sales Order creation failed (non-fatal):', err);
    }
  }

  // Send order confirmation email with MYOB SO number
  if (salesOrder) {
    const itemRows = resolvedLines.map((l) =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${l.itemName}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${l.qty}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">AUD ${(l.qty * l.unitPrice * 1.1).toFixed(2)}</td>
      </tr>`
    ).join('');

    await sendTransactionalEmail({
      to: customerEmail,
      orderId: storefrontOrder.id,
      subject: `Order Confirmed — ${orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
          <div style="background:#0f172a;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#ffffff;margin:0;font-size:20px">Order Confirmed</h1>
          </div>
          <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 16px">Hi <strong>${customerName}</strong>,</p>
            <p style="margin:0 0 24px">Thank you for your order. We've received your payment and your order is now being processed.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr style="background:#f8fafc">
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase">Order #</td>
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase">Sales Order #</td>
                <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase">Deliver To</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;font-weight:700">${orderNumber}</td>
                <td style="padding:8px 12px;font-weight:700;color:#4f46e5">${myobSoNumber || salesOrder.salesOrderNumber}</td>
                <td style="padding:8px 12px;font-size:13px">${deliveryAddress}</td>
              </tr>
            </table>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <thead>
                <tr style="background:#f8fafc">
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b">Item</th>
                  <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b">Qty</th>
                  <th style="padding:8px 12px;text-align:right;font-size:12px;color:#64748b">Total (inc GST)</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
              <tfoot>
                <tr style="background:#f8fafc">
                  <td colspan="2" style="padding:8px 12px;font-weight:700;text-align:right">Total Paid</td>
                  <td style="padding:8px 12px;font-weight:700;text-align:right">AUD ${totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#475569">We will email you as your order progresses. You can expect:</p>
            <ol style="font-size:13px;color:#475569;margin:0 0 24px;padding-left:20px">
              <li>Order confirmed ✓ <em>(this email)</em></li>
              <li>Order dispatched by supplier — with tracking details</li>
              <li>Out for delivery notification</li>
              <li>Delivery confirmed + tax invoice</li>
            </ol>
            <p style="margin:0;font-size:13px;color:#64748b">If you have any questions please reply to this email.<br/>Thank you,<br/><strong>LogiQ-On Tech</strong></p>
          </div>
        </div>`,
    }).catch((err) => console.warn('Stripe webhook: confirmation email failed:', err));
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

      // Look up all item masters for this order so we can include supplier codes AND
      // supplier cost prices on the PO — a purchase order states what WE pay THEM,
      // never the customer's selling price.
      const allSkus = resolvedLines.map((l) => l.sku);
      const allItemMasters = await prisma.itemMaster.findMany({ where: { sku: { in: allSkus } } });
      const supplierCodeBySku = new Map(allItemMasters.map((im) => [im.sku, im.supplierItemCode]));
      const costPriceBySku = new Map(allItemMasters.map((im) => [im.sku, Number(im.costPrice)]));
      const costOf = (sku: string, fallback: number) => costPriceBySku.get(sku) ?? fallback;

      const poSubtotal = resolvedLines.reduce((s, l) => s + l.qty * costOf(l.sku, l.unitPrice), 0);
      const poTaxTotal = resolvedLines.reduce((s, l) => s + l.qty * costOf(l.sku, l.unitPrice) * (l.taxPercent / 100), 0);
      const poTotal = poSubtotal + poTaxTotal;

      // Resolve (or lazily create) this supplier's MYOB contact card. This card lives in
      // LogiQ-On's own MYOB company file purely so the PO is recorded against a named
      // supplier in our books — it is not a connection to the supplier's own MYOB account.
      let supplierMyobId = vendor?.myobContactId || null;
      if (!supplierMyobId && vendor) {
        try {
          const card = await createMyobSupplierCard({ companyName: vendor.companyName, email: vendor.poEmail || undefined });
          supplierMyobId = card.guid;
          await prisma.vendor.update({ where: { id: vendor.id }, data: { myobContactId: card.guid } });
        } catch (err) {
          console.warn('MYOB supplier card auto-create failed (non-fatal):', err);
        }
      }

      if (supplierMyobId) {
        const myobResult = await createMyobPurchaseOrder({
          supplierContactId: supplierMyobId,
          poNumber,
          deliveryAddress,
          currency: 'AUD',
          lines: resolvedLines.map((l) => ({
            itemCode: l.sku,
            description: l.itemName,
            quantity: l.qty,
            unitPrice: costOf(l.sku, l.unitPrice),
            taxCode: 'GST',
          })),
          memo: `PO for SO ${myobSoNumber || salesOrder.salesOrderNumber} — ${orderNumber} — ${customerName}`,
        });

        await prisma.storefrontOrder.update({
          where: { id: storefrontOrder.id },
          data: {
            myobPoGuid: myobResult.guid,
            myobPoNumber: myobResult.poNumber,
            status: 'PO_SENT',
            poEmailSentTo: vendor?.poEmail || undefined,
            poEmailSentAt: new Date(),
          },
        });
      } else {
        // No vendor linked to this item, or card creation failed — still record an
        // internal PO number so the order can proceed through the pipeline.
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
      if (!supplierEmail) {
        console.warn(`[stripe-webhook] No supplier email for PO ${poNumber} (order ${orderNumber}). Set vendor.poEmail or itemMaster.supplierEmail to enable PO emails.`);
      } else {
        const poLines = resolvedLines.map((l) => {
          const supplierCode = supplierCodeBySku.get(l.sku);
          const unitCost = costOf(l.sku, l.unitPrice);
          const supplierCodeCell = supplierCode
            ? `<strong>${supplierCode}</strong><br/><span style="font-size:11px;color:#94a3b8">Our ref: ${l.sku}</span>`
            : `<span style="color:#f59e0b;font-style:italic">Not configured</span><br/><span style="font-size:11px;color:#94a3b8">Our ref: ${l.sku}</span>`;
          return `<tr>
            <td style="padding:4px 8px;border:1px solid #e2e8f0">${supplierCodeCell}</td>
            <td style="padding:4px 8px;border:1px solid #e2e8f0">${l.itemName}</td>
            <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center">${l.qty}</td>
            <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:right">AUD ${unitCost.toFixed(2)}</td>
            <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:right">AUD ${(l.qty * unitCost).toFixed(2)}</td>
          </tr>`;
        }).join('');
        await sendTransactionalEmail({
          to: supplierEmail,
          orderId: storefrontOrder.id,
          subject: `Purchase Order ${poNumber} — LogiQ-On Tech`,
          html: `
            <div style="font-family:sans-serif;max-width:680px;margin:0 auto">
              <h2 style="color:#0f172a">Purchase Order — ${poNumber}</h2>
              <p>Dear ${vendor?.companyName || 'Supplier'},</p>
              <p>Please find below a Purchase Order from <strong>LogiQ-On Tech</strong>.</p>
              <p><strong>Deliver to:</strong> ${deliveryAddress}</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <thead><tr style="background:#f1f5f9">
                  <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left">Supplier Code</th>
                  <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left">Description</th>
                  <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center">Qty</th>
                  <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">Unit Cost</th>
                  <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">Line Total</th>
                </tr></thead>
                <tbody>${poLines}</tbody>
              </table>
              <p><strong>Total (ex GST):</strong> AUD ${poSubtotal.toFixed(2)}<br/>
              <strong>GST:</strong> AUD ${poTaxTotal.toFixed(2)}<br/>
              <strong>Total (inc GST):</strong> AUD ${poTotal.toFixed(2)}</p>
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
