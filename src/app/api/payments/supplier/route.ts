// Phase 5 — Admin-triggered supplier payment for a StorefrontOrder.
// Uses Airwallex if AIRWALLEX_CLIENT_ID is set, otherwise falls back to Monoova.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendMonoovaOskoPayment } from '@/lib/monoova';
import { sendAirwallexPayment } from '@/lib/airwallex';
import { recordMyobSupplierPayment } from '@/lib/myob';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { storefrontOrderId } = await req.json();
  if (!storefrontOrderId) {
    return NextResponse.json({ error: 'storefrontOrderId is required' }, { status: 400 });
  }

  const sfOrder = await prisma.storefrontOrder.findUniqueOrThrow({
    where: { id: storefrontOrderId },
    include: { items: true },
  });

  if (!['MATCHED', 'BILL_CREATED'].includes(sfOrder.status)) {
    return NextResponse.json(
      { error: `Cannot pay supplier — order status is ${sfOrder.status}` },
      { status: 422 }
    );
  }

  // Lookup vendor bank details
  const firstItem = sfOrder.items[0];
  const itemMaster = firstItem
    ? await prisma.itemMaster.findFirst({
        where: { sku: firstItem.itemCode },
        include: { vendor: true },
      })
    : null;
  const vendor = itemMaster?.vendor;

  if (!vendor?.bankBsb || !vendor?.bankAccountNumber || !vendor?.bankAccountName) {
    return NextResponse.json({ error: 'Vendor bank details not configured' }, { status: 422 });
  }

  const amount = Number(sfOrder.totalAmount);

  // Use Airwallex if configured, otherwise Monoova
  const useAirwallex = !!process.env.AIRWALLEX_CLIENT_ID;
  const payResult = useAirwallex
    ? await sendAirwallexPayment({
        toAccountBsb: vendor.bankBsb,
        toAccountNumber: vendor.bankAccountNumber,
        toAccountName: vendor.bankAccountName,
        amount,
        currency: 'AUD',
        reference: `Payment for ${sfOrder.myobPoNumber || sfOrder.orderNumber}`,
        requestId: sfOrder.id,
      })
    : await sendMonoovaOskoPayment({
        toAccountBsb: vendor.bankBsb,
        toAccountNumber: vendor.bankAccountNumber,
        toAccountName: vendor.bankAccountName,
        amount,
        description: `Payment for ${sfOrder.orderNumber}`,
        reference: sfOrder.myobPoNumber || sfOrder.orderNumber,
      });

  // Record in MYOB if Bill GUID is set
  if (vendor.myobContactId && sfOrder.myobBillGuid) {
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
