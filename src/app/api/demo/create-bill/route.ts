// Demo-only endpoint: books the matched supplier invoice as a payable Bill —
// its own owner-triggered step so "Bill Created" is a visible pipeline stage,
// distinct from both the match and the payment that follows it.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSupplierBill } from '@/lib/three-way-match';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { storefrontOrderId } = await req.json();
  if (!storefrontOrderId) {
    return NextResponse.json({ error: 'storefrontOrderId required' }, { status: 400 });
  }

  const sfOrder = await prisma.storefrontOrder.findUniqueOrThrow({ where: { id: storefrontOrderId } });
  if (sfOrder.status !== 'MATCHED') {
    return NextResponse.json(
      { error: `Order must be MATCHED to create a supplier bill (current: ${sfOrder.status})` },
      { status: 422 }
    );
  }

  const suppInvoice = await prisma.supplierInvoice.findFirst({
    where: { linkedPoNumber: sfOrder.myobPoNumber || sfOrder.orderNumber },
    orderBy: { createdAt: 'desc' },
  });
  if (!suppInvoice) {
    return NextResponse.json({ error: 'No supplier invoice found for this order.' }, { status: 422 });
  }

  try {
    const result = await createSupplierBill(storefrontOrderId, suppInvoice.id);
    return NextResponse.json({ success: true, billNumber: result.billNumber });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Bill creation failed' }, { status: 422 });
  }
}
