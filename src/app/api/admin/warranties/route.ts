import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const records = await prisma.warrantyRecord.findMany({
    orderBy: [{ status: 'asc' }, { warrantyExpiryDate: 'asc' }],
    take: 500,
    select: {
      id: true,
      warrantyNumber: true,
      partNumber: true,
      partDescription: true,
      serialNumber: true,
      customerName: true,
      salesOrderNumber: true,
      vendorName: true,
      warrantyStartDate: true,
      warrantyStartRule: true,
      warrantyExpiryDate: true,
      warrantyPeriodMonths: true,
      remainingDays: true,
      status: true,
      overrideReason: true,
      overriddenBy: true,
      closedAt: true,
      closedBy: true,
    },
  });

  return NextResponse.json(records);
}
