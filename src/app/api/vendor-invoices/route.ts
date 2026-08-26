import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadVendorInvoices, createVendorInvoice, updateVendorInvoice, recordVendorPayment } from '@/lib/vendor-invoices';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  let records = loadVendorInvoices();
  if (status && status !== 'ALL') records = records.filter((r) => r.status === status);
  return NextResponse.json({ vendorInvoices: records });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['PLATFORM_OWNER', 'MDM'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const required = ['vendorInvoiceNumber', 'linkedPoNumber', 'vendorName', 'invoiceAmount', 'dueDate'];
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `Field '${k}' is required.` }, { status: 400 });
  }

  const rec = createVendorInvoice({
    vendorInvoiceNumber: body.vendorInvoiceNumber,
    linkedPoNumber: body.linkedPoNumber,
    vendorName: body.vendorName,
    vendorId: body.vendorId,
    invoiceDate: body.invoiceDate || new Date().toISOString(),
    dueDate: body.dueDate,
    currency: (body.currency || 'AUD').toUpperCase(),
    invoiceAmount: Number(body.invoiceAmount),
    varianceVsPo: body.varianceVsPo ? Number(body.varianceVsPo) : undefined,
    attachment: body.attachment,
    createdBy: user.email || 'owner@logiqon.com',
    status: body.status,
  });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'VENDOR_INVOICE_REGISTERED',
    module: 'GOVERNANCE',
    targetId: rec.id,
    payloadJson: { vendorInvoiceNumber: rec.vendorInvoiceNumber, linkedPoNumber: rec.linkedPoNumber, invoiceAmount: rec.invoiceAmount },
  }).catch(() => {});

  return NextResponse.json({ success: true, vendorInvoice: rec });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['PLATFORM_OWNER', 'MDM'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'Invoice id required.' }, { status: 400 });

  // Support both status update and payment recording in one route.
  if (body.recordPayment) {
    if (!body.amountPaid || !body.paymentDate || !body.paymentMethod) {
      return NextResponse.json({ error: 'amountPaid, paymentDate, paymentMethod are required.' }, { status: 400 });
    }
    const rec = recordVendorPayment(body.id, {
      paymentDate: body.paymentDate,
      amountPaid: Number(body.amountPaid),
      paymentMethod: body.paymentMethod,
      bankReferenceNumber: body.bankReferenceNumber || '',
      comments: body.comments,
      createdBy: user.email || 'owner@logiqon.com',
    });
    if (!rec) return NextResponse.json({ error: 'Vendor invoice not found.' }, { status: 404 });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'VENDOR_PAYMENT_RECORDED',
      module: 'GOVERNANCE',
      targetId: body.id,
      payloadJson: { amountPaid: body.amountPaid, method: body.paymentMethod, ref: body.bankReferenceNumber },
    }).catch(() => {});

    return NextResponse.json({ success: true, vendorInvoice: rec });
  }

  const patch: any = {};
  ['status', 'dueDate', 'attachment', 'varianceVsPo'].forEach((k) => {
    if (body[k] !== undefined) patch[k] = body[k];
  });
  const rec = updateVendorInvoice(body.id, patch);
  if (!rec) return NextResponse.json({ error: 'Vendor invoice not found.' }, { status: 404 });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'VENDOR_INVOICE_UPDATED',
    module: 'GOVERNANCE',
    targetId: body.id,
    payloadJson: patch,
  }).catch(() => {});

  return NextResponse.json({ success: true, vendorInvoice: rec });
}
