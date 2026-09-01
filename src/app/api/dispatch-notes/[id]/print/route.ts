import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadDispatchNotes } from '@/lib/dispatch-notes';
import { guardPermission } from '@/lib/api-auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!guardPermission(user, 'DISPATCH', 'READ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const dn = (await loadDispatchNotes()).find((d) => d.id === params.id);
  if (!dn) return NextResponse.json({ error: 'Dispatch note not found.' }, { status: 404 });

  const linesHtml = (dn.lines || []).map((l, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-weight:700;">${l.itemCode}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${l.itemName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${l.orderedQty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">${l.dispatchQty}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dispatch Note ${dn.dispatchNumber}</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none !important; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a202c; max-width: 800px; margin: 0 auto; padding: 40px 30px; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1a202c; }
    .logo { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .logo span { color: #4f46e5; }
    .doc-title { font-size: 20px; font-weight: 800; text-align: right; }
    .doc-number { font-family: monospace; font-size: 16px; color: #4f46e5; font-weight: 700; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .meta-box { padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: 700; margin-bottom: 6px; }
    .meta-value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #e0e7ff; color: #3730a3; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
    .sig-line { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sig-box { border-top: 1px solid #1a202c; padding-top: 8px; font-size: 11px; color: #475569; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 24px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; z-index: 100; }
    .print-btn:hover { background: #4338ca; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

  <div class="header">
    <div>
      <div class="logo">LogiQ-On <span>Tech</span></div>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">Supply Chain & Warehouse Technology</div>
    </div>
    <div style="text-align:right;">
      <div class="doc-title">DISPATCH NOTE</div>
      <div class="doc-number">${dn.dispatchNumber}</div>
      <div style="margin-top:4px;"><span class="status">${dn.status.replace(/_/g, ' ')}</span></div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-label">Ship To — Customer</div>
      <div class="meta-value">${dn.customerName}</div>
      <div style="font-size:12px;color:#475569;margin-top:4px;">${dn.customerAddress}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Ship From — Warehouse</div>
      <div class="meta-value">${dn.warehouseName || dn.warehouseCode}</div>
      <div style="font-size:12px;color:#475569;margin-top:4px;">Code: ${dn.warehouseCode}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Sales Order Reference</div>
      <div class="meta-value" style="font-family:monospace;">${dn.salesOrderNumber}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Dispatch Details</div>
      <div style="font-size:12px;">
        ${dn.dispatchDate ? `<div><strong>Dispatch Date:</strong> ${new Date(dn.dispatchDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>` : ''}
        ${dn.carrier ? `<div><strong>Carrier:</strong> ${dn.carrier}</div>` : ''}
        ${dn.expectedDeliveryDate ? `<div><strong>Expected Delivery:</strong> ${new Date(dn.expectedDeliveryDate).toLocaleDateString('en-AU')}</div>` : ''}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th>Item Code</th>
        <th>Description</th>
        <th style="text-align:right;">Ordered</th>
        <th style="text-align:right;">Dispatched</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#94a3b8;">No line items</td></tr>'}
    </tbody>
  </table>

  ${dn.comments ? `<div style="margin:20px 0;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:12px;"><strong>Instructions / Comments:</strong> ${dn.comments}</div>` : ''}

  <div class="sig-line">
    <div class="sig-box">Dispatched By (Warehouse) — Name / Signature / Date</div>
    <div class="sig-box">Received By (Customer) — Name / Signature / Date</div>
  </div>

  <div class="footer">
    <div>Document: ${dn.dispatchNumber} | Created: ${new Date(dn.createdAt).toLocaleDateString('en-AU')}</div>
    <div>LogiQ-On Tech — Confidential</div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
