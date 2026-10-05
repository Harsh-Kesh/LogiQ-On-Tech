import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

// ── Shared email design system ────────────────────────────────────────────────
// One visual language for every outbound email — the same brand gradient, card
// shell, and typography used across the dashboard, instead of each route hand-
// rolling its own one-off <div> with a different header colour. Build an email's
// body with the helpers below (emailCallout, emailInfoTable, emailItemsTable,
// emailButton) and wrap the result in renderEmailShell().

const BRAND_GRADIENT = 'linear-gradient(90deg, #4C3AE3 0%, #06B6D4 100%)';
const INK = '#0f172a';
const MUTED = '#64748b';
const FAINT = '#94a3b8';
const BORDER = '#e5e3fb';

export type EmailTone = 'brand' | 'success' | 'warning' | 'danger';

const TONE_COLORS: Record<EmailTone, { color: string; bg: string; border: string }> = {
  brand:   { color: '#4C3AE3', bg: '#EEF0FE', border: '#D9D4FB' },
  success: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  warning: { color: '#854d0e', bg: '#fefce8', border: '#fde68a' },
  danger:  { color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
};

/** A tinted callout box — the one way every email flags a highlight, warning, or next step. */
export function emailCallout(html: string, tone: EmailTone = 'brand'): string {
  const t = TONE_COLORS[tone];
  return `<div style="background:${t.bg};border:1px solid ${t.border};border-radius:10px;padding:14px 18px;margin:16px 0;color:${t.color};font-size:13.5px;line-height:1.5">${html}</div>`;
}

/** A compact label/value grid — order #, dates, references — used the same way in every email. */
export function emailInfoTable(pairs: Array<{ label: string; value: string; accent?: boolean }>): string {
  const rows = pairs
    .map(
      (p, i) => `<tr style="${i % 2 === 1 ? 'background:#fafafa' : ''}">
        <td style="padding:7px 12px;font-size:11px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap">${p.label}</td>
        <td style="padding:7px 12px;font-size:13.5px;font-weight:600;color:${p.accent ? '#4C3AE3' : INK}">${p.value}</td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #f1f5f9;border-radius:10px;overflow:hidden;margin:16px 0">${rows}</table>`;
}

/** The line-items table every order/invoice/PO email needs, styled once instead of per route. */
export function emailItemsTable(
  rows: Array<{ label: string; sublabel?: string; qty?: number; unitPrice?: number; lineTotal: number }>,
  currency: string,
  opts?: { totals?: Array<{ label: string; value: string; strong?: boolean }> }
): string {
  const body = rows
    .map(
      (r) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">
          <div style="font-weight:600;color:${INK}">${r.label}</div>
          ${r.sublabel ? `<div style="font-size:11.5px;color:${FAINT}">${r.sublabel}</div>` : ''}
        </td>
        ${r.qty !== undefined ? `<td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:${MUTED}">${r.qty}</td>` : ''}
        ${r.unitPrice !== undefined ? `<td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:${MUTED}">${currency} ${r.unitPrice.toFixed(2)}</td>` : ''}
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:${INK}">${currency} ${r.lineTotal.toFixed(2)}</td>
      </tr>`
    )
    .join('');
  const totalsRows = (opts?.totals || [])
    .map(
      (t) => `<tr>
        <td colspan="${3}" style="padding:6px 12px;text-align:right;font-size:13px;color:${t.strong ? INK : MUTED};font-weight:${t.strong ? 700 : 400}">${t.label}</td>
        <td style="padding:6px 12px;text-align:right;font-size:13px;color:${t.strong ? INK : MUTED};font-weight:${t.strong ? 700 : 400}">${t.value}</td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;font-size:13.5px">
    <thead><tr>
      <th style="padding:0 12px 8px;text-align:left;font-size:11px;font-weight:700;color:${FAINT};text-transform:uppercase;letter-spacing:0.04em;border-bottom:2px solid ${BORDER}">Item</th>
      <th style="padding:0 12px 8px;text-align:center;font-size:11px;font-weight:700;color:${FAINT};text-transform:uppercase;letter-spacing:0.04em;border-bottom:2px solid ${BORDER}">Qty</th>
      <th style="padding:0 12px 8px;text-align:right;font-size:11px;font-weight:700;color:${FAINT};text-transform:uppercase;letter-spacing:0.04em;border-bottom:2px solid ${BORDER}">Unit</th>
      <th style="padding:0 12px 8px;text-align:right;font-size:11px;font-weight:700;color:${FAINT};text-transform:uppercase;letter-spacing:0.04em;border-bottom:2px solid ${BORDER}">Total</th>
    </tr></thead>
    <tbody>${body}</tbody>
    ${totalsRows ? `<tfoot>${totalsRows}</tfoot>` : ''}
  </table>`;
}

/** A branded CTA button, with a plain-text link underneath for clients that strip styles. */
export function emailButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0">
      <tr><td style="border-radius:10px;background:${BRAND_GRADIENT}">
        <a href="${url}" style="display:inline-block;padding:11px 24px;font-size:13.5px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">${label}</a>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:11.5px;color:${FAINT}">Or open this link: <a href="${url}" style="color:#4C3AE3">${url}</a></p>`;
}

/**
 * The one shell every outbound email renders through — brand gradient strip, a
 * heading (tone-coloured for alerts), the caller's body HTML, and a standard footer.
 */
export function renderEmailShell(opts: {
  eyebrow?: string;       // small uppercase label top-right, e.g. "Order Confirmation"
  heading: string;
  subheading?: string;
  tone?: EmailTone;       // colours the heading — 'danger' for a rejection, 'warning' for an alert, etc.
  bodyHtml: string;
  footerNote?: string;
}): string {
  const tone = opts.tone || 'brand';
  const headingColor = tone === 'brand' ? INK : TONE_COLORS[tone].color;
  return `
    <div style="background:#f4f3fe;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER}">
        <div style="height:4px;background:${BRAND_GRADIENT}"></div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 32px 4px">
          <tr>
            <td style="font-size:17px;font-weight:800;color:${INK};letter-spacing:-0.02em">
              Logi<span style="color:#4C3AE3">Q</span>-On <span style="font-weight:600;color:${MUTED}">Tech</span>
            </td>
            ${opts.eyebrow ? `<td style="text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${FAINT}">${opts.eyebrow}</td>` : ''}
          </tr>
        </table>
        <div style="padding:12px 32px 4px">
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:${headingColor};letter-spacing:-0.01em">${opts.heading}</h1>
          ${opts.subheading ? `<p style="margin:0;font-size:13px;color:${MUTED}">${opts.subheading}</p>` : ''}
        </div>
        <div style="padding:16px 32px 28px;color:#334155;font-size:14px;line-height:1.6">
          ${opts.bodyHtml}
        </div>
        <div style="padding:16px 32px;background:#fafafa;border-top:1px solid #f1f5f9">
          <p style="margin:0;font-size:11px;color:${FAINT};text-align:center">© ${new Date().getFullYear()} LogiQ-On Tech Pty Ltd${opts.footerNote ? ` · ${opts.footerNote}` : ''}</p>
        </div>
      </div>
    </div>`;
}

export interface EmailOptions {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  text?: string;
  orderId?: string;  // optional StorefrontOrder.id for linking
}

export async function sendTransactionalEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; mode: 'smtp' | 'simulated' }> {
  const host = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD;
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"LogiQ-On Platform Governance" <no-reply@logiqon.com>';

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from,
        to: options.to,
        cc: options.cc || undefined,
        subject: options.subject,
        html: options.html,
        text: options.text || options.subject,
      });

      console.log(`✉️ Real Email Dispatched via SMTP to ${options.to}. MessageId: ${info.messageId}`);
      prisma.emailLog.create({
        data: { to: options.to, cc: options.cc, subject: options.subject, html: options.html, mode: 'smtp', orderId: options.orderId },
      }).catch(() => {});
      return { success: true, messageId: info.messageId, mode: 'smtp' };
    } catch (error: any) {
      console.warn(`⚠️ SMTP dispatch error to ${options.to}, falling back to simulated log:`, error.message);
    }
  }

  // Simulated Fallback Logger (Recorded in System Logs & Audit Stream)
  console.log(`=================================================================`);
  console.log(`✉️ [SIMULATED EMAIL DISPATCH]`);
  console.log(`To: ${options.to}`);
  if (options.cc) console.log(`Cc: ${options.cc}`);
  console.log(`From: ${from}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`=================================================================`);

  prisma.emailLog.create({
    data: { to: options.to, cc: options.cc, subject: options.subject, html: options.html, mode: 'simulated', orderId: options.orderId },
  }).catch(() => {});

  return { success: true, messageId: `sim_${Date.now()}`, mode: 'simulated' };
}

// For flows where the OWNER composes their own subject/message in a form (e.g. the Send
// Tax Invoice modal) rather than a fixed template — wraps whatever they wrote in the same
// branded shell as every other outbound email, without overriding their actual words.
// Call this once per recipient (not once with a multi-address `to`) so each person only
// ever sees themselves in the message — never a list of everyone else it also went to.
export async function sendComposedEmail(
  to: string,
  subject: string,
  message: string,
  options?: { cc?: string; attachmentLinkUrl?: string; attachmentLabel?: string }
) {
  const bodyHtml = message
    .split('\n')
    .map((line) => (line.trim() ? `<p style="margin:0 0 10px 0;">${line}</p>` : '<br/>'))
    .join('');

  const html = renderEmailShell({
    heading: subject,
    bodyHtml: bodyHtml + (options?.attachmentLinkUrl ? emailButton(options.attachmentLabel || 'View Document', options.attachmentLinkUrl) : ''),
  });

  return sendTransactionalEmail({ to, cc: options?.cc, subject, html, text: message });
}

export async function sendVendorApprovalEmail(vendorEmail: string, companyName: string) {
  const subject = 'Vendor Application Approved — LogiQ-On Tech';
  const portalUrl = 'https://logi-q-on-tech-git-dev-myh-itch.vercel.app/dashboard/vendor';
  const html = renderEmailShell({
    eyebrow: 'Vendor Governance',
    heading: 'Application Approved',
    subheading: 'Your compliance review is complete',
    tone: 'success',
    bodyHtml: `
      <p>Dear <strong>${companyName || vendorEmail}</strong>,</p>
      <p>Your vendor company registration and compliance documentation have been <strong>approved</strong> by the LogiQ-On Platform Governance team.</p>
      ${emailCallout(`
        <strong style="display:block;margin-bottom:6px">You now have access to:</strong>
        <ul style="margin:0;padding-left:18px">
          <li>Full Vendor Portal access</li>
          <li>Item Master product &amp; service catalogue management</li>
          <li>Warehouse receiving ledger &amp; stock allocation</li>
        </ul>`, 'success')}
      ${emailButton('Open Vendor Portal', portalUrl)}
      <p style="font-size:13px;color:#64748b">Questions? Contact Platform Support any time.</p>`,
    footerNote: 'Vendor Governance',
  });

  return sendTransactionalEmail({ to: vendorEmail, subject, html });
}

// FR-STORE — sent immediately on public storefront checkout. This is an order
// confirmation only, not a Tax Invoice: the formal Tax Invoice is generated and
// emailed later at the normal point in the fulfilment pipeline (once dispatched),
// exactly like every other Sales Order in the system.
export async function sendOrderConfirmationEmail(
  customerEmail: string,
  customerName: string,
  salesOrderNumber: string,
  lines: Array<{ itemName: string; quantity: number; sellingPrice: number; lineTotal: number }>,
  totalValue: number,
  currency: string
) {
  const subject = `Order Confirmation — ${salesOrderNumber}`;
  const html = renderEmailShell({
    eyebrow: 'Order Confirmation',
    heading: `Thank you for your order, ${customerName}`,
    subheading: `Order ${salesOrderNumber} has been received`,
    tone: 'success',
    bodyHtml: `
      <p>Your order is now being reviewed by our team before it moves into fulfilment.</p>
      ${emailItemsTable(
        lines.map((l) => ({ label: l.itemName, qty: l.quantity, unitPrice: l.sellingPrice, lineTotal: l.lineTotal })),
        currency,
        { totals: [{ label: 'Order Total', value: `${currency} ${totalValue.toFixed(2)}`, strong: true }] }
      )}
      ${emailCallout('A formal Tax Invoice will be issued by email once your order has been dispatched, along with tracking details.')}
      <p style="font-size:13px;color:#64748b">Questions about this order? Just reply and reference your order number above.</p>`,
  });

  return sendTransactionalEmail({ to: customerEmail, subject, html });
}

export async function sendVendorRejectionEmail(vendorEmail: string, companyName: string, rejectionReason: string) {
  const subject = 'Vendor Application Decision — LogiQ-On Tech';
  const html = renderEmailShell({
    eyebrow: 'Vendor Governance',
    heading: 'Application Not Approved',
    subheading: 'Your compliance review is complete',
    tone: 'danger',
    bodyHtml: `
      <p>Dear <strong>${companyName || vendorEmail}</strong>,</p>
      <p>Following review of your submitted company details and compliance certificates, your vendor application was <strong>not approved</strong> by Platform Governance.</p>
      ${emailCallout(`<strong style="display:block;margin-bottom:4px">Reason given</strong>${rejectionReason || 'Compliance document verification failed.'}`, 'danger')}
      <p style="font-size:13px;color:#64748b">Vendor Portal access has been locked. To submit revised documents, contact Platform Support to request the application be re-opened.</p>`,
    footerNote: 'Vendor Governance',
  });

  return sendTransactionalEmail({ to: vendorEmail, subject, html });
}
