import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadCustomerInvoices, createCustomerInvoice, updateCustomerInvoice } from '@/lib/customer-invoices';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  let records = loadCustomerInvoices();
  if (status && status !== 'ALL') records = records.filter((r) => r.status === status);
  return NextResponse.json({ customerInvoices: records });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['PLATFORM_OWNER', 'MDM'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  if (!body.salesOrderNumber || !body.customerName || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'Sales order, customer, and lines are required.' }, { status: 400 });
  }

  const lines = body.lines.map((l: any) => {
    const quantity = Number(l.quantity);
    const unitPrice = Number(l.unitPrice);
    const taxPercent = Number(l.taxPercent || 10);
    const lineTotal = Math.round(quantity * unitPrice * (1 + taxPercent / 100) * 100) / 100;
    return {
      itemCode: String(l.itemCode || '').trim(),
      itemName: String(l.itemName || '').trim(),
      quantity,
      unitPrice,
      taxPercent,
      lineTotal,
    };
  });

  const subtotal = lines.reduce((s: number, l: any) => s + l.quantity * l.unitPrice, 0);
  const taxTotal = Math.round((lines.reduce((s: number, l: any) => s + l.quantity * l.unitPrice * (l.taxPercent / 100), 0)) * 100) / 100;
  const totalValue = Math.round((subtotal + taxTotal) * 100) / 100;

  const rec = createCustomerInvoice({
    salesOrderNumber: body.salesOrderNumber,
    dispatchNumber: body.dispatchNumber,
    customerName: String(body.customerName).trim(),
    customerEmail: body.customerEmail,
    billingAddress: body.billingAddress,
    issueDate: body.issueDate || new Date().toISOString(),
    dueDate: body.dueDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    currency: (body.currency || 'AUD').toUpperCase(),
    lines,
    subtotal,
    taxTotal,
    totalValue,
    createdBy: user.email || 'owner@logiqon.com',
    status: body.status,
  });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'CUSTOMER_INVOICE_CREATED',
    module: 'GOVERNANCE',
    targetId: rec.id,
    payloadJson: { invoiceNumber: rec.invoiceNumber, totalValue: rec.totalValue },
  }).catch(() => {});

  return NextResponse.json({ success: true, customerInvoice: rec });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['PLATFORM_OWNER', 'MDM'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'Invoice id required.' }, { status: 400 });
  const patch: any = {};
  ['status', 'sentAt', 'viewedAt', 'paidAt', 'amountPaid', 'dueDate'].forEach((k) => {
    if (body[k] !== undefined) patch[k] = body[k];
  });
  const rec = updateCustomerInvoice(body.id, patch);
  if (!rec) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'CUSTOMER_INVOICE_UPDATED',
    module: 'GOVERNANCE',
    targetId: body.id,
    payloadJson: patch,
  }).catch(() => {});

  return NextResponse.json({ success: true, customerInvoice: rec });
}
