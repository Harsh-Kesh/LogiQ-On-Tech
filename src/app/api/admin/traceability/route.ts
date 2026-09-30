import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const term = `%${q}%`;

  const [warranties, sfOrders, suppInvoices] = await Promise.all([
    prisma.warrantyRecord.findMany({
      where: {
        OR: [
          { warrantyNumber: { contains: q, mode: 'insensitive' } },
          { partNumber: { contains: q, mode: 'insensitive' } },
          { serialNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { salesOrderNumber: { contains: q, mode: 'insensitive' } },
          { supplierInvoiceNumber: { contains: q, mode: 'insensitive' } },
          { vendorName: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
    }),
    prisma.storefrontOrder.findMany({
      where: {
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerEmail: { contains: q, mode: 'insensitive' } },
          { myobPoNumber: { contains: q, mode: 'insensitive' } },
          { myobBillNumber: { contains: q, mode: 'insensitive' } },
          { monoovaTxnId: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
    }),
    prisma.supplierInvoice.findMany({
      where: {
        OR: [
          { vendorInvoiceNumber: { contains: q, mode: 'insensitive' } },
          { vendorName: { contains: q, mode: 'insensitive' } },
          { linkedPoNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    results: {
      warranties: warranties.map((w) => ({
        type: 'WARRANTY',
        id: w.id,
        title: w.warrantyNumber,
        subtitle: `${w.partNumber} — ${w.customerName || 'N/A'}`,
        meta: `Expires: ${w.warrantyExpiryDate?.toISOString().split('T')[0] || 'N/A'} · ${w.status}`,
        href: `/dashboard/owner/warranties?id=${w.id}`,
      })),
      orders: sfOrders.map((o) => ({
        type: 'STOREFRONT_ORDER',
        id: o.id,
        title: o.orderNumber,
        subtitle: `${o.customerName} — ${o.customerEmail}`,
        meta: `${o.currency} ${Number(o.totalAmount).toFixed(2)} · ${o.status}`,
        href: `/dashboard/owner/pipeline`,
      })),
      supplierInvoices: suppInvoices.map((i) => ({
        type: 'SUPPLIER_INVOICE',
        id: i.id,
        title: i.vendorInvoiceNumber,
        subtitle: i.vendorName,
        meta: `PO: ${i.linkedPoNumber} · AUD ${Number(i.invoiceAmount).toFixed(2)} · ${i.status}`,
        href: `/dashboard/owner/pipeline`,
      })),
    },
  });
}
