// Phase 5 — Admin-triggered supplier payment for a StorefrontOrder.
// Uses Airwallex if AIRWALLEX_CLIENT_ID is set, otherwise falls back to Monoova.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolvePaymentDetails, payOrderSupplier } from '@/lib/supplier-payment';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const storefrontOrderId = searchParams.get('storefrontOrderId');
  if (!storefrontOrderId) {
    return NextResponse.json({ error: 'storefrontOrderId is required' }, { status: 400 });
  }

  const { sfOrder, vendor, bsb, accountNumber, accountName, amount, provider } = await resolvePaymentDetails(storefrontOrderId);

  return NextResponse.json({
    orderNumber: sfOrder.orderNumber,
    poNumber: sfOrder.myobPoNumber || sfOrder.orderNumber,
    vendorName: vendor?.companyName || 'Demo Supplier',
    bsb,
    accountNumber,
    accountName,
    amount,
    currency: sfOrder.currency,
    provider,
    // Payment is only actionable once the bill has actually been booked — MATCHED
    // alone isn't enough, that's "Create Supplier Bill"'s job (its own pipeline step).
    canPay: sfOrder.status === 'BILL_CREATED',
    status: sfOrder.status,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { storefrontOrderId } = await req.json();
  if (!storefrontOrderId) {
    return NextResponse.json({ error: 'storefrontOrderId is required' }, { status: 400 });
  }

  try {
    const result = await payOrderSupplier(storefrontOrderId);
    return NextResponse.json({ success: true, transactionId: result.transactionId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Payment failed' }, { status: 422 });
  }
}
