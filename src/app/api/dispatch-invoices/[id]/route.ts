import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateDispatchInvoice } from '@/lib/dispatch-invoices';
import { logAuditEvent } from '@/lib/audit';

const ALLOWED_STATUSES = ['NOT_INVOICED', 'INVOICE_ISSUED', 'PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'ON_HOLD', 'DISPUTED', 'CANCELLED'];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const patch: any = {};
  if (body.paymentStatus) {
    if (!ALLOWED_STATUSES.includes(body.paymentStatus)) return NextResponse.json({ error: 'Invalid paymentStatus.' }, { status: 400 });
    patch.paymentStatus = body.paymentStatus;
  }
  ['paymentDate', 'paymentReference', 'comments', 'attachment', 'paymentDueDate', 'invoiceDate'].forEach((k) => {
    if (body[k] !== undefined) patch[k] = body[k];
  });
  if (body.invoiceAmount !== undefined) patch.invoiceAmount = Number(body.invoiceAmount);
  if (body.dispatchValue !== undefined) patch.dispatchValue = Number(body.dispatchValue);

  const rec = updateDispatchInvoice(params.id, patch);
  if (!rec) return NextResponse.json({ error: 'Dispatch invoice not found.' }, { status: 404 });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'DISPATCH_INVOICE_UPDATED',
    module: 'GOVERNANCE',
    targetId: params.id,
    payloadJson: patch,
  }).catch(() => {});

  return NextResponse.json({ success: true, dispatchInvoice: rec });
}
