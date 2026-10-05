// Demo-only endpoint: runs the 3-way match for an order sitting at
// INVOICE_RECEIVED — its own owner-triggered step so "Matched" (or "Match
// Exception") is a visible pipeline stage, not something that happens silently
// inside simulate-invoice.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runThreeWayMatch } from '@/lib/three-way-match';

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
  if (sfOrder.status !== 'INVOICE_RECEIVED') {
    return NextResponse.json(
      { error: `Order must be INVOICE_RECEIVED to run the 3-way match (current: ${sfOrder.status})` },
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

  const matchResult = await runThreeWayMatch(storefrontOrderId, suppInvoice.id);

  return NextResponse.json({
    success: true,
    matched: matchResult.matched,
    variance: matchResult.variance,
    notes: matchResult.notes,
  });
}
