import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, updateRuntimeVendorProfile } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { checkAbnAcnCompliance } from '@/lib/vendor-metrics';
import { isValidAbnAcn } from '@/lib/validation';

// Registration documents are for the Platform Owner's review only — once a vendor
// uploads one, they lose the ability to view or download it again (see the compliance
// docs note in api/vendor/documents/route.ts). Strip fileUrl for anyone but the owner.
function sanitizeDocsForRole(docs: any[], role: string) {
  if (role === 'PLATFORM_OWNER') return docs;
  return (docs || []).map(({ fileUrl, ...rest }) => rest);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'VENDOR' && user.role !== 'PLATFORM_OWNER')) {
    return NextResponse.json({ error: 'Unauthorized: Vendor access required.' }, { status: 403 });
  }

  const dbVendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
    include: {
      user: { select: { email: true, fullName: true } },
      docs: { orderBy: { uploadedAt: 'desc' } },
      warehouseAssignments: { include: { warehouse: true } },
    },
  });

  const compliance = checkAbnAcnCompliance(dbVendor?.abnAcn || '');

  if (dbVendor) {
    return NextResponse.json({
      vendor: {
        ...dbVendor,
        abnAcnVerified: compliance.verified,
        abnAcnMessage: compliance.message,
        docs: sanitizeDocsForRole(dbVendor.docs || [], user.role),
      },
    });
  }

  // Newly Registered Vendors start with PENDING
  return NextResponse.json({
    vendor: {
      id: `vnd_${user.id}`,
      companyName: '',
      abnAcn: '',
      businessRegisteredAddress: '',
      businessLocation: '',
      abnAcnVerified: false,
      abnAcnMessage: 'Not Submitted',
      status: 'PENDING',
      userId: user.id,
      user: { email: user.email, fullName: user.name || 'New Vendor Account' },
      createdAt: new Date().toISOString(),
      docs: [],
    },
  });
}

// Vendor self-service registration: company details + statutory address fields. Once a
// vendor is APPROVED, the details are locked — see the statutory-lock check below —
// consistent with the "documents can't be re-edited after upload" rule for the docs
// themselves.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized: Vendor access required.' }, { status: 403 });
  }

  const { companyName, abnAcn, businessRegisteredAddress, businessLocation } = await req.json();

  if (!companyName || !abnAcn || !businessRegisteredAddress) {
    return NextResponse.json({ error: 'Company Name, ABN/ACN, and Business Registered Address are required.' }, { status: 400 });
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

  const existingVendor = await prisma.vendor.findUnique({ where: { userId: user.id } });

  if (existingVendor?.status === 'APPROVED' && existingVendor.abnAcn && existingVendor.companyName) {
    if (existingVendor.abnAcn !== cleanAbn || existingVendor.companyName !== companyName.trim()) {
      return NextResponse.json(
        {
          error: `Statutory Lock Active: Your vendor entity (${existingVendor.companyName} - ABN: ${existingVendor.abnAcn}) has already been approved. To request a change of registered company details, please contact Platform Support.`,
        },
        { status: 403 }
      );
    }
  }

  const nextStatus = existingVendor?.status === 'APPROVED' ? 'APPROVED' : 'UNDER_REVIEW';

  const vendor = await updateRuntimeVendorProfile(
    user.email,
    companyName.trim(),
    cleanAbn,
    nextStatus,
    undefined,
    businessRegisteredAddress?.trim(),
    businessLocation?.trim()
  );

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'VENDOR_PROFILE_UPDATED',
    module: 'VENDOR_MANAGEMENT',
    targetId: vendor?.id,
    payloadJson: { companyName, abnAcn: cleanAbn, businessRegisteredAddress, businessLocation, status: nextStatus },
  }).catch(() => {});

  const docs = await prisma.complianceDoc.findMany({ where: { vendorId: vendor?.id }, orderBy: { uploadedAt: 'desc' } });

  return NextResponse.json({
    success: true,
    vendor: {
      ...vendor,
      docs: sanitizeDocsForRole(docs, 'VENDOR'),
    },
  });
}
