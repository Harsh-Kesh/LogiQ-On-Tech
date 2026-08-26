import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPurchaseOrders, createPurchaseOrder } from '@/lib/purchase-orders';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  let records = loadPurchaseOrders();
  if (status && status !== 'ALL') records = records.filter((r) => r.status === status);
  return NextResponse.json({ purchaseOrders: records });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['PLATFORM_OWNER', 'MDM'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  if (!body.vendorName || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'Vendor and at least one line item are required.' }, { status: 400 });
  }

  const lines = body.lines.map((l: any, i: number) => {
    const quantity = Number(l.quantity);
    const unitCost = Number(l.unitCost);
    const taxPercent = Number(l.taxPercent || 10);
    const subtotal = quantity * unitCost;
    const lineTotal = Math.round(subtotal * (1 + taxPercent / 100) * 100) / 100;
    return {
      id: `pol_${Date.now()}_${i}`,
      itemCode: String(l.itemCode || '').trim(),
      itemName: String(l.itemName || '').trim(),
      quantity,
      unitCost,
      taxPercent,
      lineTotal,
    };
  });

  const subtotal = lines.reduce((s: number, l: any) => s + l.quantity * l.unitCost, 0);
  const taxTotal = Math.round((lines.reduce((s: number, l: any) => s + l.quantity * l.unitCost * (l.taxPercent / 100), 0)) * 100) / 100;
  const totalValue = Math.round((subtotal + taxTotal) * 100) / 100;

  const rec = createPurchaseOrder({
    vendorName: String(body.vendorName).trim(),
    vendorId: body.vendorId,
    linkedSalesOrderNumber: body.linkedSalesOrderNumber,
    requestedDeliveryDate: body.requestedDeliveryDate,
    paymentTerms: body.paymentTerms || 'Net 30',
    currency: (body.currency || 'AUD').toUpperCase(),
    lines,
    subtotal,
    taxTotal,
    totalValue,
    moq: body.moq ? Number(body.moq) : undefined,
    leadTimeDays: body.leadTimeDays ? Number(body.leadTimeDays) : undefined,
    notes: body.notes,
    createdBy: user.email || 'owner@logiqon.com',
    status: body.status,
  });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'PURCHASE_ORDER_CREATED',
    module: 'GOVERNANCE',
    targetId: rec.id,
    payloadJson: { poNumber: rec.poNumber, totalValue: rec.totalValue },
  }).catch(() => {});

  return NextResponse.json({ success: true, purchaseOrder: rec });
}
