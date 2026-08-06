import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
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
  console.log(`From: ${from}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`=================================================================`);

  return { success: true, messageId: `sim_${Date.now()}`, mode: 'simulated' };
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
