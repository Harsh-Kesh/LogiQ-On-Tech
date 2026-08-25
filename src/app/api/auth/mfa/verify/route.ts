import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers, savePersistentUsers } from '@/lib/auth';
import { verifyMfaToken } from '@/lib/mfa';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token, secret } = await req.json();

    if (!token || !secret) {
      return NextResponse.json({ error: 'Token and secret are required' }, { status: 400 });
    }

    const isValid = verifyMfaToken(token, secret);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid 6-digit OTP token. Please check your Google Authenticator app and try again.' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const emailClean = session.user.email?.toLowerCase().trim() || '';

    // 1. Try Prisma DB Update
    try {
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            mfaEnabled: true,
            mfaSecret: secret,
          },
        });
      }
    } catch (e: any) {
      console.warn('Prisma DB MFA update warning (falling back to file store):', e.message);
    }

    // 2. Dual-Write to Persistent File Store
    try {
      const users = loadPersistentUsers();
      const targetKey = Object.keys(users).find(
        (k) => k.toLowerCase() === emailClean || users[k].id === userId
      );

      if (targetKey && users[targetKey]) {
        users[targetKey].mfaEnabled = true;
        users[targetKey].mfaSecret = secret;
        savePersistentUsers(users);
      }
    } catch (e: any) {
      console.warn('File store MFA update warning:', e.message);
    }

    // Audit Log Entry
    await logAuditEvent({
      userId: userId || 'usr_unknown',
      role: (session.user as any).role || 'VENDOR',
      action: 'MFA_ENROLLED_SUCCESS',
      module: 'GOVERNANCE',
      payloadJson: { email: session.user.email, mfaEnabled: true },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'MFA enrolment successful! Staff account is now secured with 2FA.',
    });
  } catch (error: any) {
    console.error('MFA verify route error:', error);
    return NextResponse.json({ error: error.message || 'Error processing MFA verification' }, { status: 500 });
  }
}
