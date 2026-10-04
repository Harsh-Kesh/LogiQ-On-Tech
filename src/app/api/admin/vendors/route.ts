import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAbnAcnCompliance } from '@/lib/vendor-metrics';
import bcrypt from 'bcryptjs';

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
      poEmail: v?.poEmail || null,
      apEmail: v?.apEmail || null,
      paymentTerms: v?.paymentTerms || null,
      currency: v?.currency || 'AUD',
      bankBsb: v?.bankBsb || null,
      bankAccountNumber: v?.bankAccountNumber || null,
      bankAccountName: v?.bankAccountName || null,
      myobContactId: v?.myobContactId || null,
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

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { vendorId, poEmail, apEmail, paymentTerms, currency, bankBsb, bankAccountNumber, bankAccountName, myobContactId } = body;
  if (!vendorId) return NextResponse.json({ error: 'vendorId required' }, { status: 400 });

  const data: any = {};
  if (poEmail !== undefined) data.poEmail = poEmail || null;
  if (apEmail !== undefined) data.apEmail = apEmail || null;
  if (paymentTerms !== undefined) data.paymentTerms = paymentTerms || null;
  if (currency !== undefined) data.currency = currency || 'AUD';
  if (bankBsb !== undefined) data.bankBsb = bankBsb || null;
  if (bankAccountNumber !== undefined) data.bankAccountNumber = bankAccountNumber || null;
  if (bankAccountName !== undefined) data.bankAccountName = bankAccountName || null;
  if (myobContactId !== undefined) data.myobContactId = myobContactId || null;

  const updated = await prisma.vendor.update({ where: { id: vendorId }, data });
  return NextResponse.json({ success: true, vendor: updated });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const {
    companyName, abnAcn, poEmail, apEmail,
    businessRegisteredAddress, paymentTerms, currency,
    bankBsb, bankAccountNumber, bankAccountName, myobContactId,
  } = body;

  // Only the platform owner ever logs in to manage suppliers — there is no supplier
  // self-service portal — so company name and PO email are the only real requirements.
  // Everything else (ABN/ACN, address, payment terms, bank details) can be added later.
  if (!companyName?.trim()) return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
  if (!poEmail?.trim()) return NextResponse.json({ error: 'PO email is required.' }, { status: 400 });

  // Vendor requires a linked User record (schema constraint) even though suppliers
  // never log in themselves — generate both silently so the owner never has to think
  // about it. A unique placeholder avoids any collision with real accounts.
  const placeholderSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const loginEmail = `supplier-${placeholderSuffix}@internal.logiqon.app`;
  const contactName = `${companyName.trim()} (Supplier Contact)`;

  let finalAbnAcn = abnAcn?.trim();
  if (finalAbnAcn) {
    const existingAbn = await prisma.vendor.findUnique({ where: { abnAcn: finalAbnAcn } });
    if (existingAbn) return NextResponse.json({ error: 'A supplier with this ABN/ACN already exists.' }, { status: 409 });
  } else {
    finalAbnAcn = `PENDING-${placeholderSuffix}`;
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const newUser = await prisma.user.create({
    data: {
      email: loginEmail,
      fullName: contactName,
      role: 'VENDOR',
      passwordHash,
      vendor: {
        create: {
          companyName: companyName.trim(),
          abnAcn: finalAbnAcn,
          status: 'APPROVED',
          approvedAt: new Date(),
          poEmail: poEmail.trim() || null,
          apEmail: apEmail?.trim() || null,
          businessRegisteredAddress: businessRegisteredAddress?.trim() || null,
          paymentTerms: paymentTerms?.trim() || null,
          currency: currency?.trim() || 'AUD',
          bankBsb: bankBsb?.trim() || null,
          bankAccountNumber: bankAccountNumber?.trim() || null,
          bankAccountName: bankAccountName?.trim() || null,
          myobContactId: myobContactId?.trim() || null,
        },
      },
    },
    include: { vendor: true },
  });

  return NextResponse.json({ success: true, vendor: newUser.vendor }, { status: 201 });
}
