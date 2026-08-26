import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadDispatchNotes, createDispatchNote } from '@/lib/dispatch-notes';
import { logAuditEvent } from '@/lib/audit';

function scopedForRole(records: any[], user: any) {
  // FR-AU-003 / BR-003 — warehouse users only see their own warehouse's dispatches.
  if (user?.role === 'WAREHOUSE' && user?.warehouseCode) {
    return records.filter((r) => r.warehouseCode === user.warehouseCode);
  }
  return records;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const warehouseCode = searchParams.get('warehouseCode');
  const status = searchParams.get('status');

  let records = loadDispatchNotes();
  records = scopedForRole(records, user);
  if (warehouseCode) records = records.filter((r) => r.warehouseCode === warehouseCode);
  if (status && status !== 'ALL') records = records.filter((r) => r.status === status);

  return NextResponse.json({ dispatchNotes: records });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['PLATFORM_OWNER', 'MDM'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized: Owner or Sales/Ops role required.' }, { status: 403 });
  }

  const body = await req.json();
  const required = ['salesOrderNumber', 'customerName', 'warehouseCode', 'itemCode', 'itemName', 'orderedQty'];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === '') {
      return NextResponse.json({ error: `Field '${k}' is required.` }, { status: 400 });
    }
  }

  const rec = createDispatchNote({
    salesOrderNumber: body.salesOrderNumber,
    salesOrderId: body.salesOrderId,
    customerName: body.customerName,
    customerAddress: body.customerAddress || '',
    warehouseCode: body.warehouseCode,
    warehouseName: body.warehouseName,
    itemCode: body.itemCode,
    itemName: body.itemName,
    orderedQty: Number(body.orderedQty),
    dispatchQty: Number(body.dispatchQty || body.orderedQty),
    status: body.status,
    comments: body.comments,
  });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'DISPATCH_NOTE_CREATED',
    module: 'WAREHOUSE_OPERATIONS',
    targetId: rec.id,
    payloadJson: { dispatchNumber: rec.dispatchNumber, salesOrderNumber: rec.salesOrderNumber },
  }).catch(() => {});

  return NextResponse.json({ success: true, dispatchNote: rec });
}
