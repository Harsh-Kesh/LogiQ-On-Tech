import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadTransportCosts, approveTransportCost, rejectTransportCost } from '@/lib/transport-costs';
import { loadDispatchNotes } from '@/lib/dispatch-notes';
import { logAuditEvent } from '@/lib/audit';

// Only the Platform Owner can approve or reject a transport cost claim — approval is
// the gate that lets the claimed amount actually land on the PO totals, so it can't be
// self-served by the vendor who submitted the claim.
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Only the Platform Owner can approve or reject transport cost claims.' }, { status: 403 });
  }

  const body = await req.json();
  const current = (await loadTransportCosts()).find((r) => r.id === params.id);
  if (!current) return NextResponse.json({ error: 'Transport cost claim not found.' }, { status: 404 });
  if (current.status !== 'PENDING_APPROVAL') {
    return NextResponse.json({ error: `This claim is already ${current.status.replace(/_/g, ' ').toLowerCase()}.` }, { status: 400 });
  }

  if (body.action === 'APPROVE') {
    // If a dispatch this claim covers has since been cancelled, the shipment it
    // describes may no longer be real — don't silently fold its cost onto a PO total.
    const allDns = await loadDispatchNotes();
    const cancelledDn = current.relatedDnNumbers.find((dnNum) => allDns.find((d) => d.dispatchNumber === dnNum)?.status === 'CANCELLED');
    if (cancelledDn) {
      return NextResponse.json({
        error: `Dispatch note '${cancelledDn}' on this claim has since been cancelled. Reject this claim and ask the vendor to resubmit for what actually shipped.`,
      }, { status: 400 });
    }

    const rec = await approveTransportCost(params.id, user.email || 'owner@logiqon.com');
    if (!rec) return NextResponse.json({ error: 'Failed to approve transport cost claim.' }, { status: 500 });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'TRANSPORT_COST_APPROVED',
      module: 'GOVERNANCE',
      targetId: rec.id,
      payloadJson: { transportCostNumber: rec.transportCostNumber, allocations: rec.allocations },
    }).catch(() => {});

    return NextResponse.json({ success: true, transportCost: rec });
  }

  if (body.action === 'REJECT') {
    const rec = await rejectTransportCost(params.id, user.email || 'owner@logiqon.com', body.reason);
    if (!rec) return NextResponse.json({ error: 'Failed to reject transport cost claim.' }, { status: 500 });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'TRANSPORT_COST_REJECTED',
      module: 'GOVERNANCE',
      targetId: rec.id,
      payloadJson: { transportCostNumber: rec.transportCostNumber, reason: body.reason },
    }).catch(() => {});

    return NextResponse.json({ success: true, transportCost: rec });
  }

  return NextResponse.json({ error: "Body must include action: 'APPROVE' or 'REJECT'." }, { status: 400 });
}
