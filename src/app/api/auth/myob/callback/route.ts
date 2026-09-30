// MYOB OAuth callback — exchanges the authorization code for tokens.
// Displays the refresh_token for the admin to copy into Vercel env vars.

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;max-width:600px">
        <h2 style="color:#dc2626">Authorization Failed</h2>
        <p>MYOB returned an error: <code>${error || 'no code received'}</code></p>
        <p>Go back and try <a href="/api/auth/myob/connect">/api/auth/myob/connect</a> again.</p>
      </body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const clientId = process.env.MYOB_CLIENT_ID!;
  const clientSecret = process.env.MYOB_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/myob/callback`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetch('https://secure.myob.com/oauth2/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;max-width:600px">
        <h2 style="color:#dc2626">Token Exchange Failed</h2>
        <pre style="background:#fef2f2;padding:16px;border-radius:8px">${text}</pre>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const tokens = await tokenRes.json();
  const refreshToken: string = tokens.refresh_token;
  const accessToken: string = tokens.access_token;
  const expiresIn: number = tokens.expires_in;

  // Fetch available company files so the user knows the GUID
  const filesRes = await fetch('https://api.myob.com/accountright/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-myobapi-key': clientId,
      'x-myobapi-version': 'v2',
    },
  });
  const files = filesRes.ok ? await filesRes.json() : [];

  const fileRows = Array.isArray(files)
    ? files
        .map(
          (f: any) =>
            `<tr>
              <td style="padding:8px;border:1px solid #e2e8f0">${f.Name || 'Unknown'}</td>
              <td style="padding:8px;border:1px solid #e2e8f0;font-family:monospace">${f.Id || '—'}</td>
            </tr>`
        )
        .join('')
    : '<tr><td colspan="2" style="padding:8px">Could not fetch company files</td></tr>';

  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><title>MYOB Connected</title></head>
<body style="font-family:sans-serif;padding:40px;max-width:700px;margin:0 auto">
  <h2 style="color:#16a34a">✓ MYOB Authorization Successful</h2>
  <p>Copy the values below into your <strong>Vercel Environment Variables</strong>.</p>

  <h3 style="margin-top:32px">1. Refresh Token (most important — store this)</h3>
  <p style="color:#64748b;font-size:14px">Add this as <code>MYOB_REFRESH_TOKEN</code> in Vercel. It auto-renews and never expires as long as it's used regularly.</p>
  <textarea
    rows="3"
    onclick="this.select()"
    style="width:100%;font-family:monospace;font-size:12px;padding:12px;border:2px solid #16a34a;border-radius:8px;background:#f0fdf4"
    readonly
  >${refreshToken}</textarea>

  <h3 style="margin-top:32px">2. Company File ID</h3>
  <p style="color:#64748b;font-size:14px">Add the ID of your company file as <code>MYOB_COMPANY_FILE_ID</code>.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="background:#f1f5f9">
        <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Company File Name</th>
        <th style="padding:8px;border:1px solid #e2e8f0;text-align:left">ID (copy this)</th>
      </tr>
    </thead>
    <tbody>${fileRows}</tbody>
  </table>

  <h3 style="margin-top:32px">3. Vercel env vars summary</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-family:monospace">MYOB_CLIENT_ID</td><td style="padding:6px;border:1px solid #e2e8f0">Already set</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-family:monospace">MYOB_CLIENT_SECRET</td><td style="padding:6px;border:1px solid #e2e8f0">Already set</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-family:monospace">MYOB_REFRESH_TOKEN</td><td style="padding:6px;border:1px solid #e2e8f0;color:#dc2626">← Paste the refresh token above</td></tr>
    <tr><td style="padding:6px;border:1px solid #e2e8f0;font-family:monospace">MYOB_COMPANY_FILE_ID</td><td style="padding:6px;border:1px solid #e2e8f0;color:#dc2626">← Paste the company file ID from the table above</td></tr>
  </table>

  <p style="margin-top:24px;color:#64748b;font-size:13px">
    After adding these to Vercel, redeploy and MYOB is fully connected.
    The refresh token will auto-renew on every API call — no manual rotation needed.
  </p>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}
