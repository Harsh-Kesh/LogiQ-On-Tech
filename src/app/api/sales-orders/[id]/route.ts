import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateSalesOrder, SalesOrderStatus } from '@/lib/sales-orders';
import { logAuditEvent } from '@/lib/audit';

const VALID_STATUSES: SalesOrderStatus[] = [
  'DRAFT', 'CONFIRMED', 'STOCK_CHECK', 'PARTIALLY_ALLOCATED', 'ALLOCATED',
  'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'INVOICED',
  'PARTIALLY_PAID', 'PAID', 'COMPLETED', 'CANCELLED',
];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['PLATFORM_OWNER', 'MDM'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const body = await req.json();
  const patch: any = {};
  if (body.status) {
    if (!VALID_STATUSES.includes(body.status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    patch.status = body.status;
  }
  ['customerName', 'customerPoReference', 'deliveryLocation', 'paymentTerms', 'requestedDeliveryDate'].forEach((k) => {
    if (body[k] !== undefined) patch[k] = body[k];
  });
  const rec = updateSalesOrder(params.id, patch);
  if (!rec) return NextResponse.json({ error: 'Sales order not found.' }, { status: 404 });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'SALES_ORDER_UPDATED',
    module: 'GOVERNANCE',
    targetId: params.id,
    payloadJson: patch,
  }).catch(() => {});

  return NextResponse.json({ success: true, salesOrder: rec });
}
