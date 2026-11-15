// Public website forms (Contact, quick contact, Request Demo, Request Quote).
// Each submission is emailed to the orders mailbox with Reply-To set to the
// customer, so it shows in Customer Inquiries and a reply goes straight to them.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendTransactionalEmail, renderEmailShell, emailInfoTable } from '@/lib/email';
import { senderMailbox } from '@/lib/msgraph';
import { escapeHtml, textToHtml } from '@/lib/mail-helpers';

const FORM_LABELS = {
  contact: 'Contact enquiry',
  callback: 'Call-back request',
  demo: 'Demo request',
  quote: 'Quote request',
} as const;

const Body = z.object({
  form: z.enum(['contact', 'callback', 'demo', 'quote']),
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(200).optional(),
  fields: z.record(z.string().max(5000)).refine((f) => Object.keys(f).length <= 20, 'Too many fields').default({}),
  website: z.string().optional(), // honeypot — real people leave it empty
});

// ponytail: honeypot only, no rate limit; add one (e.g. per-IP in the DB) if spam shows up.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  const { form, email, name, fields, website } = parsed.data;
  if (website) return NextResponse.json({ success: true }); // bot: pretend it worked

  const label = FORM_LABELS[form];
  const rows = [
    { label: 'Name', value: escapeHtml(name || '—') },
    { label: 'Email', value: escapeHtml(email), accent: true },
    ...Object.entries(fields)
      .filter(([key, value]) => value.trim() && key !== 'message')
      .map(([key, value]) => ({ label: escapeHtml(key), value: escapeHtml(value) })),
  ];
  const message = fields.message?.trim();

  const html = renderEmailShell({
    eyebrow: 'Website',
    heading: label,
    subheading: `From ${escapeHtml(name || email)}`,
    bodyHtml: `${emailInfoTable(rows)}${message ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#0f172a">${textToHtml(message)}</p>` : ''}
      <p style="margin:16px 0 0;font-size:12px;color:#64748b">Reply to this email to answer the customer directly.</p>`,
  });

  const result = await sendTransactionalEmail({
    to: senderMailbox() || 'info@logiqon.com.au',
    replyTo: email,
    subject: `${label}: ${name || email}`,
    html,
  });

  if (!result.success) {
    return NextResponse.json({ error: 'Sorry, we could not send your message. Please call 1300 717 433.' }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
