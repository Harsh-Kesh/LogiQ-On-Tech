import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { UserRole } from '@prisma/client';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || (session.user as any).role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Unauthorized: Platform Owner permission required' }, { status: 403 });
  }

  const { targetUserId, newRole } = await req.json();

  if (!targetUserId || !newRole) {
    return NextResponse.json({ error: 'targetUserId and newRole are required' }, { status: 400 });
  }

  const VALID_ROLES: string[] = ['PLATFORM_OWNER', 'VENDOR', 'WAREHOUSE', 'MDM'];
  if (!VALID_ROLES.includes(newRole)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (existingUser.id === (session.user as any).id) {
      return NextResponse.json({ error: 'Cannot change your own role.' }, { status: 400 });
    }

    const oldRole = existingUser.role;

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole as UserRole },
    });

    await logAuditEvent({
      userId: (session.user as any).id,
      role: (session.user as any).role,
      action: 'ROLE_CHANGED',
      module: 'GOVERNANCE',
      targetId: targetUserId,
      payloadJson: {
        targetEmail: existingUser.email,
        oldRole,
        newRole,
        changedBy: session.user.email,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to change role' }, { status: 500 });
  }
}
