// Demo-only endpoint: simulates a supplier emailing a PDF invoice.
// Creates a SupplierInvoice record and triggers the 3-way match engine,
// letting you demonstrate the full pipeline without real IMAP or a PDF.

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

  const sfOrder = await prisma.storefrontOrder.findUniqueOrThrow({
    where: { id: storefrontOrderId },
  });

  if (sfOrder.status !== 'PO_SENT') {
    return NextResponse.json(
      { error: `Order must be in PO_SENT status to simulate an invoice (current: ${sfOrder.status})` },
      { status: 422 }
    );
  }

  // Create a simulated supplier invoice that exactly matches the PO total
  const suppInvoice = await prisma.supplierInvoice.create({
    data: {
      vendorInvoiceNumber: `DEMO-INV-${Date.now()}`,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86_400_000),
      vendorName: 'Demo Supplier',
      linkedPoNumber: sfOrder.myobPoNumber || sfOrder.orderNumber,
      currency: 'AUD',
      invoiceAmount: sfOrder.totalAmount,
      status: 'SUBMITTED',
    },
  });

  // Advance order status to INVOICE_RECEIVED
  await prisma.storefrontOrder.update({
    where: { id: storefrontOrderId },
    data: {
      status: 'INVOICE_RECEIVED',
      supplierInvoiceReceivedAt: new Date(),
    },
  });

  // Run 3-way match immediately
  const matchResult = await runThreeWayMatch(storefrontOrderId, suppInvoice.id);

  return NextResponse.json({
    success: true,
    invoiceId: suppInvoice.id,
    invoiceNumber: suppInvoice.vendorInvoiceNumber,
    matched: matchResult.matched,
    variance: matchResult.variance,
    notes: matchResult.notes,
  });
}
