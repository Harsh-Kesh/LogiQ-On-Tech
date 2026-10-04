// Demo-only: create a StorefrontOrder without Stripe, replicating the full
// post-payment pipeline (SO creation, MYOB SO, MYOB PO, PO email).
// This lets the admin demo the entire flow without real Stripe credentials.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nextDocumentNumber } from '@/lib/document-sequences';
import { createSalesOrder } from '@/lib/sales-orders';
import { createMyobPurchaseOrder, createMyobSalesOrder, createMyobSupplierCard } from '@/lib/myob';
import { sendTransactionalEmail } from '@/lib/email';

interface OrderItem { sku: string; quantity: number }

// GET: return available publishable products for the place-order modal
export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const items = await prisma.itemMaster.findMany({
    where: { publishToStore: true, status: 'ACTIVE' },
    select: { sku: true, itemName: true, sellingPrice: true, storeDescription: true, taxPercent: true },
    orderBy: { sku: 'asc' },
    take: 20,
  });

  return NextResponse.json(items);
}

// POST: create a demo order and advance it to PO_SENT
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { customerName, customerEmail, deliveryAddress, items } = body as {
    customerName: string;
    customerEmail: string;
    deliveryAddress: string;
    items: OrderItem[];
  };

  if (!customerName?.trim() || !customerEmail?.trim() || !deliveryAddress?.trim() || !items?.length) {
    return NextResponse.json({ error: 'customerName, customerEmail, deliveryAddress, and items are required' }, { status: 400 });
  }

  // Resolve items against ItemMaster
  const skus = items.map((i) => i.sku);
  const masters = await prisma.itemMaster.findMany({ where: { sku: { in: skus } } });
  const masterBySku = new Map(masters.map((m) => [m.sku, m]));

  const resolvedLines = items.flatMap((i) => {
    const m = masterBySku.get(i.sku);
    if (!m || !m.sellingPrice) return [];
    const qty = Math.max(1, Math.floor(i.quantity));
    const unitPrice = Number(m.sellingPrice);
    const taxPercent = Number(m.taxPercent ?? 10);
    return [{ sku: m.sku, itemName: m.itemName, qty, unitPrice, taxPercent }];
  });

  if (!resolvedLines.length) {
    return NextResponse.json({ error: 'No valid items found — run Setup Demo Data first' }, { status: 422 });
  }

  const subtotal = resolvedLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const taxTotal = resolvedLines.reduce((s, l) => s + l.qty * l.unitPrice * (l.taxPercent / 100), 0);
  const totalAmount = subtotal + taxTotal;

  const orderNumber = await nextDocumentNumber('SFO');

  // Create StorefrontOrder (simulate Stripe having paid)
  const storefrontOrder = await prisma.storefrontOrder.create({
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

  // Create internal SalesOrder
  let salesOrder: Awaited<ReturnType<typeof createSalesOrder>> | null = null;
  try {
    salesOrder = await createSalesOrder({
      customerName,
      customerEmail,
      deliveryLocation: deliveryAddress,
      paymentTerms: 'Prepaid',
      currency: 'AUD',
      lines: resolvedLines.map((l, i) => ({
        id: `sol_demo_${storefrontOrder.id}_${i}`,
        itemCode: l.sku,
        itemName: l.itemName,
        quantity: l.qty,
        sellingPrice: l.unitPrice,
        taxPercent: l.taxPercent,
        lineTotal: Math.round(l.qty * l.unitPrice * (1 + l.taxPercent / 100) * 100) / 100,
      })),
      subtotal,
      taxTotal,
      totalValue: totalAmount,
      source: 'ONLINE_STORE',
      createdBy: 'demo-admin',
      status: 'DRAFT',
    });

    await prisma.storefrontOrder.update({
      where: { id: storefrontOrder.id },
      data: { salesOrderId: salesOrder.id, status: 'SO_CREATED' },
    });
  } catch (err) {
    console.error('[demo/place-order] SalesOrder creation failed:', err);
  }

  // MYOB Sales Order (stubbed in demo)
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
        memo: `Demo Sales Order ${orderNumber} — ${customerName}`,
      });
      myobSoNumber = soResult.soNumber;
      await prisma.storefrontOrder.update({
        where: { id: storefrontOrder.id },
        data: { myobSoGuid: soResult.guid, myobSoNumber: soResult.soNumber },
      });
    } catch (err) {
      console.warn('[demo/place-order] MYOB SO failed (non-fatal):', err);
    }
  }

  // MYOB Purchase Order + email supplier
  if (salesOrder) {
    try {
      const firstSku = resolvedLines[0]?.sku;
      const itemMaster = firstSku
        ? await prisma.itemMaster.findFirst({ where: { sku: firstSku }, include: { vendor: true } })
        : null;
      const vendor = itemMaster?.vendor;
      const poNumber = await nextDocumentNumber('PO');

      // Price the PO at supplier COST, never the customer-facing selling price.
      const allSkus = resolvedLines.map((l) => l.sku);
      const allMasters = await prisma.itemMaster.findMany({ where: { sku: { in: allSkus } } });
      const supplierCodeBySku = new Map(allMasters.map((m) => [m.sku, m.supplierItemCode]));
      const costPriceBySku = new Map(allMasters.map((m) => [m.sku, Number(m.costPrice)]));
      const costOf = (sku: string, fallback: number) => costPriceBySku.get(sku) ?? fallback;

      const poSubtotal = resolvedLines.reduce((s, l) => s + l.qty * costOf(l.sku, l.unitPrice), 0);
      const poTaxTotal = resolvedLines.reduce((s, l) => s + l.qty * costOf(l.sku, l.unitPrice) * (l.taxPercent / 100), 0);
      const poTotal = poSubtotal + poTaxTotal;

      // Resolve (or lazily create) this supplier's MYOB contact card — a record in our own
      // MYOB company file, not a connection to the supplier's own MYOB account.
      let supplierMyobId = vendor?.myobContactId || null;
      if (!supplierMyobId && vendor) {
        try {
          const card = await createMyobSupplierCard({ companyName: vendor.companyName, email: vendor.poEmail || undefined });
          supplierMyobId = card.guid;
          await prisma.vendor.update({ where: { id: vendor.id }, data: { myobContactId: card.guid } });
        } catch (err) {
          console.warn('[demo/place-order] MYOB supplier card auto-create failed (non-fatal):', err);
        }
      }

      const myobResult = await createMyobPurchaseOrder({
        supplierContactId: supplierMyobId || 'DEMO-MYOB-VENDOR',
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
        memo: `Demo PO for ${orderNumber} — ${customerName}`,
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

      // Send order confirmation email to customer
      const itemRows = resolvedLines.map((l) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${l.itemName}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${l.qty}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">AUD ${(l.qty * l.unitPrice * 1.1).toFixed(2)}</td>
        </tr>`
      ).join('');

      await sendTransactionalEmail({
        to: customerEmail,
        subject: `Order Confirmed — ${orderNumber}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
          <div style="background:#0f172a;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">Order Confirmed</h1>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
            <p>Hi <strong>${customerName}</strong>, thank you for your order.</p>
            <table style="width:100%;margin-bottom:16px"><tr style="background:#f8fafc">
              <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b">Order #</td>
              <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b">Sales Order</td>
              <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b">Deliver To</td>
            </tr><tr>
              <td style="padding:8px 12px;font-weight:700">${orderNumber}</td>
              <td style="padding:8px 12px;color:#4f46e5">${myobSoNumber || salesOrder.salesOrderNumber}</td>
              <td style="padding:8px 12px;font-size:13px">${deliveryAddress}</td>
            </tr></table>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <thead><tr style="background:#f8fafc"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b">Item</th><th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b">Qty</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#64748b">Total (inc GST)</th></tr></thead>
              <tbody>${itemRows}</tbody>
              <tfoot><tr style="background:#f8fafc"><td colspan="2" style="padding:8px 12px;font-weight:700;text-align:right">Total Paid</td><td style="padding:8px 12px;font-weight:700;text-align:right">AUD ${totalAmount.toFixed(2)}</td></tr></tfoot>
            </table>
            <p style="font-size:13px;color:#64748b">Thank you,<br/><strong>LogiQ-On Tech</strong></p>
          </div>
        </div>`,
        orderId: storefrontOrder.id,
      }).catch(() => {});

      // Send PO email to supplier
      const supplierEmail = vendor?.poEmail || itemMaster?.supplierEmail;
      if (!supplierEmail) {
        console.warn(`[demo/place-order] No supplier email for PO ${poNumber} (order ${orderNumber}). Set vendor.poEmail or itemMaster.supplierEmail to enable PO emails.`);
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
          subject: `Purchase Order ${poNumber} — LogiQ-On Tech`,
          html: `<div style="font-family:sans-serif;max-width:680px;margin:0 auto">
            <h2 style="color:#0f172a">Purchase Order — ${poNumber}</h2>
            <p>Dear ${vendor?.companyName || 'Supplier'},</p>
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
            <p>Please send your invoice quoting PO <strong>${poNumber}</strong>.</p>
            <p>Thank you,<br/>LogiQ-On Tech Procurement Team</p>
          </div>`,
          orderId: storefrontOrder.id,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[demo/place-order] PO creation failed:', err);
    }
  }

  // Re-fetch final status
  const finalOrder = await prisma.storefrontOrder.findUnique({ where: { id: storefrontOrder.id } });

  return NextResponse.json({
    success: true,
    orderNumber,
    orderStatus: finalOrder?.status,
    salesOrderNumber: salesOrder?.salesOrderNumber,
    totalAmount: totalAmount.toFixed(2),
  });
}
