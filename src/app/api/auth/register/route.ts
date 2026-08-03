import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '@/lib/audit';
import { UserRole, VendorStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const { email, password, fullName, role, companyName, abnAcn } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole: UserRole = role === 'VENDOR' ? 'VENDOR' : 'CUSTOMER';

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName,
        role: assignedRole,
      },
    });

    if (assignedRole === 'VENDOR') {
      if (!companyName || !abnAcn) {
        return NextResponse.json({ error: 'Company Name and ABN/ACN are required for Vendor registration' }, { status: 400 });
      }

      await prisma.vendor.create({
        data: {
          companyName,
          abnAcn,
          status: VendorStatus.PENDING,
          userId: user.id,
        },
      });

      await logAuditEvent({
        userId: user.id,
        role: 'VENDOR',
        action: 'VENDOR_APPLICATION_SUBMITTED',
        module: 'VENDOR_MANAGEMENT',
        payloadJson: { companyName, abnAcn },
      });
    } else {
      await logAuditEvent({
        userId: user.id,
        role: 'CUSTOMER',
        action: 'CUSTOMER_REGISTERED',
        module: 'CUSTOMER_CRM',
        payloadJson: { email: user.email },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully!',
    });
  } catch (error: any) {
    console.error('❌ Registration API error:', error);
    return NextResponse.json({ error: 'Failed to process registration' }, { status: 500 });
  }
}
