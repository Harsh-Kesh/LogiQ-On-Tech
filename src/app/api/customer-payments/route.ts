import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadCustomerPayments, recordCustomerPayment, reverseCustomerPayment } from '@/lib/customer-payments';
import { logAuditEvent } from '@/lib/audit';
import { guardPermission } from '@/lib/api-auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!guardPermission(user, 'CUSTOMER_PAYMENTS', 'READ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get('invoiceId');
  let records = await loadCustomerPayments();
  if (invoiceId) records = records.filter((r) => r.customerInvoiceId === invoiceId);
  return NextResponse.json({ customerPayments: records });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!guardPermission(user, 'CUSTOMER_PAYMENTS', 'CREATE')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();

  if (body.reverse && body.paymentId) {
    const result = await reverseCustomerPayment(body.paymentId, body.reason || 'No reason provided');
    if (!result) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'CUSTOMER_PAYMENT_REVERSED',
      module: 'GOVERNANCE',
      targetId: body.paymentId,
      payloadJson: { reason: body.reason, amount: result.payment.amount },
    }).catch(() => {});

    return NextResponse.json({ success: true, ...result });
  }

  const required = ['customerInvoiceId', 'paymentDate', 'amount', 'paymentMethod'];
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `Field '${k}' is required.` }, { status: 400 });
  }

  const result = await recordCustomerPayment({
    customerInvoiceId: body.customerInvoiceId,
    paymentDate: body.paymentDate,
    amount: Number(body.amount),
    paymentMethod: body.paymentMethod,
    bankReference: body.bankReference,
    currency: body.currency,
    notes: body.notes,
    receiptFileName: body.receiptFileName,
    receiptAttachment: body.receiptAttachment,
    createdBy: user.email || 'system',
  });

  if (!result) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'CUSTOMER_PAYMENT_RECORDED',
    module: 'GOVERNANCE',
    targetId: result.payment.id,
    payloadJson: { paymentNumber: result.payment.paymentNumber, amount: result.payment.amount, invoiceNumber: result.payment.invoiceNumber },
  }).catch(() => {});

  return NextResponse.json({ success: true, ...result });
}
