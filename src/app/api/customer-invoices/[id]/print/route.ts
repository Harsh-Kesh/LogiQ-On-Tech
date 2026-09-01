import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadCustomerInvoices, updateCustomerInvoice } from '@/lib/customer-invoices';
import { guardPermission } from '@/lib/api-auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!guardPermission(user, 'CUSTOMER_INVOICING', 'READ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const invoice = (await loadCustomerInvoices()).find((c) => c.id === params.id || c.invoiceNumber === params.id);
  if (!invoice) return NextResponse.json({ error: 'Customer invoice not found.' }, { status: 404 });

  // Auto-track viewed status if currently SENT
  if (invoice.status === 'SENT') {
    await updateCustomerInvoice(invoice.id, {
      status: 'VIEWED',
      viewedAt: new Date().toISOString(),
    });
    invoice.status = 'VIEWED';
  }

  const linesHtml = (invoice.lines || []).map((l, i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-weight:700;color:#0f172a;">${l.itemCode}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${l.itemName}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${l.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">${invoice.currency} ${(l.unitPrice || 0).toFixed(2)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b;">${l.taxPercent || 10}%</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;font-family:monospace;color:#0f172a;">${invoice.currency} ${(l.lineTotal || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const statusColors: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: '#f1f5f9', text: '#475569' },
    APPROVED: { bg: '#e0e7ff', text: '#3730a3' },
    SENT: { bg: '#e0f2fe', text: '#0369a1' },
    VIEWED: { bg: '#fef3c7', text: '#92400e' },
    OVERDUE: { bg: '#ffe4e6', text: '#9f1239' },
    PARTIALLY_PAID: { bg: '#fef9c3', text: '#854d0e' },
    PAID: { bg: '#dcfce7', text: '#166534' },
    VOID: { bg: '#f3f4f6', text: '#9ca3af' },
  };

  const currentTheme = statusColors[invoice.status] || { bg: '#f1f5f9', text: '#475569' };
  const balanceOutstanding = Math.max(0, invoice.totalValue - (invoice.amountPaid || 0));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice ${invoice.invoiceNumber} — LogiQ-On Tech</title>
  <style>
    @media print {
      body { margin: 0; padding: 15px; }
      .no-print { display: none !important; }
      @page { size: A4; margin: 15mm; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      max-width: 840px;
      margin: 0 auto;
      padding: 40px 30px;
      font-size: 13px;
      line-height: 1.5;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0f172a;
    }
    .logo {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .logo span { color: #4f46e5; }
    .doc-title {
      font-size: 22px;
      font-weight: 900;
      text-align: right;
      letter-spacing: -0.5px;
    }
    .doc-number {
      font-family: monospace;
      font-size: 16px;
      color: #4f46e5;
      font-weight: 800;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .meta-box {
      padding: 14px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .meta-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .meta-value { font-weight: 700; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th {
      background: #f1f5f9;
      padding: 10px 12px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #475569;
      font-weight: 800;
      border-bottom: 2px solid #cbd5e1;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: ${currentTheme.bg};
      color: ${currentTheme.text};
    }
    .totals-container {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
      margin-bottom: 28px;
    }
    .totals-box {
      width: 320px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
    }
    .totals-row.grand {
      border-top: 2px solid #0f172a;
      margin-top: 8px;
      padding-top: 8px;
      font-size: 15px;
      font-weight: 900;
    }
    .remittance-card {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-radius: 8px;
      padding: 16px;
      margin-top: 24px;
    }
    .remittance-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b21a8;
      margin-bottom: 8px;
    }
    .remittance-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      font-size: 11px;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 22px;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn:hover { background: #4338ca; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">
    🖨️ Print / Save as PDF
  </button>

  <div class="header">
    <div>
      <div class="logo">LogiQ-On <span>Tech</span></div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">Enterprise Supply Chain & Logistics Platforms</div>
      <div style="font-size:11px;color:#475569;margin-top:2px;"><strong>ABN:</strong> 45 992 108 340 · Sydney NSW 2000</div>
      <div style="font-size:11px;color:#475569;"><strong>Email:</strong> billing@logiqon.com · <strong>Web:</strong> tech.logiqon.com</div>
    </div>
    <div style="text-align:right;">
      <div class="doc-title">TAX INVOICE</div>
      <div class="doc-number">${invoice.invoiceNumber}</div>
      <div style="margin-top:6px;"><span class="status-badge">${invoice.status.replace(/_/g, ' ')}</span></div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-label">Billed To (Customer)</div>
      <div class="meta-value">${invoice.customerName}</div>
      <div style="font-size:12px;color:#475569;margin-top:3px;">${invoice.billingAddress || 'Standard Commercial Billing Facility'}</div>
      ${invoice.customerEmail ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">Contact: ${invoice.customerEmail}</div>` : ''}
    </div>
    <div class="meta-box">
      <div class="meta-label">Invoice Details</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
        <div><strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div><strong>Sales Order:</strong> <span style="font-family:monospace;font-weight:700;">${invoice.salesOrderNumber}</span></div>
        <div><strong>Dispatch Ref:</strong> <span style="font-family:monospace;">${invoice.dispatchNumber || 'N/A'}</span></div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px;">#</th>
        <th style="width:130px;">Item Code</th>
        <th>Description</th>
        <th style="text-align:right;width:60px;">Qty</th>
        <th style="text-align:right;width:95px;">Unit Price</th>
        <th style="text-align:right;width:60px;">Tax</th>
        <th style="text-align:right;width:110px;">Total (${invoice.currency})</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml}
    </tbody>
  </table>

  <div class="totals-container">
    <div class="totals-box">
      <div class="totals-row">
        <span style="color:#64748b;">Subtotal (excl. Tax):</span>
        <span style="font-family:monospace;font-weight:600;">${invoice.currency} ${(invoice.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row">
        <span style="color:#64748b;">GST / Tax (10%):</span>
        <span style="font-family:monospace;font-weight:600;">${invoice.currency} ${(invoice.taxTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row grand">
        <span>Total Invoice Amount:</span>
        <span style="font-family:monospace;color:#4f46e5;">${invoice.currency} ${(invoice.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row" style="margin-top:6px;border-top:1px dashed #cbd5e1;padding-top:6px;">
        <span style="color:#166534;font-weight:600;">Amount Paid to Date:</span>
        <span style="font-family:monospace;color:#166534;font-weight:700;">${invoice.currency} ${(invoice.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row" style="font-weight:800;color:${balanceOutstanding > 0 ? '#991b1b' : '#166534'};">
        <span>Balance Outstanding:</span>
        <span style="font-family:monospace;">${invoice.currency} ${balanceOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  </div>

  <div class="remittance-card">
    <div class="remittance-title">Electronic Funds Transfer (EFT) Remittance Advice</div>
    <div class="remittance-grid">
      <div><strong>Bank Name:</strong> National Australia Bank (NAB)</div>
      <div><strong>BSB Number:</strong> 083-004</div>
      <div><strong>Account Number:</strong> 4892-1084</div>
      <div><strong>Account Name:</strong> LogiQ-On Technology Pty Ltd</div>
      <div><strong>Payment Reference:</strong> <span style="font-family:monospace;color:#6b21a8;font-weight:800;">${invoice.invoiceNumber}</span></div>
      <div><strong>Payment Terms:</strong> Net 30 Days</div>
    </div>
  </div>

  <div style="margin-top:30px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#64748b;">
    <div>Generated by LogiQ-On Tech Invoicing System on ${new Date().toLocaleDateString('en-AU')}</div>
    <div>Page 1 of 1 · Commercial Tax Document</div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
