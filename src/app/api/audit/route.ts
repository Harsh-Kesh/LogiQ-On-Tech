import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || (session.user as any).role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Unauthorized: Platform Owner permission required' }, { status: 403 });
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50,
    include: {
      user: {
        select: {
          email: true,
          fullName: true,
        },
      },
    },
  });

  return NextResponse.json({ logs });
}
