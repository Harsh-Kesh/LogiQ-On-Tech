// Dashboard tracking link: redirects to the courier's page for this order (TNT's link has to be
// looked up, so the order page links here instead of to a fixed URL).
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveTrackingUrl } from '@/lib/dispatch';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const o = await prisma.storefrontOrder.findUnique({ where: { id: params.id }, select: { trackingCarrier: true, sektorTrackingNumber: true } });
  if (!o?.sektorTrackingNumber) return NextResponse.json({ error: 'No tracking number on this order' }, { status: 404 });

  const url = await resolveTrackingUrl(o.trackingCarrier, o.sektorTrackingNumber);
  return url ? NextResponse.redirect(url) : NextResponse.json({ error: 'No tracking link for this carrier' }, { status: 404 });
}
