import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orders = await prisma.storefrontOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { items: true },
  });

  return NextResponse.json(orders);
}
