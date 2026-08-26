import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateDispatchNote, DISPATCH_STATUS_FLOW, DispatchStatus } from '@/lib/dispatch-notes';
import { logAuditEvent } from '@/lib/audit';

// FR-DN-005..012 — status updates come from warehouse operators (own warehouse only).
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const patch: any = {};
  if (body.status) {
    if (!DISPATCH_STATUS_FLOW.includes(body.status) && !['DELIVERY_EXCEPTION', 'ON_HOLD', 'RETURNED', 'CANCELLED', 'PARTIALLY_DELIVERED'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
    }
    patch.status = body.status as DispatchStatus;
  }
  ['carrier', 'trackingNumber', 'expectedDeliveryDate', 'actualDeliveryDate', 'comments'].forEach((k) => {
    if (body[k] !== undefined) patch[k] = body[k];
  });
  if (body.dispatchQty !== undefined) patch.dispatchQty = Number(body.dispatchQty);
  if (body.dispatchDate !== undefined) patch.dispatchDate = body.dispatchDate;

  const rec = updateDispatchNote(params.id, patch);
  if (!rec) return NextResponse.json({ error: 'Dispatch note not found.' }, { status: 404 });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'DISPATCH_NOTE_UPDATED',
    module: 'WAREHOUSE_OPERATIONS',
    targetId: params.id,
    payloadJson: patch,
  }).catch(() => {});

  return NextResponse.json({ success: true, dispatchNote: rec });
}
