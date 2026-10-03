// Manual retry: create MYOB PO for a StorefrontOrder stuck at SO_CREATED or PAID.
// For PAID orders the SalesOrder + MYOB SO are created first if missing.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createMyobPurchaseOrder, createMyobSalesOrder } from '@/lib/myob';
import { nextDocumentNumber } from '@/lib/document-sequences';
import { sendTransactionalEmail } from '@/lib/email';
import { createSalesOrder } from '@/lib/sales-orders';

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
    include: { items: true },
  });

  if (sfOrder.status !== 'SO_CREATED' && sfOrder.status !== 'PAID') {
    return NextResponse.json(
      { error: `Order must be SO_CREATED or PAID to create PO (current: ${sfOrder.status})` },
      { status: 422 }
    );
  }

  // For PAID orders: create SalesOrder + MYOB SO first if they don't exist
  if (sfOrder.status === 'PAID' && !sfOrder.salesOrderId) {
    try {
      const soLines = sfOrder.items.map((l, i) => ({
        id: `sol_retry_${sfOrder.id}_${i}`,
        itemCode: l.itemCode,
        itemName: l.itemName,
        quantity: l.quantity,
        sellingPrice: Number(l.unitPrice),
        taxPercent: Number(l.taxPercent ?? 10),
        lineTotal: Number(l.lineTotal),
      }));
      const subtotal = soLines.reduce((s, l) => s + l.quantity * l.sellingPrice, 0);
      const taxTotal = soLines.reduce((s, l) => s + l.quantity * l.sellingPrice * (l.taxPercent / 100), 0);
      const so = await createSalesOrder({
        customerName: sfOrder.customerName,
        customerEmail: sfOrder.customerEmail,
        deliveryLocation: sfOrder.deliveryAddress || '',
        paymentTerms: 'Prepaid',
        currency: 'AUD',
        lines: soLines,
        subtotal,
        taxTotal,
        totalValue: subtotal + taxTotal,
        source: 'ONLINE_STORE',
        createdBy: 'admin-retry',
        status: 'DRAFT',
      });
      const myobSo = await createMyobSalesOrder({
        customerContactId: 'DEMO-CUSTOMER',
        soNumber: so.salesOrderNumber,
        orderDate: new Date().toISOString().split('T')[0],
        deliveryAddress: sfOrder.deliveryAddress || '',
        lines: sfOrder.items.map((l) => ({ itemCode: l.itemCode, description: l.itemName, quantity: l.quantity, unitPrice: Number(l.unitPrice), taxCode: 'GST' })),
        memo: `Retry SO for ${sfOrder.orderNumber}`,
      });
      await prisma.storefrontOrder.update({
        where: { id: storefrontOrderId },
        data: { salesOrderId: so.id, myobSoGuid: myobSo.guid, myobSoNumber: myobSo.soNumber, status: 'SO_CREATED' },
      });
    } catch (err) {
      console.error('[myob/po] SO creation for PAID order failed:', err);
    }
  }

  // Find vendor from first line item
  const firstItem = sfOrder.items[0];
  const itemMaster = firstItem
    ? await prisma.itemMaster.findFirst({
        where: { sku: firstItem.itemCode },
        include: { vendor: true },
      })
    : null;
  const vendor = itemMaster?.vendor;

  const poNumber = sfOrder.myobPoNumber || (await nextDocumentNumber('PO'));

  const myobResult = await createMyobPurchaseOrder({
    supplierContactId: vendor?.myobContactId || 'UNKNOWN',
    poNumber,
    deliveryAddress: sfOrder.deliveryAddress || '',
    currency: 'AUD',
    lines: sfOrder.items.map((item) => ({
      itemCode: item.itemCode,
      description: item.itemName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      taxCode: 'GST',
    })),
    memo: `Storefront order ${sfOrder.orderNumber} — ${sfOrder.customerName}`,
  });

  await prisma.storefrontOrder.update({
    where: { id: storefrontOrderId },
    data: {
      myobPoGuid: myobResult.guid,
      myobPoNumber: myobResult.poNumber,
      status: 'PO_SENT',
      poEmailSentAt: new Date(),
      poEmailSentTo: vendor?.poEmail || undefined,
    },
  });

  // Email PO to supplier
  const supplierEmail = vendor?.poEmail || itemMaster?.supplierEmail;
  if (supplierEmail) {
    const poLines = sfOrder.items
      .map((i) => `<tr><td style="padding:4px 8px;border:1px solid #e2e8f0">${i.itemCode}</td><td style="padding:4px 8px;border:1px solid #e2e8f0">${i.itemName}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center">${i.quantity}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:right">AUD ${Number(i.unitPrice).toFixed(2)}</td></tr>`)
      .join('');
    await sendTransactionalEmail({
      to: supplierEmail,
      subject: `Purchase Order ${poNumber} — LogiQ-On Tech`,
      html: `<div style="font-family:sans-serif;max-width:680px;margin:0 auto"><h2>Purchase Order — ${poNumber}</h2><p>Dear ${vendor?.companyName || 'Supplier'},</p><p>Please find below a Purchase Order from <strong>LogiQ-On Tech</strong>.</p><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f1f5f9"><th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left">SKU</th><th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left">Description</th><th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center">Qty</th><th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right">Unit Price</th></tr></thead><tbody>${poLines}</tbody></table><p>Please send your invoice to ${process.env.IMAP_USER || 'accounts@logiqon.com'} quoting PO <strong>${poNumber}</strong>.</p><p>Thank you,<br/>LogiQ-On Tech</p></div>`,
    }).catch((err) => console.warn('PO retry email failed:', err));
  }

  return NextResponse.json({
    success: true,
    poNumber: myobResult.poNumber,
    myobPoGuid: myobResult.guid,
  });
}
