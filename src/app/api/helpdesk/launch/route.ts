import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

// FR-HLP-001..008 — MyHitch Helpdesk secure launch.
// Verifies session role, records the launch attempt, and returns the approved
// helpdesk URL to the client so it can open in a new tab.
// SSO/federated hand-off (FR-HLP-003) is deferred until MyHitch federation is
// approved; this fallback path (FR-HLP-004) opens the configured sign-in URL
// with only non-sensitive context — never credentials or tokens.

// Owner-only — vendors raise issues with the Platform Owner, not directly with
// MyHitch, so this stays out of their access entirely (not just hidden client-side).
const HELPDESK_PERMITTED_ROLES = ['PLATFORM_OWNER'];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!HELPDESK_PERMITTED_ROLES.includes(user.role)) {
    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'HELPDESK_LAUNCH_DENIED',
      module: 'GOVERNANCE',
      payloadJson: { reason: 'role_not_permitted' },
    }).catch(() => {});
    return NextResponse.json({ error: 'MyHitch Helpdesk access is not enabled for your role.' }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const source = typeof body?.source === 'string' ? body.source.slice(0, 200) : 'unknown';

  const configured = process.env.MYHITCH_HELPDESK_URL;
  if (!configured) {
    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'HELPDESK_LAUNCH_UNAVAILABLE',
      module: 'GOVERNANCE',
      payloadJson: { source, reason: 'url_not_configured' },
    }).catch(() => {});
    return NextResponse.json({ error: 'MyHitch Helpdesk endpoint is not configured yet. Contact your administrator.' }, { status: 503 });
  }

  // FR-HLP-006: pass approved non-sensitive context only.
  const url = new URL(configured);
  url.searchParams.set('org', 'logiqon-tech');
  url.searchParams.set('role', user.role);
  url.searchParams.set('source', source);

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'HELPDESK_LAUNCH',
    module: 'GOVERNANCE',
    payloadJson: { source, endpoint: url.origin + url.pathname },
  }).catch(() => {});

  return NextResponse.json({ url: url.toString() });
}
