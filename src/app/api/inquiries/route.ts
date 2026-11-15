// Customer inquiries inbox (orders@ mailbox via Microsoft Graph). PLATFORM_OWNER only.
// GET            -> conversation list
// GET ?id=<msg>  -> one conversation thread
// POST { action: 'reply', id, text } | { action: 'handled', id, handled }

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import {
  getInquiryThread, inquiriesConfigured, listInquiries, replyToInquiry, setInquiryHandled,
} from '@/lib/inquiries';

export const dynamic = 'force-dynamic';

async function requireOwner() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  return user?.role === 'PLATFORM_OWNER' ? user : null;
}

const notConfigured = () =>
  NextResponse.json(
    { configured: false, error: 'Mailbox not connected. Set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET and MS_SENDER_MAILBOX.' },
    { status: 503 }
  );

export async function GET(req: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!inquiriesConfigured()) return notConfigured();

  const id = new URL(req.url).searchParams.get('id');
  try {
    return NextResponse.json(id ? await getInquiryThread(id) : { configured: true, inquiries: await listInquiries() });
  } catch (err: any) {
    console.error('[inquiries] GET failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

const PostBody = z.discriminatedUnion('action', [
  z.object({ action: z.literal('reply'), id: z.string().min(1), text: z.string().trim().min(1).max(20000) }),
  z.object({ action: z.literal('handled'), id: z.string().min(1), handled: z.boolean() }),
]);

export async function POST(req: Request) {
  const user = await requireOwner();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!inquiriesConfigured()) return notConfigured();

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const body = parsed.data;

  try {
    if (body.action === 'reply') {
      await replyToInquiry(body.id, body.text);
      await logAuditEvent({
        userId: user.id, role: user.role, action: 'INQUIRY_REPLIED', module: 'GOVERNANCE', targetId: body.id,
      });
    } else {
      await setInquiryHandled(body.id, body.handled);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`[inquiries] ${body.action} failed:`, err.message);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
