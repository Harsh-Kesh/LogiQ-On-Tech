// Manual retry: create MYOB PO for a StorefrontOrder stuck at SO_CREATED or PAID.
// For PAID orders the SalesOrder + MYOB SO are created first if missing.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createMyobPurchaseOrder, createMyobSalesOrder } from '@/lib/myob';
import { nextDocumentNumber } from '@/lib/document-sequences';
import { sendTransactionalEmail, renderEmailShell, emailInfoTable, emailItemsTable } from '@/lib/email';
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
        // Reuse the order number the customer already has (from checkout) instead of
        // minting a second, different-looking one for the same order.
        salesOrderNumber: sfOrder.orderNumber,
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
    const accountsEmail = process.env.IMAP_USER || 'accounts@logiqon.com';
    const html = renderEmailShell({
      eyebrow: 'Purchase Order',
      heading: `Purchase Order ${poNumber}`,
      subheading: `Dear ${vendor?.companyName || 'Supplier'}`,
      bodyHtml: `
        ${sfOrder.deliveryAddress ? emailInfoTable([{ label: 'Deliver To', value: sfOrder.deliveryAddress }]) : ''}
        ${emailItemsTable(
          sfOrder.items.map((i) => ({ label: i.itemName, sublabel: `Our ref: ${i.itemCode}`, qty: i.quantity, unitPrice: Number(i.unitPrice), lineTotal: i.quantity * Number(i.unitPrice) })),
          'AUD'
        )}
        <p style="margin:0;font-size:13px;color:#64748b">Please send your invoice to <a href="mailto:${accountsEmail}" style="color:#4C3AE3">${accountsEmail}</a> quoting PO number <strong>${poNumber}</strong>.</p>`,
    });
    await sendTransactionalEmail({
      to: supplierEmail,
      subject: `Purchase Order ${poNumber} — LogiQ-On Tech`,
      html,
    }).catch((err) => console.warn('PO retry email failed:', err));
  }

  return NextResponse.json({
    success: true,
    poNumber: myobResult.poNumber,
    myobPoGuid: myobResult.guid,
  });
}
