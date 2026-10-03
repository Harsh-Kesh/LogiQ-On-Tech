import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

  const emails = await prisma.emailLog.findMany({
    orderBy: { sentAt: 'desc' },
    take: limit,
    select: { id: true, to: true, cc: true, subject: true, sentAt: true, mode: true, orderId: true },
  });

  return NextResponse.json(emails);
}
