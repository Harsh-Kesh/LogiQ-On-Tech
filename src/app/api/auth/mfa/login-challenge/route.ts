import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers } from '@/lib/auth';
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
    let mfaSecret: string | null = null;
    let userId = (session.user as any).id;

    // 1. Check Prisma DB
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: emailClean } });
      if (dbUser && dbUser.mfaSecret) {
        mfaSecret = dbUser.mfaSecret;
      }
    } catch (e) {
      console.warn('Prisma DB lookup warning for MFA secret:', e);
    }

    // 2. Check Persistent File Store Fallback
    if (!mfaSecret) {
      const users = loadPersistentUsers();
      const targetUser = users[emailClean] || Object.values(users).find(u => u.email.toLowerCase() === emailClean || u.id === userId);
      if (targetUser && targetUser.mfaSecret) {
        mfaSecret = targetUser.mfaSecret;
      }
    }

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
