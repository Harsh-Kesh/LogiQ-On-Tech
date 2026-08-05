import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers, updateRuntimeVendorProfile } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'PENDING'],
  APPROVED: ['SUSPENDED', 'UNDER_REVIEW'],
  SUSPENDED: ['APPROVED', 'REJECTED'],
  REJECTED: ['PENDING'],
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const adminUser = session?.user as any;

  if (!adminUser || adminUser.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const vendorId = params.id;
  const { targetStatus, rejectionReason } = await req.json();

  if (!targetStatus || !Object.keys(ALLOWED_TRANSITIONS).includes(targetStatus)) {
    return NextResponse.json({ error: 'Invalid target status provided.' }, { status: 400 });
  }

  let currentStatus = 'PENDING';
  let vendorEmail = '';
  let dbVendor: any = null;

  try {
    dbVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { user: true },
    });
    if (dbVendor) {
      currentStatus = dbVendor.status;
      vendorEmail = dbVendor.user?.email || '';
    }
  } catch (e) {}

  // Check persistent store
  const persistentUsers = loadPersistentUsers();
  const rawUserId = vendorId.replace('vnd_', '');
  const persistentRecord = Object.values(persistentUsers).find(
    (u) =>
      u.id === rawUserId ||
      u.id === vendorId ||
      `vnd_${u.id}` === vendorId ||
      (vendorEmail && u.email.toLowerCase() === vendorEmail.toLowerCase())
  );

  if (persistentRecord) {
    currentStatus = persistentRecord.status || currentStatus;
    if (!vendorEmail) vendorEmail = persistentRecord.email;
  }

  const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];

  // Validate State Machine Allowed Transition
  if (!allowedTargets.includes(targetStatus)) {
    return NextResponse.json(
      {
        error: `Illegal state transition. Cannot move vendor status directly from ${currentStatus} to ${targetStatus}. Allowed transitions from ${currentStatus} are: ${allowedTargets.join(', ')}.`,
      },
      { status: 400 }
    );
  }

  // 1. Synchronize status transition to persistent store (registered_users.json)
  if (vendorEmail) {
    updateRuntimeVendorProfile(vendorEmail, undefined, undefined, targetStatus);
  }
  if (persistentRecord) {
    updateRuntimeVendorProfile(persistentRecord.id, undefined, undefined, targetStatus);
  }
  updateRuntimeVendorProfile(vendorId, undefined, undefined, targetStatus);

  // 2. Synchronize status transition to PostgreSQL Database
  if (dbVendor) {
    try {
      await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          status: targetStatus as any,
          rejectionReason: targetStatus === 'REJECTED' ? rejectionReason || 'Failed compliance evaluation' : null,
          approvedAt: targetStatus === 'APPROVED' ? new Date() : dbVendor.approvedAt,
        },
      });

      if (targetStatus === 'SUSPENDED') {
        await prisma.user.update({
          where: { id: dbVendor.userId },
          data: { isSuspended: true },
        }).catch(() => {});
      } else if (targetStatus === 'APPROVED' && dbVendor.user.isSuspended) {
        await prisma.user.update({
          where: { id: dbVendor.userId },
          data: { isSuspended: false },
        }).catch(() => {});
      }
    } catch (e: any) {
      console.warn('Prisma DB status update warning:', e.message);
    }
  }

  await logAuditEvent({
    userId: adminUser.id,
    role: adminUser.role,
    action: `VENDOR_STATUS_TRANSITION_${targetStatus}`,
    module: 'VENDOR_MANAGEMENT',
    targetId: vendorId,
    payloadJson: {
      companyName: dbVendor?.companyName || persistentRecord?.companyName,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      rejectionReason,
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    vendor: {
      id: vendorId,
      status: targetStatus,
      rejectionReason: targetStatus === 'REJECTED' ? rejectionReason : null,
    },
  });
}
