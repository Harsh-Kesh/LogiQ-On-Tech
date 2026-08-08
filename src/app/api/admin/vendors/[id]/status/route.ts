import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers, savePersistentUsers, updateRuntimeVendorProfile } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { sendVendorApprovalEmail, sendVendorRejectionEmail } from '@/lib/email';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['UNDER_REVIEW', 'REJECTED', 'APPROVED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'PENDING'],
  APPROVED: ['SUSPENDED', 'UNDER_REVIEW', 'REJECTED'],
  SUSPENDED: ['APPROVED', 'REJECTED', 'UNDER_REVIEW'],
  REJECTED: ['PENDING', 'UNDER_REVIEW', 'APPROVED'],
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
  let companyName = '';
  let dbVendor: any = null;

  try {
    dbVendor = await prisma.vendor.findFirst({
      where: { OR: [{ id: vendorId }, { userId: vendorId.replace('vnd_', '') }] },
      include: { user: true },
    });
    if (dbVendor) {
      currentStatus = dbVendor.status;
      vendorEmail = dbVendor.user?.email || '';
      companyName = dbVendor.companyName || '';
    }
  } catch (e) {}

  // Check persistent store
  const persistentUsers = loadPersistentUsers();
  const rawUserId = vendorId.replace('vnd_', '');
  const persistentRecordKey = Object.keys(persistentUsers).find((k) => {
    const u = persistentUsers[k];
    return (
      u.id === rawUserId ||
      u.id === vendorId ||
      `vnd_${u.id}` === vendorId ||
      (vendorEmail && u.email.toLowerCase() === vendorEmail.toLowerCase()) ||
      k.toLowerCase() === vendorEmail.toLowerCase()
    );
  });

  const persistentRecord = persistentRecordKey ? persistentUsers[persistentRecordKey] : null;

  if (persistentRecord) {
    currentStatus = persistentRecord.status || currentStatus;
    if (!vendorEmail) vendorEmail = persistentRecord.email;
    if (!companyName) companyName = persistentRecord.companyName || '';
  }

  // 1. Synchronize status transition to persistent store
  if (vendorEmail) {
    updateRuntimeVendorProfile(vendorEmail, undefined, undefined, targetStatus, targetStatus === 'REJECTED' ? rejectionReason : undefined);
  }
  if (persistentRecord) {
    updateRuntimeVendorProfile(persistentRecord.id, undefined, undefined, targetStatus, targetStatus === 'REJECTED' ? rejectionReason : undefined);
    persistentUsers[persistentRecordKey!].status = targetStatus;
    savePersistentUsers(persistentUsers);
  }
  updateRuntimeVendorProfile(vendorId, undefined, undefined, targetStatus, targetStatus === 'REJECTED' ? rejectionReason : undefined);

  // 2. Synchronize status transition to PostgreSQL Database
  if (dbVendor) {
    try {
      await prisma.vendor.update({
        where: { id: dbVendor.id },
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
      } else if (targetStatus === 'APPROVED' && dbVendor.user?.isSuspended) {
        await prisma.user.update({
          where: { id: dbVendor.userId },
          data: { isSuspended: false },
        }).catch(() => {});
      }
    } catch (e: any) {
      console.warn('Prisma DB status update warning:', e.message);
    }
  }

  // 3. Trigger Real Transactional Email Dispatch directly to recipient's email address
  let emailResult: any = null;
  if (vendorEmail) {
    if (targetStatus === 'APPROVED') {
      emailResult = await sendVendorApprovalEmail(vendorEmail, companyName).catch(() => null);
    } else if (targetStatus === 'REJECTED') {
      emailResult = await sendVendorRejectionEmail(vendorEmail, companyName, rejectionReason || 'Compliance documentation verification failed').catch(() => null);
    }
  }

  await logAuditEvent({
    userId: adminUser.id,
    role: adminUser.role,
    action: `VENDOR_STATUS_TRANSITION_${targetStatus}`,
    module: 'VENDOR_MANAGEMENT',
    targetId: vendorId,
    payloadJson: {
      companyName: companyName || dbVendor?.companyName || persistentRecord?.companyName,
      vendorEmail,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      rejectionReason,
      emailDispatched: emailResult ? emailResult.success : false,
      emailMode: emailResult ? emailResult.mode : 'logged',
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: targetStatus === 'APPROVED'
      ? `Vendor account APPROVED! Transactional confirmation email dispatched to ${vendorEmail || 'vendor'}.`
      : targetStatus === 'REJECTED'
      ? `Vendor application REJECTED. Formal rejection notification email sent to ${vendorEmail || 'vendor'}.`
      : `Vendor status updated to ${targetStatus}.`,
    vendor: {
      id: vendorId,
      status: targetStatus,
      rejectionReason: targetStatus === 'REJECTED' ? rejectionReason : null,
    },
    emailDispatchedTo: vendorEmail,
  });
}
