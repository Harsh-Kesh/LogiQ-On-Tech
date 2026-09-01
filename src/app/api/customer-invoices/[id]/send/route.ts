import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadCustomerInvoices, updateCustomerInvoice } from '@/lib/customer-invoices';
import { sendComposedEmail } from '@/lib/email';
import { canTransition } from '@/lib/lifecycle';
import { guardPermission } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sends this Tax Invoice's subject/message to one or more recipients — each as their
// OWN individual email dispatch, never a single email with everyone in "To" together,
// so no recipient ever sees who else it also went to.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!guardPermission(user, 'CUSTOMER_INVOICING', 'UPDATE')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const current = (await loadCustomerInvoices()).find((r) => r.id === params.id);
  if (!current) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });

  const body = await req.json();
  const rawRecipients: string[] = Array.isArray(body.recipients)
    ? body.recipients
    : String(body.recipients || '').split(',');
  const recipients = Array.from(new Set(rawRecipients.map((r: string) => r.trim()).filter(Boolean)));
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'At least one recipient email is required.' }, { status: 400 });
  }
  const invalidEmail = recipients.find((r) => !EMAIL_RE.test(r));
  if (invalidEmail) {
    return NextResponse.json({ error: `'${invalidEmail}' isn't a valid email address.` }, { status: 400 });
  }

  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();
  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  }
  const cc = body.cc ? String(body.cc).trim() : undefined;

  if (!canTransition('CUSTOMER_INVOICE', current.status, 'SENT')) {
    return NextResponse.json({ error: `Cannot send an invoice in "${current.status}" status.` }, { status: 400 });
  }

  const printUrl = `${process.env.NEXTAUTH_URL || ''}/api/customer-invoices/${current.id}/print`;

  const results: Array<{ to: string; success: boolean; mode?: string }> = [];
  for (const to of recipients) {
    try {
      const r = await sendComposedEmail(to, subject, message, {
        cc,
        attachmentLinkUrl: printUrl,
        attachmentLabel: `View / Print ${current.invoiceNumber}`,
      });
      results.push({ to, success: r.success, mode: r.mode });
    } catch (e: any) {
      results.push({ to, success: false });
    }
  }

  const rec = await updateCustomerInvoice(current.id, {
    status: 'SENT',
    sentAt: new Date().toISOString(),
    customerEmail: recipients.join(', '),
  });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'CUSTOMER_INVOICE_EMAILED',
    module: 'GOVERNANCE',
    targetId: current.id,
    payloadJson: { invoiceNumber: current.invoiceNumber, recipients, cc, results },
  }).catch(() => {});

  return NextResponse.json({ success: true, customerInvoice: rec, results });
}
