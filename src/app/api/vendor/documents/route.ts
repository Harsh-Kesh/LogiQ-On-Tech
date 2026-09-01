import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, addRuntimeVendorDoc } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

// Once a compliance document is uploaded, the vendor who submitted it can no longer
// view or download it — only the Platform Owner can, from the Vendor Directory review
// screen. That's why GET here never returns fileUrl and there's no DELETE. Re-upload
// for the same doc type is only allowed once — if the Owner has since rejected it, a
// fresh upload is the vendor's one way to correct and resubmit; a PENDING or already
// APPROVED submission can't be silently replaced.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
    include: { docs: { orderBy: { uploadedAt: 'desc' } } },
  });

  const docs = (vendor?.docs || []).map((d) => ({
    id: d.id,
    docType: d.docType,
    fileName: d.fileName,
    fileSize: Number(d.fileSize),
    status: d.status,
    uploadedAt: d.uploadedAt.toISOString(),
  }));

  return NextResponse.json({ docs });
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

    // Block re-upload once a submission for this doc type exists, unless it was
    // rejected — that's the vendor's only path to correct and resubmit.
    const vendor = await prisma.vendor.findUnique({
      where: { userId: user.id },
      include: { docs: true },
    });
    const existingSubmission = vendor?.docs.find((d) => d.docType === docType);
    if (existingSubmission && existingSubmission.status !== 'REJECTED') {
      return NextResponse.json(
        { error: `${docType} has already been submitted (status: ${existingSubmission.status}) and can't be replaced unless it's rejected.` },
        { status: 400 }
      );
    }

    const actualFileUrl = fileDataUrl || rawFileUrl || `/uploads/${fileName}`;
    const replaced = Boolean(existingSubmission);

    const savedDoc = await addRuntimeVendorDoc(user.email, {
      docType,
      fileName,
      fileUrl: actualFileUrl,
      fileSize: Number(fileSize),
      status: 'PENDING',
    });

    await logAuditEvent({
      userId: user.id,
      role: 'VENDOR',
      action: replaced ? 'COMPLIANCE_DOC_REPLACED' : 'COMPLIANCE_DOC_UPLOADED',
      module: 'VENDOR_MANAGEMENT',
      targetId: savedDoc?.id,
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
        id: savedDoc?.id,
        docType,
        fileName,
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
