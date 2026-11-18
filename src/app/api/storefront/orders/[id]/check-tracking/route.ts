// Owner action "Check courier now": runs the daily courier check for one DISPATCHED order.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkOrderTracking } from '@/lib/tracking';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const order = await prisma.storefrontOrder.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, trackingCarrier: true, sektorTrackingNumber: true },
  });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'DISPATCHED') return NextResponse.json({ error: `Order is ${order.status}, not Dispatched` }, { status: 422 });

  try {
    return NextResponse.json(await checkOrderTracking(order));
  } catch (err: any) {
    return NextResponse.json({ error: `Courier check failed: ${err.message}` }, { status: 502 });
  }
}
