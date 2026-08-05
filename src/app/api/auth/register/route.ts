import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '@/lib/audit';
import { isUserRegistered, registerRuntimeUser } from '@/lib/auth';
import { UserRole, VendorStatus } from '@prisma/client';
import {
  isValidEmail,
  validatePasswordPolicy,
  isValidFullName,
} from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const { email, password, fullName, role, companyName, abnAcn } = await req.json();

    // 1. Mandatory Fields Presence Check
    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 });
    }

    const emailClean = email.toLowerCase().trim();

    // 2. Email RFC Standard Format Validation
    if (!isValidEmail(emailClean)) {
      return NextResponse.json({ error: 'Please enter a valid email address (e.g. name@company.com)' }, { status: 400 });
    }

    // 3. Full Name Format Validation
    if (!isValidFullName(fullName)) {
      return NextResponse.json({ error: 'Full name must be at least 2 characters and contain valid letters' }, { status: 400 });
    }

    // 4. Password Security Policy Validation
    const passwordCheck = validatePasswordPolicy(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: `Password policy violation: ${passwordCheck.errors.join('. ')}` },
        { status: 400 }
      );
    }

    const assignedRole: UserRole = role === 'VENDOR' ? 'VENDOR' : 'CUSTOMER';

    // 5. Strict Email Uniqueness Check across Runtime Store
    if (isUserRegistered(emailClean)) {
      return NextResponse.json({ error: 'An account with this email address already exists' }, { status: 400 });
    }

    // 6. Strict Uniqueness Check across PostgreSQL Database
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: emailClean },
      });

      if (existingUser) {
        return NextResponse.json({ error: 'An account with this email address already exists' }, { status: 400 });
      }
    } catch (e) {
      // Database offline check continue
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Register into runtime store
    const registered = registerRuntimeUser(emailClean, fullName, assignedRole, passwordHash);
    if (!registered) {
      return NextResponse.json({ error: 'An account with this email address already exists' }, { status: 400 });
    }

    // Attempt Database creation
    try {
      const user = await prisma.user.create({
        data: {
          email: emailClean,
          passwordHash,
          fullName,
          role: assignedRole,
        },
      });

      if (assignedRole === 'VENDOR') {
        const finalCompanyName = companyName?.trim() || '';
        const finalAbn = abnAcn ? abnAcn.replace(/\s+/g, '') : '';

        await prisma.vendor.create({
          data: {
            companyName: finalCompanyName,
            abnAcn: finalAbn,
            status: VendorStatus.PENDING,
            userId: user.id,
          },
        });

        await logAuditEvent({
          userId: user.id,
          role: 'VENDOR',
          action: 'VENDOR_ACCOUNT_CREATED',
          module: 'VENDOR_MANAGEMENT',
          payloadJson: { companyName: finalCompanyName, abnAcn: finalAbn, status: 'PENDING' },
        }).catch(() => {});
      } else {
        await logAuditEvent({
          userId: user.id,
          role: 'CUSTOMER',
          action: 'CUSTOMER_REGISTERED',
          module: 'CUSTOMER_CRM',
          payloadJson: { email: user.email },
        }).catch(() => {});
      }
    } catch (dbError: any) {
      console.warn('⚠️ Database offline during registration, saved in runtime store:', dbError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! You can now log in.',
    });
  } catch (error: any) {
    console.error('❌ Registration API error:', error);
    return NextResponse.json({ error: 'Failed to process registration request' }, { status: 500 });
  }
}
