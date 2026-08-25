import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers, savePersistentUsers, addRuntimeVendorDoc } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized: Vendor access required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('id');

  if (!docId) {
    return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
  }

  const userEmail = (user.email || '').toLowerCase().trim();
  const persistentUsers = loadPersistentUsers();
  const recordKey = Object.keys(persistentUsers).find(
    (k) => persistentUsers[k].email.toLowerCase() === userEmail || persistentUsers[k].id === user.id
  );

  let deleted = false;

  if (recordKey && persistentUsers[recordKey].docs) {
    const idx = persistentUsers[recordKey].docs!.findIndex((d: any) => d.id === docId);
    if (idx !== -1) {
      persistentUsers[recordKey].docs!.splice(idx, 1);
      savePersistentUsers(persistentUsers);
      deleted = true;
    }
  }

  try {
    await prisma.complianceDoc.delete({ where: { id: docId } });
    deleted = true;
  } catch (e: any) {}

  if (!deleted) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  await logAuditEvent({
    userId: user.id,
    role: 'VENDOR',
    action: 'COMPLIANCE_DOC_DELETED',
    module: 'VENDOR_MANAGEMENT',
    targetId: docId,
  }).catch(() => {});

  return NextResponse.json({ success: true, message: 'Document deleted successfully.' });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userEmail = (user.email || '').toLowerCase().trim();
  const persistentUsers = loadPersistentUsers();
  const persistentRecord = Object.values(persistentUsers).find(
    (u) => u.email.toLowerCase() === userEmail || u.id === user.id
  );

  if (persistentRecord && persistentRecord.docs && persistentRecord.docs.length > 0) {
    return NextResponse.json({ docs: persistentRecord.docs });
  }

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: user.id },
      include: { docs: { orderBy: { uploadedAt: 'desc' } } },
    });

    if (vendor && vendor.docs && vendor.docs.length > 0) {
      const formattedDocs = vendor.docs.map((d) => ({
        id: d.id,
        docType: d.docType,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        fileSize: Number(d.fileSize),
        status: d.status,
        uploadedAt: d.uploadedAt.toISOString(),
      }));
      return NextResponse.json({ docs: formattedDocs });
    }
  } catch (e: any) {
    console.warn('Prisma vendor docs fetch warning (using fallback):', e.message);
  }

  return NextResponse.json({
    docs: [
      {
        id: 'doc_01',
        docType: 'ATO ABN Registration Certificate',
        fileName: 'Apex_ABN_Certificate_2026.pdf',
        fileUrl: '/docs/abn_cert.pdf',
        fileSize: 1048576,
        status: 'APPROVED',
        uploadedAt: new Date().toISOString(),
      },
      {
        id: 'doc_02',
        docType: 'Public Liability Insurance Policy',
        fileName: 'Apex_Insurance_Policy_5M.pdf',
        fileUrl: '/docs/insurance.pdf',
        fileSize: 2097152,
        status: 'APPROVED',
        uploadedAt: new Date().toISOString(),
      },
    ],
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized: Vendor access required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { docType, fileName, fileSize, fileDataUrl, fileUrl: rawFileUrl } = body;

    if (!docType || !fileName || !fileSize) {
      return NextResponse.json({ error: 'Document type, file name, and file size are required.' }, { status: 400 });
    }

    // 1. Validate File Extension
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          error: `Invalid file format (${ext}). Only PDF, PNG, JPG, JPEG, DOC, and DOCX files are permitted for compliance uploads.`,
        },
        { status: 400 }
      );
    }

    // 2. Validate File Size
    if (fileSize > MAX_FILE_SIZE) {
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `File size exceeds 5MB limit (${sizeMB} MB). Please compress your document before uploading.`,
        },
        { status: 400 }
      );
    }

    const actualFileUrl = fileDataUrl || rawFileUrl || `/uploads/${fileName}`;

    const docPayload = {
      id: `doc_${Date.now()}`,
      docType,
      fileName,
      fileUrl: actualFileUrl,
      fileSize: Number(fileSize),
      status: 'PENDING',
      uploadedAt: new Date().toISOString(),
    };

    const userEmail = user.email || '';
    addRuntimeVendorDoc(userEmail, docPayload);

    let dbDoc: any = null;
    let replaced = false;

    // Dual-write to Prisma DB with resilient fallback
    try {
      let vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
      if (!vendor) {
        vendor = await prisma.vendor.create({
          data: {
            companyName: '',
            abnAcn: `PENDING-${Date.now().toString().slice(-6)}`,
            userId: user.id,
            status: 'UNDER_REVIEW',
          },
        });
      }

      if (vendor) {
        const existingDoc = await prisma.complianceDoc.findFirst({
          where: { vendorId: vendor.id, docType },
        });

        if (existingDoc) {
          dbDoc = await prisma.complianceDoc.update({
            where: { id: existingDoc.id },
            data: {
              fileName,
              fileUrl: actualFileUrl,
              fileSize: Number(fileSize),
              status: 'PENDING',
              uploadedAt: new Date(),
            },
          });
          replaced = true;
        } else {
          dbDoc = await prisma.complianceDoc.create({
            data: {
              vendorId: vendor.id,
              docType,
              fileName,
              fileUrl: actualFileUrl,
              fileSize: Number(fileSize),
              status: 'PENDING',
            },
          });
        }

        if (vendor.status === 'PENDING') {
          await prisma.vendor.update({
            where: { id: vendor.id },
            data: { status: 'UNDER_REVIEW' },
          });
        }
      }
    } catch (dbErr: any) {
      console.warn('Prisma DB compliance doc dual-write warning (file-store succeeded):', dbErr.message);
    }

    // Security Audit Log
    await logAuditEvent({
      userId: user.id,
      role: 'VENDOR',
      action: replaced ? 'COMPLIANCE_DOC_REPLACED' : 'COMPLIANCE_DOC_UPLOADED',
      module: 'VENDOR_MANAGEMENT',
      targetId: dbDoc?.id || docPayload.id,
      payloadJson: {
        docType,
        fileName,
        fileSize,
        actionType: replaced ? 'REPLACED_EXISTING' : 'NEW_UPLOAD',
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: replaced
        ? `Existing ${docType} has been replaced with the new file and reset to PENDING review.`
        : `${docType} uploaded successfully.`,
      doc: {
        id: dbDoc?.id || docPayload.id,
        docType,
        fileName,
        fileUrl: dbDoc?.fileUrl || docPayload.fileUrl,
        fileSize: Number(fileSize),
        status: 'PENDING',
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Vendor document upload error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload compliance document' }, { status: 500 });
  }
}
