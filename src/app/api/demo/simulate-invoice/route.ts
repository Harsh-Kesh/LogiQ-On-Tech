// Demo-only endpoint: simulates a supplier emailing a PDF invoice.
// Creates a SupplierInvoice record and triggers the 3-way match engine,
// letting you demonstrate the full pipeline without real IMAP or a PDF.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { runThreeWayMatch } from '@/lib/three-way-match';
import { computeSupplierPoTotal } from '@/lib/po-total';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { storefrontOrderId } = await req.json();
  if (!storefrontOrderId) {
    return NextResponse.json({ error: 'storefrontOrderId required' }, { status: 400 });
  }

  const sfOrder = await prisma.storefrontOrder.findUniqueOrThrow({
    where: { id: storefrontOrderId },
    include: { items: true },
  });

  if (sfOrder.status !== 'PO_SENT') {
    return NextResponse.json(
      { error: `Order must be in PO_SENT status to simulate an invoice (current: ${sfOrder.status})` },
      { status: 422 }
    );
  }

  const firstSku = sfOrder.items[0]?.itemCode;
  const itemMaster = firstSku
    ? await prisma.itemMaster.findFirst({ where: { sku: firstSku }, include: { vendor: true } })
    : null;
  const vendor = itemMaster?.vendor;
  const vendorName = vendor?.companyName || 'Demo Supplier';

  // Invoice amount = what the supplier actually bills us (cost price), never the
  // customer-facing selling price — this is what the 3-way match checks against.
  const po = await computeSupplierPoTotal(
    sfOrder.items.map((i) => ({ itemCode: i.itemCode, quantity: i.quantity, taxPercent: i.taxPercent }))
  );
  const allMasters = await prisma.itemMaster.findMany({ where: { sku: { in: sfOrder.items.map((i) => i.itemCode) } } });
  const costBySku = new Map(allMasters.map((m) => [m.sku, Number(m.costPrice)]));

  const invoiceNumber = `DEMO-INV-${Date.now()}`;
  const invoiceDate = new Date();

  // Create a simulated supplier invoice that exactly matches the PO total
  const suppInvoice = await prisma.supplierInvoice.create({
    data: {
      vendorInvoiceNumber: invoiceNumber,
      invoiceDate,
      dueDate: new Date(Date.now() + 30 * 86_400_000),
      vendorName,
      linkedPoNumber: sfOrder.myobPoNumber || sfOrder.orderNumber,
      currency: 'AUD',
      invoiceAmount: po.total,
      status: 'SUBMITTED',
    },
  });

  // Advance order status to INVOICE_RECEIVED
  await prisma.storefrontOrder.update({
    where: { id: storefrontOrderId },
    data: {
      status: 'INVOICE_RECEIVED',
      supplierInvoiceReceivedAt: new Date(),
    },
  });

  // Log a simulated INCOMING email so the invoice is visible in the Email Inbox
  // alongside everything we send — mode: 'received' marks the direction.
  const invoiceLineRows = sfOrder.items
    .map((item) => {
      const unitCost = costBySku.get(item.itemCode) ?? 0;
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9">${item.itemName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:center">${item.quantity}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:right">AUD ${unitCost.toFixed(2)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:right">AUD ${(unitCost * item.quantity).toFixed(2)}</td>
      </tr>`;
    })
    .join('');

  await prisma.emailLog.create({
    data: {
      to: 'accounts@logiqon.tech',
      subject: `Invoice ${invoiceNumber} from ${vendorName} — ${sfOrder.myobPoNumber || sfOrder.orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
          <div style="background:#334155;padding:20px 28px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:18px">Tax Invoice — ${invoiceNumber}</h1>
            <p style="color:#cbd5e1;margin:4px 0 0;font-size:13px">From ${vendorName}</p>
          </div>
          <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 16px;font-size:13px;color:#64748b">Billed to: LogiQ-On Technology Group Pty Ltd</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tr style="background:#f8fafc">
                <td style="padding:6px 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">PO Reference</td>
                <td style="padding:6px 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">Invoice Date</td>
              </tr>
              <tr>
                <td style="padding:6px 10px;font-weight:700">${sfOrder.myobPoNumber || sfOrder.orderNumber}</td>
                <td style="padding:6px 10px">${invoiceDate.toLocaleDateString('en-AU')}</td>
              </tr>
            </table>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <thead><tr style="background:#f8fafc">
                <th style="padding:6px 10px;text-align:left;font-size:12px;color:#64748b">Item</th>
                <th style="padding:6px 10px;text-align:center;font-size:12px;color:#64748b">Qty</th>
                <th style="padding:6px 10px;text-align:right;font-size:12px;color:#64748b">Unit Cost</th>
                <th style="padding:6px 10px;text-align:right;font-size:12px;color:#64748b">Line Total</th>
              </tr></thead>
              <tbody>${invoiceLineRows}</tbody>
            </table>
            <p style="text-align:right;margin:0 0 4px;font-size:13px;color:#64748b">Subtotal: AUD ${po.subtotal.toFixed(2)}</p>
            <p style="text-align:right;margin:0 0 4px;font-size:13px;color:#64748b">GST: AUD ${po.taxTotal.toFixed(2)}</p>
            <p style="text-align:right;margin:0;font-size:16px;font-weight:700">Total Due: AUD ${po.total.toFixed(2)}</p>
            <p style="margin-top:20px;font-size:12px;color:#94a3b8">Payment terms: 30 days from invoice date.</p>
          </div>
        </div>`,
      mode: 'received',
      orderId: storefrontOrderId,
    },
  }).catch((err) => console.warn('[simulate-invoice] received email log failed:', err));

  // Run 3-way match immediately
  const matchResult = await runThreeWayMatch(storefrontOrderId, suppInvoice.id);

  return NextResponse.json({
    success: true,
    invoiceId: suppInvoice.id,
    invoiceNumber: suppInvoice.vendorInvoiceNumber,
    matched: matchResult.matched,
    variance: matchResult.variance,
    notes: matchResult.notes,
  });
}
