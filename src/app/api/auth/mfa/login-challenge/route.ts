import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers } from '@/lib/auth';
import { verifyMfaToken } from '@/lib/mfa';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const emailClean = session.user.email?.toLowerCase().trim() || '';
  let mfaSecret = null;
  let userId = (session.user as any).id;

  try {
    const dbUser = await prisma.user.findUnique({ where: { email: emailClean } });
    if (dbUser && dbUser.mfaSecret) {
      mfaSecret = dbUser.mfaSecret;
    }
  } catch (e) {
    console.error('DB query failed for MFA secret');
  }

  if (!mfaSecret) {
    return NextResponse.json({ error: 'MFA is not fully configured for this account. Please contact admin.' }, { status: 400 });
  }

  const isValid = verifyMfaToken(token, mfaSecret);

  if (!isValid) {
    // Log failed attempt
    await logAuditEvent({
      userId,
      role: (session.user as any).role,
      action: 'MFA_LOGIN_FAILED',
      module: 'GOVERNANCE',
      payloadJson: { email: session.user.email },
    }).catch(() => {});

    return NextResponse.json({ error: 'Invalid 6-digit OTP token' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
  });
}
