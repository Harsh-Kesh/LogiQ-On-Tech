import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadDispatchInvoices, createDispatchInvoice } from '@/lib/dispatch-invoices';
import { logAuditEvent } from '@/lib/audit';
import { FINANCE_ROLES, isRoleIn } from '@/lib/api-auth';

const DI_ROLES = [...FINANCE_ROLES, 'SALES_OPS' as const, 'MDM' as const];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ dispatchInvoices: loadDispatchInvoices() });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!isRoleIn(user, DI_ROLES)) {
    return NextResponse.json({ error: 'Unauthorized: Owner or Finance role required.' }, { status: 403 });
  }

  const body = await req.json();
  const required = ['dispatchNumber', 'customerName', 'invoiceNumber', 'invoiceAmount'];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === '') {
      return NextResponse.json({ error: `Field '${k}' is required.` }, { status: 400 });
    }
  }

  const rec = createDispatchInvoice({
    dispatchNumber: body.dispatchNumber,
    salesOrderNumber: body.salesOrderNumber,
    customerPoNumber: body.customerPoNumber,
    customerName: body.customerName,
    dispatchValue: Number(body.dispatchValue || body.invoiceAmount),
    currency: (body.currency || 'AUD').toUpperCase(),
    invoiceNumber: body.invoiceNumber,
    invoiceDate: body.invoiceDate || new Date().toISOString(),
    invoiceAmount: Number(body.invoiceAmount),
    attachment: body.attachment,
    paymentDueDate: body.paymentDueDate,
    paymentStatus: body.paymentStatus || 'PAYMENT_PENDING',
    paymentDate: body.paymentDate,
    paymentReference: body.paymentReference,
    comments: body.comments,
  });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'DISPATCH_INVOICE_CREATED',
    module: 'GOVERNANCE',
    targetId: rec.id,
    payloadJson: { invoiceNumber: rec.invoiceNumber, dispatchNumber: rec.dispatchNumber },
  }).catch(() => {});

  return NextResponse.json({ success: true, dispatchInvoice: rec });
}
