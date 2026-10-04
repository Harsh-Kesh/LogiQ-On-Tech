import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await prisma.storefrontOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: { orderBy: { itemCode: 'asc' } },
      salesOrder: { select: { salesOrderNumber: true, status: true } },
    },
  });

  return NextResponse.json(orders);
}
