// Demo-only: force an order through the bill/payment/warranty pipeline.
// Handles orders stuck at MATCH_EXCEPTION, MATCHED, or INVOICE_RECEIVED.
// Creates a matching supplier invoice if one doesn't exist, then re-runs
// the three-way match which will pass (amounts always match in force mode).

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runThreeWayMatch } from '@/lib/three-way-match';

const ELIGIBLE = new Set(['MATCH_EXCEPTION', 'MATCHED', 'INVOICE_RECEIVED', 'BILL_CREATED']);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { storefrontOrderId } = await req.json();
  if (!storefrontOrderId) {
    return NextResponse.json({ error: 'storefrontOrderId required' }, { status: 400 });
  }

  const sfOrder = await prisma.storefrontOrder.findUnique({ where: { id: storefrontOrderId } });
  if (!sfOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (!ELIGIBLE.has(sfOrder.status)) {
    return NextResponse.json(
      { error: `Force match is not applicable for status ${sfOrder.status}. Expected: ${[...ELIGIBLE].join(', ')}` },
      { status: 422 }
    );
  }

  // Find existing supplier invoice or create one that exactly matches the PO total
  let suppInv = await prisma.supplierInvoice.findFirst({
    where: {
      OR: [
        { linkedPoNumber: sfOrder.myobPoNumber || '' },
        { linkedPoNumber: sfOrder.orderNumber },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!suppInv) {
    suppInv = await prisma.supplierInvoice.create({
      data: {
        vendorInvoiceNumber: `FORCE-MATCH-INV-${Date.now()}`,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 86_400_000),
        vendorName: 'Demo Supplier (force-matched)',
        linkedPoNumber: sfOrder.myobPoNumber || sfOrder.orderNumber,
        currency: 'AUD',
        invoiceAmount: sfOrder.totalAmount, // exact match guarantees pass
        status: 'SUBMITTED',
      },
    });
  } else if (Number(suppInv.invoiceAmount) !== Number(sfOrder.totalAmount)) {
    // Adjust the existing invoice to match exactly so the 3-way passes
    await prisma.supplierInvoice.update({
      where: { id: suppInv.id },
      data: { invoiceAmount: sfOrder.totalAmount, status: 'SUBMITTED' },
    });
    suppInv = { ...suppInv, invoiceAmount: sfOrder.totalAmount };
  }

  // Reset order to INVOICE_RECEIVED so runThreeWayMatch can progress it cleanly
  await prisma.storefrontOrder.update({
    where: { id: storefrontOrderId },
    data: {
      status: 'INVOICE_RECEIVED',
      supplierInvoiceReceivedAt: sfOrder.supplierInvoiceReceivedAt || new Date(),
      threeWayMatchResult: null,
      threeWayMatchNotes: null,
    },
  });

  const matchResult = await runThreeWayMatch(storefrontOrderId, suppInv.id);

  const updatedOrder = await prisma.storefrontOrder.findUnique({ where: { id: storefrontOrderId } });

  return NextResponse.json({
    success: true,
    matched: matchResult.matched,
    notes: matchResult.notes,
    orderStatus: updatedOrder?.status,
    invoiceId: suppInv.id,
    invoiceNumber: suppInv.vendorInvoiceNumber,
  });
}
