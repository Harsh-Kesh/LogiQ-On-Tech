import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const order = await prisma.storefrontOrder.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { itemCode: 'asc' } },
      salesOrder: {
        select: {
          salesOrderNumber: true,
          status: true,
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // The supplier invoice isn't a real FK off StorefrontOrder (it's matched by PO
  // number, same as Traceability resolves it) — without this, the order detail
  // page only ever showed a status badge once INVOICE_RECEIVED, never the actual
  // invoice the supplier sent (amount, date, vendor).
  const supplierInvoice = order.myobPoNumber
    ? await prisma.supplierInvoice.findFirst({
        where: {
          OR: [
            { linkedPoNumber: order.myobPoNumber },
            { linkedPoNumber: { contains: order.myobPoNumber } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  return NextResponse.json({ ...order, supplierInvoice });
}
