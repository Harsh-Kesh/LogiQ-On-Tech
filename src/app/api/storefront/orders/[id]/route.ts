import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const order = await prisma.storefrontOrder.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { itemCode: 'asc' } },
      salesOrder: {
        select: {
          salesOrderNumber: true,
          status: true,
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(order);
}
