import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  text?: string;
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

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="background-color: #1e3a8a; padding: 20px; border-radius: 12px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">LogiQ-On Technology Group</h1>
      </div>
      <div style="padding: 24px 10px; color: #0f172a; font-size: 14px; line-height: 1.6;">
        ${bodyHtml}
        ${options?.attachmentLinkUrl ? `<p style="margin-top: 20px;"><a href="${options.attachmentLinkUrl}" style="color: #2563eb; font-weight: bold;">${options.attachmentLabel || 'View Document'}</a></p>` : ''}
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
        © 2026 LogiQ-On Technology Group Pty Ltd
      </div>
    </div>
  `;

  return sendTransactionalEmail({ to, cc: options?.cc, subject, html, text: message });
}

export async function sendVendorApprovalEmail(vendorEmail: string, companyName: string) {
  const subject = '🎉 LogiQ-On Tech Platform — Vendor Application APPROVED';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="background-color: #1e3a8a; padding: 20px; border-radius: 12px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">LogiQ-On Technology Group</h1>
        <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 13px;">Statutory ATO Compliance & Vendor Governance</p>
      </div>
      <div style="padding: 24px 10px; color: #0f172a;">
        <h2 style="color: #16a34a; font-size: 20px; margin-top: 0;">Application Approved 🟢</h2>
        <p>Dear <strong>${companyName || vendorEmail}</strong>,</p>
        <p>We are pleased to inform you that your vendor company registration and statutory compliance documentation have been <strong>APPROVED</strong> by the LogiQ-On Platform Governance team.</p>
        
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 15px;">Granted Access & Capabilities:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #15803d; font-size: 13.5px;">
            <li>Full Vendor Portal Access (<a href="https://logi-q-on-tech-git-dev-myh-itch.vercel.app/dashboard/vendor" style="color: #2563eb;">Open Vendor Portal</a>)</li>
            <li>Item Master Product & Service Catalog CRUD Management</li>
            <li>3PL Warehouse Receiving Ledger & Stock Allocation Access</li>
          </ul>
        </div>
        <p style="font-size: 13px; color: #64748b;">If you have any questions, please contact Platform Support.</p>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
        © 2026 LogiQ-On Technology Group Pty Ltd • Multi-tenant RBAC Security
      </div>
    </div>
  `;

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
  const subject = `Order Confirmation — ${salesOrderNumber} — LogiQ-On Tech`;
  const rows = lines
    .map(
      (l) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">${l.itemName}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: center;">${l.quantity}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">${currency} ${l.sellingPrice.toFixed(2)}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">${currency} ${l.lineTotal.toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="background-color: #1e3a8a; padding: 20px; border-radius: 12px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">LogiQ-On Technology Group</h1>
        <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 13px;">Online Store — Order Confirmation</p>
      </div>
      <div style="padding: 24px 10px; color: #0f172a;">
        <h2 style="color: #16a34a; font-size: 20px; margin-top: 0;">Thank you for your order, ${customerName}!</h2>
        <p>Your order <strong>${salesOrderNumber}</strong> has been received and is now being reviewed by our team before it moves into fulfilment.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13.5px;">
          <thead>
            <tr>
              <th style="text-align: left; padding-bottom: 8px; border-bottom: 2px solid #1e3a8a; color: #1e3a8a;">Item</th>
              <th style="text-align: center; padding-bottom: 8px; border-bottom: 2px solid #1e3a8a; color: #1e3a8a;">Qty</th>
              <th style="text-align: right; padding-bottom: 8px; border-bottom: 2px solid #1e3a8a; color: #1e3a8a;">Unit Price</th>
              <th style="text-align: right; padding-bottom: 8px; border-bottom: 2px solid #1e3a8a; color: #1e3a8a;">Line Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="text-align: right; font-size: 16px; font-weight: bold; color: #0f172a;">Order Total: ${currency} ${totalValue.toFixed(2)}</p>
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 12px; margin: 20px 0;">
          <p style="margin: 0; color: #1e3a8a; font-size: 13px;">A formal Tax Invoice will be issued by email once your order has been dispatched, along with tracking details.</p>
        </div>
        <p style="font-size: 13px; color: #64748b;">If you have any questions about this order, please contact us and reference your order number above.</p>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
        © 2026 LogiQ-On Technology Group Pty Ltd
      </div>
    </div>
  `;

  return sendTransactionalEmail({ to: customerEmail, subject, html });
}

export async function sendVendorRejectionEmail(vendorEmail: string, companyName: string, rejectionReason: string) {
  const subject = '⚠️ LogiQ-On Tech Platform — Vendor Application Decision: REJECTED';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="background-color: #1e3a8a; padding: 20px; border-radius: 12px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">LogiQ-On Technology Group</h1>
        <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 13px;">Statutory ATO Compliance & Vendor Governance</p>
      </div>
      <div style="padding: 24px 10px; color: #0f172a;">
        <h2 style="color: #dc2626; font-size: 20px; margin-top: 0;">Application Rejected 🔴</h2>
        <p>Dear <strong>${companyName || vendorEmail}</strong>,</p>
        <p>Following audit evaluation of your submitted company details and compliance certificates, your vendor application has been <strong>REJECTED</strong> by Platform Governance.</p>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 12px; margin: 20px 0;">
          <h3 style="margin: 0 0 6px 0; color: #991b1b; font-size: 14px;">Formal Rejection Reason & Audit Notes:</h3>
          <p style="margin: 0; color: #b91c1c; font-size: 13.5px; font-weight: bold;">"${rejectionReason || 'Compliance document verification failed.'}"</p>
        </div>
        <p style="font-size: 13px; color: #64748b;">Notice: Access to the Vendor Portal has been locked. If you wish to submit revised documents, please contact Platform Support to request application re-opening.</p>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
        © 2026 LogiQ-On Technology Group Pty Ltd • Multi-tenant RBAC Security
      </div>
    </div>
  `;

  return sendTransactionalEmail({ to: vendorEmail, subject, html });
}
