import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers, savePersistentUsers } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { UserRole } from '@prisma/client';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const adminRole = (session?.user as any)?.role;
  const adminId = (session?.user as any)?.id || 'usr_admin_01';

  if (!session?.user || adminRole !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const userId = params.id;
  const { isSuspended, role } = await req.json();

  try {
    const updateData: any = {};
    if (typeof isSuspended === 'boolean') updateData.isSuspended = isSuspended;
    if (role) updateData.role = role as UserRole;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    if (typeof isSuspended === 'boolean') {
      await logAuditEvent({
        userId: adminId,
        role: adminRole,
        action: isSuspended ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
        module: 'GOVERNANCE',
        payloadJson: { targetUserId: userId, targetEmail: updatedUser.email, isSuspended },
      }).catch(() => {});
    }

    if (role) {
      await logAuditEvent({
        userId: adminId,
        role: adminRole,
        action: 'USER_ROLE_CHANGED',
        module: 'GOVERNANCE',
        payloadJson: { targetUserId: userId, targetEmail: updatedUser.email, newRole: role },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (e: any) {
    // Fallback to persistent storage
    const persistentUsers = loadPersistentUsers();
    let targetEmail = Object.keys(persistentUsers).find((em) => persistentUsers[em].id === userId);
    if (targetEmail && persistentUsers[targetEmail]) {
      if (role) persistentUsers[targetEmail].role = role as UserRole;
      if (typeof isSuspended === 'boolean') persistentUsers[targetEmail].isSuspended = isSuspended;
      savePersistentUsers(persistentUsers);
      return NextResponse.json({ success: true, user: persistentUsers[targetEmail] });
    }

    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}
