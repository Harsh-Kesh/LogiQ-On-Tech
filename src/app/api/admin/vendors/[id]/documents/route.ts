import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers, savePersistentUsers } from '@/lib/auth';
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

  let updatedDoc: any = null;

  // 1. Update in Persistent File Store
  const persistentUsers = loadPersistentUsers();
  const rawUserId = vendorId.replace('vnd_', '');

  Object.values(persistentUsers).forEach((u) => {
    if (u.id === rawUserId || u.id === vendorId || `vnd_${u.id}` === vendorId || u.docs?.some((d) => d.id === docId)) {
      if (u.docs) {
        const d = u.docs.find((doc) => doc.id === docId);
        if (d) {
          d.status = status;
          updatedDoc = d;
        }
      }
    }
  });

  savePersistentUsers(persistentUsers);

  // 2. Update in PostgreSQL DB
  try {
    const dbDoc = await prisma.complianceDoc.update({
      where: { id: docId },
      data: { status: status as any },
    });
    if (dbDoc) updatedDoc = dbDoc;
  } catch (e: any) {}

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
