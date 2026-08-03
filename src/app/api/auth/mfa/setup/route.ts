import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateMfaSecret, generateQrCodeDataUrl } from '@/lib/mfa';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { secret, otpauth } = generateMfaSecret(session.user.email || 'staff@logiqon.tech');
  const qrCodeUrl = await generateQrCodeDataUrl(otpauth);

  return NextResponse.json({
    secret,
    qrCodeUrl,
  });
}
