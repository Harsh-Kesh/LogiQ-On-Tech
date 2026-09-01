import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyMfaToken } from '@/lib/mfa';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const emailClean = session.user.email?.toLowerCase().trim() || '';
    const userId = (session.user as any).id;

    const dbUser = await prisma.user.findUnique({ where: { email: emailClean } });
    const mfaSecret = dbUser?.mfaSecret || null;

    if (!mfaSecret) {
      return NextResponse.json({ error: 'MFA is not fully configured for this account. Please contact admin.' }, { status: 400 });
    }

    const isValid = verifyMfaToken(token, mfaSecret);

    if (!isValid) {
      await logAuditEvent({
        userId: userId || 'usr_unknown',
        role: (session.user as any).role || 'VENDOR',
        action: 'MFA_LOGIN_FAILED',
        module: 'GOVERNANCE',
        payloadJson: { email: session.user.email },
      }).catch(() => {});

      return NextResponse.json({ error: 'Invalid 6-digit OTP token' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('MFA login challenge route error:', error);
    return NextResponse.json({ error: error.message || 'Error processing MFA challenge' }, { status: 500 });
  }
}
