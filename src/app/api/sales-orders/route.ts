import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadSalesOrders, createSalesOrder } from '@/lib/sales-orders';
import { logAuditEvent } from '@/lib/audit';

function ownerAuth(user: any) {
  return user && ['PLATFORM_OWNER', 'MDM'].includes(user.role);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  let records = loadSalesOrders();
  if (status && status !== 'ALL') records = records.filter((r) => r.status === status);
  return NextResponse.json({ salesOrders: records });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!ownerAuth(user)) return NextResponse.json({ error: 'Unauthorized: Owner or Sales/Ops role required.' }, { status: 403 });

  const body = await req.json();
  const required = ['customerName', 'deliveryLocation', 'paymentTerms', 'lines'];
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `Field '${k}' is required.` }, { status: 400 });
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required.' }, { status: 400 });
  }

  const lines = body.lines.map((l: any, i: number) => {
    const quantity = Number(l.quantity);
    const sellingPrice = Number(l.sellingPrice);
    const taxPercent = Number(l.taxPercent || 10);
    const subtotal = quantity * sellingPrice;
    const lineTotal = Math.round(subtotal * (1 + taxPercent / 100) * 100) / 100;
    return {
      id: `sol_${Date.now()}_${i}`,
      itemCode: String(l.itemCode || '').trim(),
      itemName: String(l.itemName || '').trim(),
      quantity,
      sellingPrice,
      taxPercent,
      lineTotal,
    };
  });

  const subtotal = lines.reduce((s: number, l: any) => s + l.quantity * l.sellingPrice, 0);
  const taxTotal = Math.round((lines.reduce((s: number, l: any) => s + l.quantity * l.sellingPrice * (l.taxPercent / 100), 0)) * 100) / 100;
  const totalValue = Math.round((subtotal + taxTotal) * 100) / 100;

  const rec = createSalesOrder({
    customerName: String(body.customerName).trim(),
    customerPoReference: body.customerPoReference || undefined,
    deliveryLocation: String(body.deliveryLocation).trim(),
    requestedDeliveryDate: body.requestedDeliveryDate,
    paymentTerms: body.paymentTerms,
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
    action: 'SALES_ORDER_CREATED',
    module: 'GOVERNANCE',
    targetId: rec.id,
    payloadJson: { salesOrderNumber: rec.salesOrderNumber, totalValue: rec.totalValue },
  }).catch(() => {});

  return NextResponse.json({ success: true, salesOrder: rec });
}
