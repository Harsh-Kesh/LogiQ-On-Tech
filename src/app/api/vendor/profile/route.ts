import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers, updateRuntimeVendorProfile } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { checkAbnAcnCompliance } from '@/lib/vendor-metrics';
import { isValidAbnAcn } from '@/lib/validation';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'VENDOR' && user.role !== 'PLATFORM_OWNER')) {
    return NextResponse.json({ error: 'Unauthorized: Vendor access required.' }, { status: 403 });
  }

  const userId = user.id;
  const userEmail = (user.email || '').toLowerCase().trim();

  // 1. Check persistent file store
  const persistentUsers = loadPersistentUsers();
  const persistentRecord = Object.values(persistentUsers).find(
    (u) => u.email.toLowerCase() === userEmail || u.id === userId
  );

  let dbVendor: any = null;
  try {
    dbVendor = await prisma.vendor.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, fullName: true } },
        docs: { orderBy: { uploadedAt: 'desc' } },
        warehouseAssignments: { include: { warehouse: true } },
      },
    });
  } catch (e: any) {}

  // Determine current status consistently
  const effectiveStatus = persistentRecord?.status || dbVendor?.status || 'PENDING';

  const vendorId = dbVendor?.id || `vnd_${userId}`;
  const abnAcnValue = persistentRecord?.abnAcn || dbVendor?.abnAcn || '';
  const compliance = checkAbnAcnCompliance(abnAcnValue);

  if (persistentRecord && (persistentRecord.companyName || persistentRecord.abnAcn || (persistentRecord.docs && persistentRecord.docs.length > 0))) {
    return NextResponse.json({
      vendor: {
        id: vendorId,
        companyName: persistentRecord.companyName || dbVendor?.companyName || '',
        abnAcn: persistentRecord.abnAcn || dbVendor?.abnAcn || '',
        abnAcnVerified: compliance.verified,
        abnAcnMessage: compliance.message,
        status: effectiveStatus,
        rejectionReason: persistentRecord.rejectionReason || dbVendor?.rejectionReason,
        userId: persistentRecord.id,
        user: { email: persistentRecord.email, fullName: persistentRecord.fullName },
        createdAt: persistentRecord.createdAt,
        docs: persistentRecord.docs || dbVendor?.docs || [],
      },
    });
  }

  if (dbVendor) {
    return NextResponse.json({
      vendor: {
        ...dbVendor,
        status: effectiveStatus,
        abnAcnVerified: compliance.verified,
        abnAcnMessage: compliance.message,
      },
    });
  }

  // Demo seed account fallback for preset default vendor
  if (user.email === 'vendor@logiqon.com' || userId === 'usr_vendor_01') {
    const demoVendorId = `vnd_${userId || 'usr_vendor_01'}`;
    const demoCompliance = checkAbnAcnCompliance('51 824 753 556');
    return NextResponse.json({
      vendor: {
        id: demoVendorId,
        companyName: 'Apex Hardware & Logistics Ltd',
        abnAcn: '51 824 753 556',
        abnAcnVerified: demoCompliance.verified,
        abnAcnMessage: demoCompliance.message,
        status: effectiveStatus,
        userId: userId || 'usr_vendor_01',
        user: { email: user.email, fullName: user.name || 'Apex Hardware Manager' },
        createdAt: new Date().toISOString(),
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
      },
    });
  }

  // Newly Registered Vendors start with PENDING
  return NextResponse.json({
    vendor: {
      id: vendorId,
      companyName: '',
      abnAcn: '',
      abnAcnVerified: false,
      abnAcnMessage: 'Not Submitted',
      status: persistentRecord?.status || 'PENDING',
      userId: userId,
      user: { email: user.email, fullName: user.name || 'New Vendor Account' },
      createdAt: new Date().toISOString(),
      docs: [],
    },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized: Vendor access required.' }, { status: 403 });
  }

  const { companyName, abnAcn } = await req.json();

  if (!companyName || !abnAcn) {
    return NextResponse.json({ error: 'Company Name and ABN/ACN are required.' }, { status: 400 });
  }

  // 1. Validate Australian ABN (11 digits) or ACN (9 digits) with ATO/ASIC checksum
  const cleanAbn = abnAcn.replace(/\s+/g, '');
  const abnValidation = isValidAbnAcn(cleanAbn);
  if (!abnValidation.valid) {
    return NextResponse.json(
      { error: abnValidation.message || 'Invalid ABN/ACN.' },
      { status: 400 }
    );
  }

  // Save to persistent file store using user.email
  const userEmail = user.email || '';
  updateRuntimeVendorProfile(userEmail, companyName, cleanAbn, 'UNDER_REVIEW');

  const persistentUsers = loadPersistentUsers();
  const persistentRecord = persistentUsers[userEmail.toLowerCase().trim()];
  const currentDocs = persistentRecord?.docs || [];

  try {
    const existingVendor = await prisma.vendor.findUnique({
      where: { userId: user.id },
    });

    if (existingVendor && existingVendor.status === 'APPROVED' && existingVendor.abnAcn && existingVendor.companyName) {
      if (existingVendor.abnAcn !== cleanAbn || existingVendor.companyName !== companyName.trim()) {
        return NextResponse.json(
          {
            error: `Statutory Lock Active: Your vendor entity (${existingVendor.companyName} - ABN: ${existingVendor.abnAcn}) has been approved by ATO governance. To request a change of registered company details, please contact Platform Support.`,
          },
          { status: 403 }
        );
      }
    }

    const nextStatus = existingVendor?.status === 'APPROVED' ? 'APPROVED' : 'UNDER_REVIEW';

    const vendor = await prisma.vendor.upsert({
      where: { userId: user.id },
      update: {
        companyName,
        abnAcn: cleanAbn,
        status: nextStatus,
      },
      create: {
        companyName,
        abnAcn: cleanAbn,
        userId: user.id,
        status: 'UNDER_REVIEW',
      },
      include: { docs: true },
    });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'VENDOR_PROFILE_UPDATED',
      module: 'VENDOR_MANAGEMENT',
      targetId: vendor.id,
      payloadJson: { companyName, abnAcn: cleanAbn, status: vendor.status },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      vendor: {
        ...vendor,
        docs: vendor.docs && vendor.docs.length > 0 ? vendor.docs : currentDocs,
      },
    });
  } catch (e: any) {
    return NextResponse.json({
      success: true,
      vendor: {
        id: `vnd_${user.id}`,
        companyName,
        abnAcn: cleanAbn,
        status: 'UNDER_REVIEW',
        userId: user.id,
        user: { email: user.email, fullName: user.name || 'Vendor' },
        docs: currentDocs,
      },
    });
  }
}
