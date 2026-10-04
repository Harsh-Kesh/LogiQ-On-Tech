// Phase 5 — Admin-triggered supplier payment for a StorefrontOrder.
// Uses Airwallex if AIRWALLEX_CLIENT_ID is set, otherwise falls back to Monoova.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendMonoovaOskoPayment } from '@/lib/monoova';
import { sendAirwallexPayment } from '@/lib/airwallex';
import { recordMyobSupplierPayment } from '@/lib/myob';
import { computeSupplierPoTotal } from '@/lib/po-total';

async function resolvePaymentDetails(storefrontOrderId: string) {
  const sfOrder = await prisma.storefrontOrder.findUniqueOrThrow({
    where: { id: storefrontOrderId },
    include: { items: true },
  });

  // Lookup vendor bank details
  const firstItem = sfOrder.items[0];
  const itemMaster = firstItem
    ? await prisma.itemMaster.findFirst({
        where: { sku: firstItem.itemCode },
        include: { vendor: true },
      })
    : null;
  const vendor = itemMaster?.vendor;

  // Use demo placeholder bank details if vendor not configured
  const bsb = vendor?.bankBsb || 'DEMO-BSB';
  const accountNumber = vendor?.bankAccountNumber || 'DEMO-ACCT';
  const accountName = vendor?.bankAccountName || (vendor?.companyName || 'Demo Supplier');

  // Pay the matched supplier invoice amount if we have one on file, otherwise fall
  // back to a freshly computed cost-based total. Never the customer's paid total —
  // that is the selling price, not what we owe the supplier.
  const matchedInvoice = await prisma.supplierInvoice.findFirst({
    where: { linkedPoNumber: sfOrder.myobPoNumber || sfOrder.orderNumber },
    orderBy: { createdAt: 'desc' },
  });
  const amount = matchedInvoice
    ? Number(matchedInvoice.invoiceAmount)
    : (await computeSupplierPoTotal(sfOrder.items.map((i) => ({ itemCode: i.itemCode, quantity: i.quantity, taxPercent: i.taxPercent })))).total;

  const useAirwallex = !!process.env.AIRWALLEX_CLIENT_ID;

  return {
    sfOrder, vendor, bsb, accountNumber, accountName, amount,
    provider: useAirwallex ? 'Airwallex' : 'Monoova OSKO',
    useAirwallex,
  };
}

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
    canPay: ['MATCHED', 'BILL_CREATED'].includes(sfOrder.status),
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

  const { sfOrder, vendor, bsb, accountNumber, accountName, amount, useAirwallex } = await resolvePaymentDetails(storefrontOrderId);

  if (!['MATCHED', 'BILL_CREATED'].includes(sfOrder.status)) {
    return NextResponse.json(
      { error: `Cannot pay supplier — order status is ${sfOrder.status}` },
      { status: 422 }
    );
  }

  // Use Airwallex if configured, otherwise Monoova (both have demo stubs)
  const payResult = useAirwallex
    ? await sendAirwallexPayment({
        toAccountBsb: bsb,
        toAccountNumber: accountNumber,
        toAccountName: accountName,
        amount,
        currency: 'AUD',
        reference: `Payment for ${sfOrder.myobPoNumber || sfOrder.orderNumber}`,
        requestId: sfOrder.id,
      })
    : await sendMonoovaOskoPayment({
        toAccountBsb: bsb,
        toAccountNumber: accountNumber,
        toAccountName: accountName,
        amount,
        description: `Payment for ${sfOrder.orderNumber}`,
        reference: sfOrder.myobPoNumber || sfOrder.orderNumber,
      });

  // Record in MYOB if Bill GUID is set
  if (vendor?.myobContactId && sfOrder.myobBillGuid) {
    await recordMyobSupplierPayment({
      supplierContactId: vendor.myobContactId,
      billGuid: sfOrder.myobBillGuid,
      amount,
      paymentDate: new Date().toISOString().split('T')[0],
      memo: `Payment for ${sfOrder.orderNumber} via bank transfer`,
    }).catch((err) => console.warn('MYOB supplier payment record failed:', err.message));
  }

  await prisma.storefrontOrder.update({
    where: { id: storefrontOrderId },
    data: {
      monoovaTxnId: payResult.transactionId,
      monoovaStatus: payResult.status,
      supplierPaidAt: new Date(),
      status: 'SUPPLIER_PAID',
    },
  });

  return NextResponse.json({ success: true, transactionId: payResult.transactionId });
}
