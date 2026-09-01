import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadCustomerInvoices, createCustomerInvoice, updateCustomerInvoice } from '@/lib/customer-invoices';
import { loadSalesOrders, updateSalesOrder } from '@/lib/sales-orders';
import { logAuditEvent } from '@/lib/audit';
import { guardPermission } from '@/lib/api-auth';
import { canTransition, getAllowedTransitions } from '@/lib/lifecycle';

const INVOICEABLE_SO_STATUSES = ['DELIVERED', 'INVOICED', 'PARTIALLY_PAID', 'PAID'];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!guardPermission(user, 'CUSTOMER_INVOICING', 'READ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  let records = await loadCustomerInvoices();

  // Automated overdue evaluation
  const now = new Date();
  for (const r of records) {
    if (['SENT', 'VIEWED', 'PARTIALLY_PAID'].includes(r.status)) {
      if (r.dueDate && new Date(r.dueDate) < now && (r.amountPaid || 0) < r.totalValue) {
        r.status = 'OVERDUE';
        await updateCustomerInvoice(r.id, { status: 'OVERDUE' });
      }
    }
  }

  if (status && status !== 'ALL') records = records.filter((r) => r.status === status);
  return NextResponse.json({ customerInvoices: records });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!guardPermission(user, 'CUSTOMER_INVOICING', 'CREATE')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  if (!body.salesOrderNumber || !body.customerName || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'Sales order, customer, and lines are required.' }, { status: 400 });
  }

  const allSOs = await loadSalesOrders();
  const linkedSo = allSOs.find((s) => s.salesOrderNumber === body.salesOrderNumber);
  if (!linkedSo) {
    return NextResponse.json({ error: `Sales order ${body.salesOrderNumber} not found.` }, { status: 404 });
  }
  if (!INVOICEABLE_SO_STATUSES.includes(linkedSo.status)) {
    return NextResponse.json({
      error: `Cannot create invoice — Sales Order is in "${linkedSo.status.replace(/_/g, ' ')}" status. Delivery must be confirmed first.`,
    }, { status: 400 });
  }

  const existingInvoices = (await loadCustomerInvoices()).filter(
    (inv) => inv.salesOrderNumber === body.salesOrderNumber && inv.status !== 'VOID'
  );
  if (existingInvoices.length > 0 && !body.allowSupplementary) {
    return NextResponse.json({
      error: `An invoice (${existingInvoices[0].invoiceNumber}) already exists for ${body.salesOrderNumber}. Void it first or pass allowSupplementary to create an additional invoice.`,
    }, { status: 409 });
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

  const rec = await createCustomerInvoice({
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
    status: 'DRAFT',
  });

  if (linkedSo.status === 'DELIVERED' && canTransition('SALES_ORDER', linkedSo.status, 'INVOICED')) {
    await updateSalesOrder(linkedSo.id, { status: 'INVOICED' });
  }

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'CUSTOMER_INVOICE_CREATED',
    module: 'GOVERNANCE',
    targetId: rec.id,
    payloadJson: { invoiceNumber: rec.invoiceNumber, salesOrderNumber: body.salesOrderNumber, totalValue: rec.totalValue },
  }).catch(() => {});

  return NextResponse.json({ success: true, customerInvoice: rec });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!guardPermission(user, 'CUSTOMER_INVOICING', 'UPDATE')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'Invoice id required.' }, { status: 400 });
  const patch: any = {};
  if (body.status) {
    const current = (await loadCustomerInvoices()).find((r) => r.id === body.id);
    if (!current) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    if (!canTransition('CUSTOMER_INVOICE', current.status, body.status)) {
      return NextResponse.json({
        error: `Cannot transition from ${current.status} to ${body.status}. Allowed: ${getAllowedTransitions('CUSTOMER_INVOICE', current.status).join(', ')}`,
      }, { status: 400 });
    }
    patch.status = body.status;
  }
  ['sentAt', 'viewedAt', 'paidAt', 'dueDate', 'customerEmail'].forEach((k) => {
    if (body[k] !== undefined) patch[k] = body[k];
  });
  const rec = await updateCustomerInvoice(body.id, patch);
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
