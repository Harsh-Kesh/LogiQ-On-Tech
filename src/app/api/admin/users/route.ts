import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers, savePersistentUsers } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user || role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  try {
    const dbUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isSuspended: true,
        mfaEnabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users: dbUsers });
  } catch (e: any) {
    // Fallback to persistent storage
    const persistentMap = loadPersistentUsers();
    const usersList = Object.values(persistentMap).map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      isSuspended: false,
      mfaEnabled: u.mfaEnabled,
      createdAt: u.createdAt,
    }));
    return NextResponse.json({ users: usersList });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const adminRole = (session?.user as any)?.role;
  const adminId = (session?.user as any)?.id || 'usr_admin_01';

  if (!session?.user || adminRole !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const { fullName, email, password, role } = await req.json();

  if (!fullName || !email || !password || !role) {
    return NextResponse.json({ error: 'All fields (fullName, email, password, role) are required.' }, { status: 400 });
  }

  const emailClean = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const existing = await prisma.user.findUnique({ where: { email: emailClean } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists.' }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        email: emailClean,
        fullName,
        role: role as UserRole,
        passwordHash,
      },
    });

    // Create vendor sub-record with PENDING status so vendor fills details in portal
    if (role === 'VENDOR') {
      await prisma.vendor.create({
        data: {
          userId: newUser.id,
          companyName: `${fullName} Logistics`,
          abnAcn: `51 ${Math.floor(10000000 + Math.random() * 90000000)}`,
          status: 'PENDING',
        },
      }).catch(() => {});
    }

    await logAuditEvent({
      userId: adminId,
      role: adminRole,
      action: 'USER_CREATED_BY_ADMIN',
      module: 'GOVERNANCE',
      payloadJson: { targetEmail: emailClean, targetRole: role, targetUserId: newUser.id },
    }).catch(() => {});

    return NextResponse.json({ success: true, user: newUser });
  } catch (e: any) {
    // Fallback to persistent storage
    const persistentUsers = loadPersistentUsers();
    if (persistentUsers[emailClean]) {
      return NextResponse.json({ error: 'User with this email already exists.' }, { status: 400 });
    }

    const newId = `usr_adm_${Date.now()}`;
    persistentUsers[emailClean] = {
      id: newId,
      email: emailClean,
      fullName,
      role: role as UserRole,
      mfaEnabled: false,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    savePersistentUsers(persistentUsers);

    return NextResponse.json({
      success: true,
      user: { id: newId, email: emailClean, fullName, role, isSuspended: false, mfaEnabled: false },
    });
  }
}
