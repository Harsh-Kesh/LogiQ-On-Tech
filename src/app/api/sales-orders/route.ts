import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadSalesOrders, createSalesOrder } from '@/lib/sales-orders';
import { logAuditEvent } from '@/lib/audit';
import { guardPermission } from '@/lib/api-auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!guardPermission(user, 'SALES_ORDERS', 'READ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  let records = await loadSalesOrders();
  if (status && status !== 'ALL') records = records.filter((r) => r.status === status);
  return NextResponse.json({ salesOrders: records });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!guardPermission(user, 'SALES_ORDERS', 'CREATE')) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json();
  const required = ['customerName', 'deliveryLocation', 'paymentTerms', 'lines'];
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `Field '${k}' is required.` }, { status: 400 });
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required.' }, { status: 400 });
  }

  const lines = body.lines.map((l: any, i: number) => {
    const itemCode = String(l.itemCode || '').trim();
    const itemName = String(l.itemName || l.description || itemCode).trim();
    const description = String(l.description || l.itemName || itemCode).trim();
    const quantity = Number(l.quantity) || 1;
    const sellingPrice = Number(l.sellingPrice) || 0;
    const taxPercent = l.taxPercent !== undefined ? Number(l.taxPercent) : 10;
    const subtotal = quantity * sellingPrice;
    const lineTotal = Math.round(subtotal * (1 + taxPercent / 100) * 100) / 100;
    return {
      id: `sol_${Date.now()}_${i}`,
      itemCode,
      itemName,
      description,
      quantity,
      sellingPrice,
      taxPercent,
      lineTotal,
    };
  });

  const subtotal = lines.reduce((s: number, l: any) => s + l.quantity * l.sellingPrice, 0);
  const taxTotal = Math.round((lines.reduce((s: number, l: any) => s + l.quantity * l.sellingPrice * (l.taxPercent / 100), 0)) * 100) / 100;
  const totalValue = Math.round((subtotal + taxTotal) * 100) / 100;

  const rec = await createSalesOrder({
    customerName: String(body.customerName).trim(),
    customerEmail: body.customerEmail ? String(body.customerEmail).trim() : undefined,
    customerPoReference: body.customerPoReference ? String(body.customerPoReference).trim() : undefined,
    deliveryLocation: String(body.deliveryLocation).trim(),
    requestedDeliveryDate: body.requestedDeliveryDate ? String(body.requestedDeliveryDate).trim() : undefined,
    paymentTerms: String(body.paymentTerms).trim(),
    incoterms: body.incoterms ? String(body.incoterms).trim() : undefined,
    currency: (body.currency || 'AUD').toUpperCase(),
    lines,
    subtotal,
    taxTotal,
    totalValue,
    internalNotes: body.internalNotes ? String(body.internalNotes).trim() : undefined,
    createdBy: user.email || 'owner@logiqon.com',
    status: 'DRAFT',
  });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'SALES_ORDER_CREATED',
    module: 'GOVERNANCE',
    targetId: rec.id,
    payloadJson: {
      salesOrderNumber: rec.salesOrderNumber,
      customerName: rec.customerName,
      customerPoReference: rec.customerPoReference,
      deliveryLocation: rec.deliveryLocation,
      requestedDeliveryDate: rec.requestedDeliveryDate,
      paymentTerms: rec.paymentTerms,
      totalValue: rec.totalValue,
      lineCount: rec.lines.length,
    },
  }).catch(() => {});

  return NextResponse.json({ success: true, salesOrder: rec });
}
