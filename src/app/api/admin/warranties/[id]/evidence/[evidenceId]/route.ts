import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Params = { params: { id: string; evidenceId: string } };

// Download evidence file (returns base64 + metadata)
export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const file = await prisma.warrantyEvidence.findFirst({
    where: { id: params.evidenceId, warrantyId: params.id },
  });
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(file);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const file = await prisma.warrantyEvidence.findFirst({
    where: { id: params.evidenceId, warrantyId: params.id },
  });
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.warrantyEvidence.delete({ where: { id: params.evidenceId } });
  return NextResponse.json({ success: true });
}
