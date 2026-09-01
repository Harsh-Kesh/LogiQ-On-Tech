import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadVendorInvoices, createVendorInvoice, updateVendorInvoice, recordVendorPayment } from '@/lib/vendor-invoices';
import { loadPurchaseOrders, cascadePurchaseOrderByNumber } from '@/lib/purchase-orders';
import { hasPendingTransportCost } from '@/lib/transport-costs';
import { logAuditEvent } from '@/lib/audit';
import { FINANCE_ROLES, guardPermission, vendorOwnsRecord, isVendorApproved, resolveVendorIdForUser } from '@/lib/api-auth';
import { findTransitionPath, getAllowedTransitions } from '@/lib/lifecycle';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!guardPermission(user, 'VENDOR_INVOICING', 'READ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  let records = await loadVendorInvoices();
  if (status && status !== 'ALL') records = records.filter((r) => r.status === status);
  // VENDOR role: only see their own invoices
  if (user.role === 'VENDOR') {
    const sessionVendorId = await resolveVendorIdForUser(user);
    records = records.filter((r) => vendorOwnsRecord(user, r, sessionVendorId));
  }
  return NextResponse.json({ vendorInvoices: records });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!guardPermission(user, 'VENDOR_INVOICING', 'CREATE')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!(await isVendorApproved(user))) {
    return NextResponse.json({ error: 'Your vendor registration must be approved by the Platform Owner before you can submit invoices.' }, { status: 403 });
  }

  const body = await req.json();
  const required = ['vendorInvoiceNumber', 'linkedPoNumber', 'vendorName', 'invoiceAmount', 'dueDate'];
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `Field '${k}' is required.` }, { status: 400 });
  }

  const existing = await loadVendorInvoices();
  if (existing.some((v) => v.vendorInvoiceNumber === body.vendorInvoiceNumber)) {
    return NextResponse.json({ error: `Vendor invoice '${body.vendorInvoiceNumber}' already exists. Duplicate submissions are not allowed.` }, { status: 409 });
  }

  // A transport cost claim still awaiting owner approval would change this PO's total
  // out from under an invoice raised against it right now — block until it's resolved.
  if (await hasPendingTransportCost(body.linkedPoNumber)) {
    return NextResponse.json({
      error: `Purchase order '${body.linkedPoNumber}' has a transport cost claim awaiting owner approval. Wait for it to be approved (it will be added to the PO total) before invoicing.`,
    }, { status: 400 });
  }

  const linkedPo = (await loadPurchaseOrders()).find((p) => p.poNumber === body.linkedPoNumber);
  // A PO's items can ship across more than one warehouse on separate dispatches — the
  // PO isn't done, and its real transport cost isn't fully known, until every one of
  // them has actually gone out (status auto-tracks this from dispatch completion).
  const NOT_YET_FULLY_SUPPLIED = ['DRAFT', 'APPROVED', 'SENT_TO_VENDOR', 'VENDOR_CONFIRMED', 'PARTIALLY_SUPPLIED'];
  if (linkedPo && NOT_YET_FULLY_SUPPLIED.includes(linkedPo.status)) {
    return NextResponse.json({
      error: `Purchase order '${body.linkedPoNumber}' is not fully supplied yet (status: ${linkedPo.status.replace(/_/g, ' ')}) — some of its items haven't been dispatched. Invoicing has to wait until everything on this PO has actually shipped.`,
    }, { status: 400 });
  }

  const invoiceAmount = Number(body.invoiceAmount);
  let varianceVsPo: number | undefined = body.varianceVsPo ? Number(body.varianceVsPo) : undefined;
  if (varianceVsPo === undefined && linkedPo) {
    varianceVsPo = invoiceAmount - linkedPo.totalValue;
  }

  const rec = await createVendorInvoice({
    vendorInvoiceNumber: body.vendorInvoiceNumber,
    linkedPoNumber: body.linkedPoNumber,
    vendorName: body.vendorName,
    vendorId: body.vendorId,
    invoiceDate: body.invoiceDate || new Date().toISOString(),
    dueDate: body.dueDate,
    currency: (body.currency || 'AUD').toUpperCase(),
    invoiceAmount,
    varianceVsPo,
    attachment: body.attachment,
    createdBy: user.email || 'owner@logiqon.com',
    status: 'SUBMITTED',
  });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'VENDOR_INVOICE_REGISTERED',
    module: 'GOVERNANCE',
    targetId: rec.id,
    payloadJson: { vendorInvoiceNumber: rec.vendorInvoiceNumber, linkedPoNumber: rec.linkedPoNumber, invoiceAmount: rec.invoiceAmount },
  }).catch(() => {});

  // Registering the vendor's invoice against a PO is the real-world trigger for that
  // PO reaching "Vendor Invoice Received" — cascade it forward so the owner doesn't
  // have to separately click through the same status change by hand.
  const cascadedPo = await cascadePurchaseOrderByNumber(rec.linkedPoNumber, 'VENDOR_INVOICE_RECEIVED');
  if (cascadedPo) {
    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'PURCHASE_ORDER_STATUS_CASCADED',
      module: 'GOVERNANCE',
      targetId: cascadedPo.id,
      payloadJson: { poNumber: cascadedPo.poNumber, status: cascadedPo.status, reason: `Vendor invoice ${rec.vendorInvoiceNumber} registered` },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, vendorInvoice: rec });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!guardPermission(user, 'VENDOR_INVOICING', 'UPDATE')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'Invoice id required.' }, { status: 400 });

  // Support both status update and payment recording in one route.
  if (body.recordPayment) {
    if (!guardPermission(user, 'VENDOR_PAYMENTS', 'CREATE')) {
      return NextResponse.json({ error: 'Only Finance/Owner roles can record vendor payments.' }, { status: 403 });
    }
    if (!body.amountPaid || !body.paymentDate || !body.paymentMethod) {
      return NextResponse.json({ error: 'amountPaid, paymentDate, paymentMethod are required.' }, { status: 400 });
    }
    const rec = await recordVendorPayment(body.id, {
      paymentDate: body.paymentDate,
      amountPaid: Number(body.amountPaid),
      paymentMethod: body.paymentMethod,
      bankReferenceNumber: body.bankReferenceNumber || '',
      comments: body.comments,
      receiptAttachment: body.receiptAttachment || undefined,
      createdBy: user.email || 'owner@logiqon.com',
    });
    if (!rec) return NextResponse.json({ error: 'Vendor invoice not found.' }, { status: 404 });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'VENDOR_PAYMENT_RECORDED',
      module: 'GOVERNANCE',
      targetId: body.id,
      payloadJson: { amountPaid: body.amountPaid, method: body.paymentMethod, ref: body.bankReferenceNumber },
    }).catch(() => {});

    // A vendor payment settles the payable — cascade the linked PO to mirror the
    // invoice's new payment state, walking it through PAYMENT_PENDING first if it
    // hasn't reached that state yet. Once the invoice is fully PAID (not just
    // partially), the PO's own lifecycle is done — walk it one hop further, straight
    // through PAID to CLOSED, rather than leaving it sitting at PAID for the owner to
    // close by hand.
    if (rec.status === 'PARTIALLY_PAID' || rec.status === 'PAID') {
      const cascadeTarget = rec.status === 'PAID' ? 'CLOSED' : rec.status;
      const cascadedPo = await cascadePurchaseOrderByNumber(rec.linkedPoNumber, cascadeTarget);
      if (cascadedPo) {
        await logAuditEvent({
          userId: user.id,
          role: user.role,
          action: 'PURCHASE_ORDER_STATUS_CASCADED',
          module: 'GOVERNANCE',
          targetId: cascadedPo.id,
          payloadJson: { poNumber: cascadedPo.poNumber, status: cascadedPo.status, reason: `Vendor payment recorded on ${rec.vendorInvoiceNumber}` },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, vendorInvoice: rec });
  }

  const patch: any = {};
  if (body.status) {
    const current = (await loadVendorInvoices()).find((r) => r.id === body.id);
    if (!current) return NextResponse.json({ error: 'Vendor invoice not found.' }, { status: 404 });
    // The owner's Approve/Hold actions are offered as single buttons regardless of
    // whether the invoice is already at UNDER_REVIEW or still at SUBMITTED — walk any
    // intermediate lifecycle hop (e.g. SUBMITTED -> UNDER_REVIEW -> APPROVED) rather
    // than loosening the state machine to allow a direct jump.
    const path = findTransitionPath('VENDOR_INVOICE', current.status, body.status);
    if (!path) {
      return NextResponse.json({
        error: `Cannot transition from ${current.status} to ${body.status}. Allowed: ${getAllowedTransitions('VENDOR_INVOICE', current.status).join(', ')}`,
      }, { status: 400 });
    }
    for (const hop of path.slice(0, -1)) {
      await updateVendorInvoice(current.id, { status: hop as any });
    }
    patch.status = body.status;
  }
  ['dueDate', 'attachment', 'varianceVsPo'].forEach((k) => {
    if (body[k] !== undefined) patch[k] = body[k];
  });
  const rec = await updateVendorInvoice(body.id, patch);
  if (!rec) return NextResponse.json({ error: 'Vendor invoice not found.' }, { status: 404 });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'VENDOR_INVOICE_UPDATED',
    module: 'GOVERNANCE',
    targetId: body.id,
    payloadJson: patch,
  }).catch(() => {});

  return NextResponse.json({ success: true, vendorInvoice: rec });
}
