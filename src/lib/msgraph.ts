// Microsoft Graph client (app-only) for the client's Microsoft 365 mailboxes.
// Set up in the client's tenant: an Entra app registration with NO Mail
// permissions in Entra itself, plus Exchange "RBAC for Applications" roles
// scoped to the two shared mailboxes:
//   MS_SENDER_MAILBOX  (orders@)   -> Application Mail.Send + Application Mail.ReadWrite
//   MS_INVOICE_MAILBOX (accounts@) -> Application Mail.ReadWrite
// Env: MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_SENDER_MAILBOX, MS_INVOICE_MAILBOX.

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

let cachedToken: { value: string; expiresAt: number } | null = null;

export function graphConfigured(): boolean {
  return Boolean(process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);
}

/** orders@ — sends every outbound email and receives customer inquiries. */
export function senderMailbox(): string {
  return (process.env.MS_SENDER_MAILBOX || '').trim();
}

/** accounts@ — receives supplier invoices. */
export function invoiceMailbox(): string {
  return (process.env.MS_INVOICE_MAILBOX || '').trim();
}

export function mailboxPath(mailbox: string): string {
  return `/users/${encodeURIComponent(mailbox)}`;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;

  const res = await fetch(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID || '',
      client_secret: process.env.MS_CLIENT_SECRET || '',
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(`Microsoft sign-in failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

// ponytail: no retry on 429 throttling; add Retry-After handling if volume grows.
export async function graph<T = any>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Microsoft Graph ${method} ${path.split('?')[0]} failed ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  if (res.status === 202 || res.status === 204) return null as T;
  return res.json();
}

export function toRecipients(addresses: string | undefined): { emailAddress: { address: string } }[] {
  return (addresses || '')
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}
