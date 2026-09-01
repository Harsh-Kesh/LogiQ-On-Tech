import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadTransportCosts, createTransportCost, deriveRelatedPosAndWeights, isDnAlreadyClaimed } from '@/lib/transport-costs';
import { loadPurchaseOrders } from '@/lib/purchase-orders';
import { loadDispatchNotes } from '@/lib/dispatch-notes';
import { guardPermission, vendorOwnsRecord, isVendorApproved, resolveVendorIdForUser } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';

// A dispatch note must have actually left the warehouse before its freight can be
// claimed — there's no real cost to record for something still sitting in picking.
const SHIPPED_STATUSES = ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'PARTIALLY_DELIVERED'];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!guardPermission(user, 'PURCHASE_ORDERS', 'READ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let records = await loadTransportCosts();
  if (user.role === 'VENDOR') {
    const sessionVendorId = await resolveVendorIdForUser(user);
    records = records.filter((r) => vendorOwnsRecord(user, r, sessionVendorId));
  }
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json({ transportCosts: records });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Only vendors can submit transport cost claims.' }, { status: 403 });
  }
  if (!(await isVendorApproved(user))) {
    return NextResponse.json({ error: 'Your vendor registration must be approved by the Platform Owner before you can submit transport cost claims.' }, { status: 403 });
  }

  const body = await req.json();
  const { trackingNumber, totalCost, relatedDnNumbers, notes } = body;

  if (!trackingNumber || !String(trackingNumber).trim()) {
    return NextResponse.json({ error: 'Tracking / consignment number is required.' }, { status: 400 });
  }
  const cost = Number(totalCost);
  if (!cost || cost <= 0) {
    return NextResponse.json({ error: 'A positive transport cost amount is required.' }, { status: 400 });
  }
  const dnNumbers: string[] = Array.isArray(relatedDnNumbers) ? relatedDnNumbers : [];
  if (dnNumbers.length === 0) {
    return NextResponse.json({ error: 'Select at least one dispatch note this shipment covers.' }, { status: 400 });
  }

  const allPos = await loadPurchaseOrders();
  const mySessionVendorId = await resolveVendorIdForUser(user);
  const myPos = allPos.filter((p) => vendorOwnsRecord(user, p, mySessionVendorId));
  const myPoNumbers = new Set(myPos.map((p) => p.poNumber));
  const myLinkedSoNumbers = new Set(myPos.map((p) => p.linkedSalesOrderNumber).filter(Boolean));
  // The claim is filed under whichever real vendor name is actually on the PO records
  // matched above — not the session's display name, which isn't the legal entity name.
  const vendorName = myPos[0]?.vendorName || user.name || '';

  const allDns = await loadDispatchNotes();
  const selectedDns: any[] = [];
  for (const dnNum of dnNumbers) {
    const dn = allDns.find((d) => d.dispatchNumber === dnNum);
    if (!dn || !myLinkedSoNumbers.has(dn.salesOrderNumber)) {
      return NextResponse.json({ error: `Dispatch note '${dnNum}' is not linked to one of your purchase orders.` }, { status: 403 });
    }
    if (!SHIPPED_STATUSES.includes(dn.status)) {
      return NextResponse.json({ error: `Dispatch note '${dnNum}' hasn't been dispatched yet — nothing to claim freight for.` }, { status: 400 });
    }
    if (await isDnAlreadyClaimed(dnNum)) {
      return NextResponse.json({ error: `Dispatch note '${dnNum}' is already on another transport cost claim.` }, { status: 400 });
    }
    selectedDns.push(dn);
  }

  // Everything on one claim physically left the same place at the same time — dispatch
  // notes from different warehouses can never be one shipment.
  const warehouseCodes = new Set(selectedDns.map((d) => d.warehouseCode));
  if (warehouseCodes.size > 1) {
    return NextResponse.json({
      error: `Selected dispatch notes are from different warehouses (${Array.from(warehouseCodes).join(', ')}) — a claim can only cover dispatches that shipped together from one warehouse.`,
    }, { status: 400 });
  }
  const warehouseCode = selectedDns[0].warehouseCode;
  const warehouseName = selectedDns[0].warehouseName;

  const poWeights = deriveRelatedPosAndWeights(selectedDns, myPos as any);
  if (poWeights.length === 0) {
    return NextResponse.json({ error: "Couldn't match the selected dispatch notes to any of your purchase orders." }, { status: 400 });
  }

  const rec = await createTransportCost({
    trackingNumber: String(trackingNumber).trim(),
    warehouseCode,
    warehouseName,
    totalCost: cost,
    currency: myPos[0]?.currency || 'AUD',
    vendorName,
    vendorId: user.id,
    relatedDnNumbers: dnNumbers,
    poWeights,
    notes: notes ? String(notes).trim() : undefined,
    createdBy: user.email || vendorName,
  });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'TRANSPORT_COST_SUBMITTED',
    module: 'GOVERNANCE',
    targetId: rec.id,
    payloadJson: { transportCostNumber: rec.transportCostNumber, totalCost: rec.totalCost, warehouseCode, relatedPoNumbers: rec.relatedPoNumbers, relatedDnNumbers: rec.relatedDnNumbers },
  }).catch(() => {});

  return NextResponse.json({ success: true, transportCost: rec });
}
