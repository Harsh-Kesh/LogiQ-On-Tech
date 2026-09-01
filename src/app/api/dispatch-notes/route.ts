import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadDispatchNotes, createDispatchNote } from '@/lib/dispatch-notes';
import { updateSalesOrder, loadSalesOrders, computeDispatchFulfillmentStatus } from '@/lib/sales-orders';
import { canTransition } from '@/lib/lifecycle';
import { logAuditEvent } from '@/lib/audit';
import { guardPermission } from '@/lib/api-auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!guardPermission(user, 'DISPATCH', 'READ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const warehouseCode = searchParams.get('warehouseCode');
  const status = searchParams.get('status');

  let records = await loadDispatchNotes();
  if (warehouseCode) records = records.filter((r) => r.warehouseCode === warehouseCode);
  if (status && status !== 'ALL') records = records.filter((r) => r.status === status);

  return NextResponse.json({ dispatchNotes: records });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!guardPermission(user, 'DISPATCH', 'CREATE')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const required = ['salesOrderNumber', 'customerName', 'customerAddress', 'warehouseCode', 'lines'];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === '') {
      return NextResponse.json({ error: `Field '${k}' is required.` }, { status: 400 });
    }
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'At least one line is required.' }, { status: 400 });
  }

  try {
    const rec = await createDispatchNote(body);

    if (rec.salesOrderNumber) {
      try {
        const allSOs = await loadSalesOrders();
        const targetSo = allSOs.find(s => s.salesOrderNumber === rec.salesOrderNumber);
        if (targetSo) {
          // A line's allocation can span multiple warehouses, each shipping on its own
          // dispatch note — so creating ONE note must never jump the order straight to
          // "ready for dispatch" if another warehouse's share still has no note at all.
          const dnsForOrder = (await loadDispatchNotes()).filter((d) => d.salesOrderNumber === targetSo.salesOrderNumber);
          const nextStatus = computeDispatchFulfillmentStatus(targetSo, dnsForOrder);
          if (nextStatus && nextStatus !== targetSo.status && canTransition('SALES_ORDER', targetSo.status, nextStatus)) {
            await updateSalesOrder(targetSo.id, { status: nextStatus });
          }
        }
      } catch (automationErr) {
        console.error('Failed to auto-update Sales Order status:', automationErr);
      }
    }


    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'DISPATCH_NOTE_CREATED',
      module: 'GOVERNANCE',
      targetId: rec.id,
      payloadJson: { dispatchNumber: rec.dispatchNumber, warehouseCode: rec.warehouseCode },
    }).catch(() => {});

    return NextResponse.json({ success: true, dispatchNote: rec });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
