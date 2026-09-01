import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadSalesOrders, updateSalesOrder, computeDispatchFulfillmentStatus } from '@/lib/sales-orders';
import { loadPurchaseOrders } from '@/lib/purchase-orders';
import { loadDispatchNotes } from '@/lib/dispatch-notes';
import { logAuditEvent } from '@/lib/audit';
import { guardPermission } from '@/lib/api-auth';
import { canTransition, getAllowedTransitions } from '@/lib/lifecycle';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!guardPermission(user, 'SALES_ORDERS', 'UPDATE')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const body = await req.json();
  const patch: any = {};
  if (body.status) {
    const current = (await loadSalesOrders()).find((r) => r.id === params.id);
    if (!current) return NextResponse.json({ error: 'Sales order not found.' }, { status: 404 });
    if (!canTransition('SALES_ORDER', current.status, body.status)) {
      return NextResponse.json({
        error: `Cannot transition from ${current.status} to ${body.status}. Allowed: ${getAllowedTransitions('SALES_ORDER', current.status).join(', ')}`,
      }, { status: 400 });
    }

    // Dispatch completeness gate: an order sitting at PARTIALLY_DISPATCHED has at least
    // one warehouse's share of the allocation that either has no dispatch note yet or
    // whose note hasn't actually shipped. Manually forcing it past that point (e.g. the
    // remainder genuinely can't be fulfilled — insufficient stock, discontinued line)
    // is allowed, but only with a stated reason, so there's always a record of why an
    // order moved on without every warehouse actually dispatching.
    if (current.status === 'PARTIALLY_DISPATCHED' && ['READY_FOR_DISPATCH', 'DISPATCHED'].includes(body.status)) {
      const stillIncomplete = computeDispatchFulfillmentStatus(
        current,
        (await loadDispatchNotes()).filter((d) => d.salesOrderNumber === current.salesOrderNumber)
      ) === 'PARTIALLY_DISPATCHED';
      if (stillIncomplete && !String(body.overrideReason || '').trim()) {
        return NextResponse.json({
          error: 'Not every warehouse has dispatched its allocated share yet. Provide a reason (e.g. insufficient stock) to move this order forward anyway.',
        }, { status: 400 });
      }
      if (stillIncomplete) {
        const stamp = `[${new Date().toLocaleString('en-AU')}] Advanced past incomplete dispatch by ${user.email || user.role}: ${body.overrideReason.trim()}`;
        patch.internalNotes = current.internalNotes ? `${current.internalNotes}\n${stamp}` : stamp;
      }
    }

    // Closure gate: the transaction only closes once the customer receivable is
    // settled (already enforced — PAID is a prerequisite for this transition) AND
    // every vendor payable tied to this sale is settled too.
    if (body.status === 'COMPLETED') {
      const unsettledPOs = (await loadPurchaseOrders()).filter(
        (p) => p.linkedSalesOrderNumber === current.salesOrderNumber && !['CLOSED', 'CANCELLED'].includes(p.status)
      );
      if (unsettledPOs.length > 0) {
        return NextResponse.json({
          error: `Cannot complete ${current.salesOrderNumber}: linked purchase order(s) ${unsettledPOs.map((p) => `${p.poNumber} (${p.status})`).join(', ')} must reach Closed first.`,
        }, { status: 400 });
      }
    }

    patch.status = body.status;
  }
  ['customerName', 'customerPoReference', 'deliveryLocation', 'paymentTerms', 'requestedDeliveryDate'].forEach((k) => {
    if (body[k] !== undefined) patch[k] = body[k];
  });
  const rec = await updateSalesOrder(params.id, patch);
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
