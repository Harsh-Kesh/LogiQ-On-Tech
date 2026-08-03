import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Audit Log Entry
    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'PASSWORD_RESET_SUCCESS',
      module: 'GOVERNANCE',
      payloadJson: { email: user.email },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully!',
    });
  } catch (error: any) {
    console.error('❌ Password reset API error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
