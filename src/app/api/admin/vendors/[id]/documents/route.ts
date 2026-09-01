import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const adminUser = session?.user as any;

  if (!adminUser || adminUser.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const vendorId = params.id;
  const { docId, status } = await req.json();

  if (!docId || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    return NextResponse.json({ error: 'Invalid document ID or status provided.' }, { status: 400 });
  }

  let updatedDoc;
  try {
    updatedDoc = await prisma.complianceDoc.update({
      where: { id: docId },
      data: { status },
    });
  } catch {
    return NextResponse.json({ error: 'Compliance document not found.' }, { status: 404 });
  }

  await logAuditEvent({
    userId: adminUser.id,
    role: adminUser.role,
    action: `COMPLIANCE_DOC_${status}`,
    module: 'VENDOR_MANAGEMENT',
    targetId: docId,
    payloadJson: { vendorId, docId, status },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `Compliance Document status updated to ${status}.`,
    doc: updatedDoc,
  });
}
