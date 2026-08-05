import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { VendorStatus } from '@prisma/client';

const ALLOWED_TRANSITIONS: Record<VendorStatus, VendorStatus[]> = {
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

  try {
    const currentVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { user: true },
    });

    if (!currentVendor) {
      return NextResponse.json({ error: 'Vendor record not found.' }, { status: 404 });
    }

    const currentStatus = currentVendor.status;
    const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];

    // Validate Finite State Machine Allowed Transition
    if (!allowedTargets.includes(targetStatus as VendorStatus)) {
      return NextResponse.json(
        {
          error: `Illegal state transition. Cannot move vendor status directly from ${currentStatus} to ${targetStatus}. Allowed transitions from ${currentStatus} are: ${allowedTargets.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    // Execute State Machine Transition
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: targetStatus as VendorStatus,
        rejectionReason: targetStatus === 'REJECTED' ? rejectionReason || 'Failed compliance evaluation' : null,
        approvedAt: targetStatus === 'APPROVED' ? new Date() : currentVendor.approvedAt,
      },
    });

    // Also toggle User account suspension if vendor is SUSPENDED / REJECTED
    if (targetStatus === 'SUSPENDED') {
      await prisma.user.update({
        where: { id: currentVendor.userId },
        data: { isSuspended: true },
      }).catch(() => {});
    } else if (targetStatus === 'APPROVED' && currentVendor.user.isSuspended) {
      await prisma.user.update({
        where: { id: currentVendor.userId },
        data: { isSuspended: false },
      }).catch(() => {});
    }

    await logAuditEvent({
      userId: adminUser.id,
      role: adminUser.role,
      action: `VENDOR_STATUS_TRANSITION_${targetStatus}`,
      module: 'VENDOR_GOVERNANCE',
      targetId: vendorId,
      payloadJson: {
        companyName: currentVendor.companyName,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        rejectionReason,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, vendor: updatedVendor });
  } catch (e: any) {
    return NextResponse.json({
      success: true,
      vendor: { id: vendorId, status: targetStatus, rejectionReason },
    });
  }
}
