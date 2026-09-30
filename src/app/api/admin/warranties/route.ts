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
    orderBy: { warrantyExpiryDate: 'asc' },
    take: 500,
  });

  return NextResponse.json(records);
}
