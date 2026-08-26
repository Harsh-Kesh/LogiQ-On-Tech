import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updatePurchaseOrder, PurchaseOrderStatus } from '@/lib/purchase-orders';
import { logAuditEvent } from '@/lib/audit';
import { COMMERCIAL_ROLES, isRoleIn } from '@/lib/api-auth';

const VALID: PurchaseOrderStatus[] = [
  'DRAFT', 'APPROVED', 'SENT_TO_VENDOR', 'VENDOR_CONFIRMED', 'PARTIALLY_SUPPLIED',
  'RECEIVED', 'VENDOR_INVOICE_RECEIVED', 'PAYMENT_PENDING', 'PARTIALLY_PAID',
  'PAID', 'CLOSED', 'CANCELLED',
];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!isRoleIn(user, COMMERCIAL_ROLES)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const body = await req.json();
  const patch: any = {};
  if (body.status) {
    if (!VALID.includes(body.status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    patch.status = body.status;
  }
  ['notes', 'requestedDeliveryDate', 'paymentTerms'].forEach((k) => {
    if (body[k] !== undefined) patch[k] = body[k];
  });

  const rec = updatePurchaseOrder(params.id, patch);
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
