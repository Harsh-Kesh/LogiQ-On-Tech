import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAbnAcnCompliance } from '@/lib/vendor-metrics';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status');
  const searchQuery = searchParams.get('search')?.toLowerCase() || '';

  const combinedMap = new Map<string, any>();
  const persistentUsers = loadPersistentUsers();

  // 1. Seed Mock Demo Vendors
  const mockVendors = [
    {
      id: 'vnd_usr_vendor_01',
      companyName: 'Apex Hardware & Logistics Ltd',
      abnAcn: '51 824 753 556',
      status: 'APPROVED',
      userId: 'usr_vendor_01',
      user: { id: 'usr_vendor_01', email: 'vendor@logiqon.com', fullName: 'Apex Hardware Manager', isSuspended: false },
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      docs: [
        { id: 'doc_01', docType: 'ATO ABN Registration Certificate', fileName: 'Apex_ABN_Certificate.pdf', fileSize: 1048576, status: 'APPROVED', uploadedAt: new Date().toISOString() },
        { id: 'doc_02', docType: 'Public Liability Insurance', fileName: 'Apex_Insurance_5M.pdf', fileSize: 2097152, status: 'APPROVED', uploadedAt: new Date().toISOString() },
      ],
    },
    {
      id: 'vnd_usr_vendor_02',
      companyName: 'Nexus Global Supply Chain Solutions',
      abnAcn: '49 004 028 077',
      status: 'UNDER_REVIEW',
      userId: 'usr_vendor_02',
      user: { id: 'usr_vendor_02', email: 'vendor.nexus@logiqon.com', fullName: 'Nexus Supplier Ltd', isSuspended: false },
      createdAt: new Date().toISOString(),
      docs: [
        { id: 'doc_03', docType: 'ATO ABN Registration Certificate', fileName: 'Nexus_ABN_Doc.pdf', fileSize: 512000, status: 'PENDING', uploadedAt: new Date().toISOString() },
      ],
    },
    {
      id: 'vnd_usr_vendor_03',
      companyName: 'Pacific Freight & Logistics Group',
      abnAcn: '33 102 417 032',
      status: 'PENDING',
      userId: 'usr_vendor_03',
      user: { id: 'usr_vendor_03', email: 'pacific@logiqon.com', fullName: 'Pacific Freight Manager', isSuspended: false },
      createdAt: new Date().toISOString(),
      docs: [],
    },
  ];

  mockVendors.forEach((v) => {
    const pUser = persistentUsers[v.user.email.toLowerCase()];
    const realStatus = pUser?.status || v.status;
    const compliance = checkAbnAcnCompliance(pUser?.abnAcn || v.abnAcn);
    combinedMap.set(v.user.email.toLowerCase(), {
      ...v,
      status: realStatus,
      abnAcnVerified: compliance.verified,
      abnAcnMessage: compliance.message,
    });
  });

  // 2. Fetch PostgreSQL DB Users with role VENDOR
  try {
    const dbVendorUsers = await prisma.user.findMany({
      where: { role: 'VENDOR' },
      include: {
        vendor: {
          include: {
            docs: { orderBy: { uploadedAt: 'desc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    dbVendorUsers.forEach((u) => {
      const emailLower = u.email.toLowerCase();
      const existing = combinedMap.get(emailLower);
      const v = u.vendor;
      const pUser = persistentUsers[emailLower];
      const realStatus = pUser?.status || v?.status || existing?.status || 'PENDING';
      const vendorIdResolved = v?.id || existing?.id || `vnd_${u.id}`;
      const abnAcnResolved = v?.abnAcn || pUser?.abnAcn || existing?.abnAcn || '';
      const compliance = checkAbnAcnCompliance(abnAcnResolved);

      combinedMap.set(emailLower, {
        id: vendorIdResolved,
        companyName: v?.companyName || pUser?.companyName || existing?.companyName || '',
        abnAcn: abnAcnResolved,
        abnAcnVerified: compliance.verified,
        abnAcnMessage: compliance.message,
        status: realStatus,
        rejectionReason: v?.rejectionReason || pUser?.rejectionReason || existing?.rejectionReason,
        userId: u.id,
        user: { id: u.id, email: u.email, fullName: u.fullName, isSuspended: u.isSuspended },
        createdAt: v?.createdAt?.toISOString() || u.createdAt.toISOString(),
        docs: v?.docs && v.docs.length > 0 ? v.docs : pUser?.docs || existing?.docs || [],
      });
    });
  } catch (e: any) {
    console.warn('Prisma DB query warning in vendor directory API:', e.message);
  }

  // 3. Fetch Persistent File-Store Registered Users with role VENDOR
  Object.values(persistentUsers)
    .filter((u) => u.role === 'VENDOR')
    .forEach((u) => {
      const emailLower = u.email.toLowerCase();
      const existing = combinedMap.get(emailLower);

      const realStatus = u.status || existing?.status || 'PENDING';
      const vendorIdResolved = existing?.id || `vnd_${u.id}`;
      const abnAcnResolved = u.abnAcn || existing?.abnAcn || '';
      const compliance = checkAbnAcnCompliance(abnAcnResolved);

      combinedMap.set(emailLower, {
        id: vendorIdResolved,
        companyName: u.companyName || existing?.companyName || '',
        abnAcn: abnAcnResolved,
        abnAcnVerified: compliance.verified,
        abnAcnMessage: compliance.message,
        status: realStatus,
        rejectionReason: u.rejectionReason || existing?.rejectionReason,
        userId: u.id,
        user: { id: u.id, email: u.email, fullName: u.fullName, isSuspended: false },
        createdAt: u.createdAt,
        docs: u.docs && u.docs.length > 0 ? u.docs : existing?.docs || [],
      });
    });

  let allVendors = Array.from(combinedMap.values());

  // Apply Status Filtering
  if (statusFilter && statusFilter !== 'ALL') {
    allVendors = allVendors.filter((v) => v.status === statusFilter);
  }

  // Apply Search Filtering
  if (searchQuery) {
    allVendors = allVendors.filter(
      (v) =>
        (v.companyName || '').toLowerCase().includes(searchQuery) ||
        (v.abnAcn || '').toLowerCase().includes(searchQuery) ||
        (v.user?.email || '').toLowerCase().includes(searchQuery) ||
        (v.user?.fullName || '').toLowerCase().includes(searchQuery)
    );
  }

  return NextResponse.json({ vendors: allVendors });
}
