import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPurchaseOrders, updatePurchaseOrder } from '@/lib/purchase-orders';
import { logAuditEvent } from '@/lib/audit';
import { guardPermission, isVendorApproved } from '@/lib/api-auth';
import { canTransition, getAllowedTransitions } from '@/lib/lifecycle';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!guardPermission(user, 'PURCHASE_ORDERS', 'UPDATE')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!(await isVendorApproved(user))) {
    return NextResponse.json({ error: 'Your vendor registration must be approved by the Platform Owner before you can act on purchase orders.' }, { status: 403 });
  }
  const body = await req.json();
  const patch: any = {};
  if (body.status) {
    const current = (await loadPurchaseOrders()).find((r) => r.id === params.id);
    if (!current) return NextResponse.json({ error: 'PO not found.' }, { status: 404 });
    // Supply progress (Partially Supplied / Fully Supplied) is derived automatically from
    // dispatch activity against the linked sales order, not self-declared — a vendor's
    // stock already sits in the warehouse, so no one "receives" it per PO.
    if (user.role === 'VENDOR' && ['PARTIALLY_SUPPLIED', 'FULLY_SUPPLIED'].includes(body.status)) {
      return NextResponse.json({ error: 'Supply status updates automatically once the linked sales order is dispatched. It cannot be set manually.' }, { status: 403 });
    }
    if (!canTransition('PURCHASE_ORDER', current.status, body.status)) {
      return NextResponse.json({
        error: `Cannot transition from ${current.status} to ${body.status}. Allowed: ${getAllowedTransitions('PURCHASE_ORDER', current.status).join(', ')}`,
      }, { status: 400 });
    }
    patch.status = body.status;
  }
  ['notes', 'requestedDeliveryDate', 'paymentTerms'].forEach((k) => {
    if (body[k] !== undefined) patch[k] = body[k];
  });

  const rec = await updatePurchaseOrder(params.id, patch);
  if (!rec) return NextResponse.json({ error: 'PO not found.' }, { status: 404 });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'PURCHASE_ORDER_UPDATED',
    module: 'GOVERNANCE',
    targetId: params.id,
    payloadJson: patch,
  }).catch(() => {});

  return NextResponse.json({ success: true, purchaseOrder: rec });
}
