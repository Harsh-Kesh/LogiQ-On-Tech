import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

  let allVendors = dbVendorUsers.map((u) => {
    const v = u.vendor;
    const compliance = checkAbnAcnCompliance(v?.abnAcn || '');
    return {
      id: v?.id || `vnd_${u.id}`,
      companyName: v?.companyName || '',
      abnAcn: v?.abnAcn || '',
      businessRegisteredAddress: v?.businessRegisteredAddress || '',
      businessLocation: v?.businessLocation || '',
      abnAcnVerified: compliance.verified,
      abnAcnMessage: compliance.message,
      status: v?.status || 'PENDING',
      rejectionReason: v?.rejectionReason,
      userId: u.id,
      user: { id: u.id, email: u.email, fullName: u.fullName, isSuspended: u.isSuspended },
      createdAt: (v?.createdAt || u.createdAt).toISOString(),
      docs: v?.docs || [],
    };
  });

  if (statusFilter && statusFilter !== 'ALL') {
    allVendors = allVendors.filter((v) => v.status === statusFilter);
  }

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
