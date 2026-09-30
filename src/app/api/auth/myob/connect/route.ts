// One-time MYOB OAuth setup — visit this URL as Platform Owner to authorise.
// After authorization MYOB redirects to /api/auth/myob/callback with a code.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden — must be logged in as Platform Owner' }, { status: 403 });
  }

  const clientId = process.env.MYOB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'MYOB_CLIENT_ID not set in environment variables' }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/myob/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'CompanyFile',
  });

  const authUrl = `https://secure.myob.com/oauth2/v1/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
