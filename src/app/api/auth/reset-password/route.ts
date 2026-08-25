import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '@/lib/audit';
import {
  generatePasswordResetOtp,
  verifyPasswordResetOtp,
  updateRuntimeUserPassword,
  isUserRegistered,
} from '@/lib/auth';
import { isValidEmail, validatePasswordPolicy } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const { action, email, otpCode, newPassword } = await req.json();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid account email address is required' }, { status: 400 });
    }

    const emailClean = email.toLowerCase().trim();

    // PHASE 1: Request Password Reset OTP Code
    if (action === 'REQUEST_OTP') {
      let userExists = isUserRegistered(emailClean);

      try {
        const dbUser = await prisma.user.findUnique({ where: { email: emailClean } });
        if (dbUser) userExists = true;
      } catch (e) {}

      if (!userExists) {
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, a verification code has been dispatched.',
        });
      }

      const otpCode = generatePasswordResetOtp(emailClean);

      await logAuditEvent({
        action: 'PASSWORD_RESET_OTP_SENT',
        module: 'GOVERNANCE',
        payloadJson: { email: emailClean },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: 'A 6-digit verification code has been dispatched to your email!',
        // OTP delivered via email channel — never expose in API response
      });
    }

    // PHASE 2: Verify OTP Code & Set New Password
    if (action === 'VERIFY_AND_RESET') {
      if (!otpCode || otpCode.trim().length !== 6) {
        return NextResponse.json({ error: 'Please enter a valid 6-digit OTP verification code' }, { status: 400 });
      }

      if (!newPassword) {
        return NextResponse.json({ error: 'New password is required' }, { status: 400 });
      }

      const passwordCheck = validatePasswordPolicy(newPassword);
      if (!passwordCheck.valid) {
        return NextResponse.json(
          { error: `Password policy violation: ${passwordCheck.errors.join('. ')}` },
          { status: 400 }
        );
      }

      // Verify OTP Code
      const isOtpValid = verifyPasswordResetOtp(emailClean, otpCode);
      if (!isOtpValid) {
        return NextResponse.json({ error: 'Invalid or expired 6-digit OTP verification code. Please request a new code.' }, { status: 400 });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update in Runtime User Store
      updateRuntimeUserPassword(emailClean, newPasswordHash);

      // Update in PostgreSQL Database
      try {
        const dbUser = await prisma.user.findUnique({ where: { email: emailClean } });
        if (dbUser) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { passwordHash: newPasswordHash },
          });

          await logAuditEvent({
            userId: dbUser.id,
            role: dbUser.role,
            action: 'PASSWORD_RESET_SUCCESS',
            module: 'GOVERNANCE',
            payloadJson: { email: emailClean },
          }).catch(() => {});
        }
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully! You can now log in with your new password.',
      });
    }

    return NextResponse.json({ error: 'Invalid reset action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('❌ Password reset API error:', error);
    return NextResponse.json({ error: 'Failed to process password reset request' }, { status: 500 });
  }
}
