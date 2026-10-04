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
  const id = searchParams.get('id')?.trim();

  // ── Investigation chain mode ──────────────────────────────────────────────
  if (id) {
    const sfOrder = await prisma.storefrontOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sfOrder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [salesOrder, warranties, emailLogs] = await Promise.all([
      sfOrder.salesOrderId
        ? prisma.salesOrder.findUnique({ where: { id: sfOrder.salesOrderId } })
        : null,
      prisma.warrantyRecord.findMany({
        where: sfOrder.salesOrderId
          ? { salesOrderId: sfOrder.salesOrderId }
          : { salesOrderNumber: sfOrder.myobSoNumber ?? '__NONE__' },
        include: {
          evidence: {
            select: { id: true, fileName: true, fileType: true, uploadedAt: true, uploadedBy: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.emailLog.findMany({
        where: { orderId: sfOrder.id },
        orderBy: { sentAt: 'asc' },
        select: { id: true, to: true, cc: true, subject: true, sentAt: true, mode: true },
      }),
    ]);

    // Find supplier invoice via warranty link or PO number
    let supplierInvoice = null;
    if (warranties.length > 0 && warranties[0].supplierInvoiceId) {
      supplierInvoice = await prisma.supplierInvoice.findUnique({
        where: { id: warranties[0].supplierInvoiceId },
      });
    } else if (sfOrder.myobPoNumber) {
      supplierInvoice = await prisma.supplierInvoice.findFirst({
        where: {
          OR: [
            { linkedPoNumber: sfOrder.myobPoNumber },
            { linkedPoNumber: { contains: sfOrder.myobPoNumber } },
          ],
        },
      });
    }

    return NextResponse.json({
      chain: {
        sfOrder: {
          id: sfOrder.id,
          orderNumber: sfOrder.orderNumber,
          status: sfOrder.status,
          customerName: sfOrder.customerName,
          customerEmail: sfOrder.customerEmail,
          deliveryAddress: sfOrder.deliveryAddress,
          currency: sfOrder.currency,
          totalAmount: Number(sfOrder.totalAmount),
          paidAt: sfOrder.paidAt,
          myobSoGuid: sfOrder.myobSoGuid,
          myobSoNumber: sfOrder.myobSoNumber,
          myobPoGuid: sfOrder.myobPoGuid,
          myobPoNumber: sfOrder.myobPoNumber,
          myobBillGuid: sfOrder.myobBillGuid,
          myobBillNumber: sfOrder.myobBillNumber,
          monoovaTxnId: sfOrder.monoovaTxnId,
          monoovaStatus: sfOrder.monoovaStatus,
          supplierPaidAt: sfOrder.supplierPaidAt,
          sektorStatus: sfOrder.sektorStatus,
          sektorTrackingNumber: sfOrder.sektorTrackingNumber,
          sektorStatusUpdatedAt: sfOrder.sektorStatusUpdatedAt,
          fulfilledAt: sfOrder.fulfilledAt,
          poEmailSentAt: sfOrder.poEmailSentAt,
          poEmailSentTo: sfOrder.poEmailSentTo,
          supplierInvoiceReceivedAt: sfOrder.supplierInvoiceReceivedAt,
          threeWayMatchResult: sfOrder.threeWayMatchResult,
          threeWayMatchNotes: sfOrder.threeWayMatchNotes,
          matchedAt: sfOrder.matchedAt,
          createdAt: sfOrder.createdAt,
          items: sfOrder.items.map((i) => ({
            itemCode: i.itemCode,
            itemName: i.itemName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            lineTotal: Number(i.lineTotal),
          })),
        },
        salesOrder: salesOrder
          ? {
              id: salesOrder.id,
              salesOrderNumber: salesOrder.salesOrderNumber,
              status: salesOrder.status,
              createdAt: salesOrder.createdAt,
            }
          : null,
        supplierInvoice: supplierInvoice
          ? {
              id: supplierInvoice.id,
              vendorInvoiceNumber: supplierInvoice.vendorInvoiceNumber,
              vendorName: supplierInvoice.vendorName,
              invoiceDate: supplierInvoice.invoiceDate,
              dueDate: supplierInvoice.dueDate,
              invoiceAmount: Number(supplierInvoice.invoiceAmount),
              status: supplierInvoice.status,
              threeWayMatchResult: supplierInvoice.threeWayMatchResult,
              threeWayMatchNotes: supplierInvoice.threeWayMatchNotes,
              matchedAt: supplierInvoice.matchedAt,
              myobBillGuid: supplierInvoice.myobBillGuid,
              myobBillNumber: supplierInvoice.myobBillNumber,
              monoovaTxnId: supplierInvoice.monoovaTxnId,
            }
          : null,
        warranties: warranties.map((w) => ({
          id: w.id,
          warrantyNumber: w.warrantyNumber,
          partNumber: w.partNumber,
          partDescription: w.partDescription,
          serialNumber: w.serialNumber,
          batchNumber: w.batchNumber,
          status: w.status,
          warrantyStartDate: w.warrantyStartDate,
          warrantyExpiryDate: w.warrantyExpiryDate,
          warrantyPeriodMonths: w.warrantyPeriodMonths,
          remainingDays: w.remainingDays,
          deliveryDate: w.deliveryDate,
          vendorName: w.vendorName,
          evidence: w.evidence,
        })),
        emailLogs,
      },
    });
  }

  // ── Search mode ───────────────────────────────────────────────────────────
  if (!q || q.length < 2) return NextResponse.json({ results: { orders: [], warranties: [], supplierInvoices: [] } });

  const [warranties, sfOrders, suppInvoices] = await Promise.all([
    prisma.warrantyRecord.findMany({
      where: {
        OR: [
          { warrantyNumber: { contains: q, mode: 'insensitive' } },
          { partNumber: { contains: q, mode: 'insensitive' } },
          { serialNumber: { contains: q, mode: 'insensitive' } },
          { batchNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { salesOrderNumber: { contains: q, mode: 'insensitive' } },
          { supplierInvoiceNumber: { contains: q, mode: 'insensitive' } },
          { vendorName: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
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
          { sektorTrackingNumber: { contains: q, mode: 'insensitive' } },
          { myobSoNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 15,
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

  // Resolve sfOrderId for warranty results — try the direct salesOrderId link
  // first, then fall back through the linked supplier invoice's PO number, since
  // not every warranty record ends up with salesOrderId populated (e.g. if the
  // SalesOrder failed to create at checkout time, which is non-fatal there).
  const warrantyResults = await Promise.all(
    warranties.map(async (w) => {
      let sfOrderId: string | null = null;
      if (w.salesOrderId) {
        const sf = await prisma.storefrontOrder.findFirst({
          where: { salesOrderId: w.salesOrderId },
          select: { id: true },
        });
        sfOrderId = sf?.id ?? null;
      }
      if (!sfOrderId && w.supplierInvoiceId) {
        const inv = await prisma.supplierInvoice.findUnique({
          where: { id: w.supplierInvoiceId },
          select: { linkedPoNumber: true },
        });
        if (inv?.linkedPoNumber) {
          const sf = await prisma.storefrontOrder.findFirst({
            where: { OR: [{ myobPoNumber: inv.linkedPoNumber }, { orderNumber: inv.linkedPoNumber }] },
            select: { id: true },
          });
          sfOrderId = sf?.id ?? null;
        }
      }
      if (!sfOrderId && w.salesOrderNumber) {
        const sf = await prisma.storefrontOrder.findFirst({
          where: { myobSoNumber: w.salesOrderNumber },
          select: { id: true },
        });
        sfOrderId = sf?.id ?? null;
      }
      return {
        type: 'WARRANTY' as const,
        id: w.id,
        sfOrderId,
        title: w.warrantyNumber,
        subtitle: `${w.partNumber}${w.serialNumber ? ' · S/N: ' + w.serialNumber : ''}${w.batchNumber ? ' · Batch: ' + w.batchNumber : ''} — ${w.customerName || 'N/A'}`,
        meta: `Expires: ${w.warrantyExpiryDate?.toISOString().split('T')[0] ?? 'N/A'} · ${w.status}`,
      };
    })
  );

  // Resolve sfOrderId for supplier invoice results
  const invoiceResults = await Promise.all(
    suppInvoices.map(async (i) => {
      let sfOrderId: string | null = null;
      if (i.linkedPoNumber) {
        const sf = await prisma.storefrontOrder.findFirst({
          where: {
            OR: [
              { myobPoNumber: i.linkedPoNumber },
              { myobPoNumber: { contains: i.linkedPoNumber } },
              { orderNumber: i.linkedPoNumber },
            ],
          },
          select: { id: true },
        });
        sfOrderId = sf?.id ?? null;
      }
      return {
        type: 'SUPPLIER_INVOICE' as const,
        id: i.id,
        sfOrderId,
        title: i.vendorInvoiceNumber,
        subtitle: i.vendorName,
        meta: `PO: ${i.linkedPoNumber} · AUD ${Number(i.invoiceAmount).toFixed(2)} · ${i.status}`,
      };
    })
  );

  return NextResponse.json({
    results: {
      orders: sfOrders.map((o) => ({
        type: 'STOREFRONT_ORDER' as const,
        id: o.id,
        sfOrderId: o.id,
        title: o.orderNumber,
        subtitle: `${o.customerName} — ${o.customerEmail}`,
        meta: `AUD ${Number(o.totalAmount).toFixed(2)} · ${o.status}`,
      })),
      warranties: warrantyResults,
      supplierInvoices: invoiceResults,
    },
  });
}
