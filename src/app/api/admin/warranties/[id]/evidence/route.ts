import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const files = await prisma.warrantyEvidence.findMany({
    where: { warrantyId: params.id },
    orderBy: { uploadedAt: 'asc' },
    select: { id: true, fileName: true, fileType: true, uploadedBy: true, uploadedAt: true },
  });

  return NextResponse.json(files);
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const warranty = await prisma.warrantyRecord.findUnique({ where: { id: params.id } });
  if (!warranty) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { fileName, fileType, fileData } = await req.json();
  if (!fileName || !fileType || !fileData) {
    return NextResponse.json({ error: 'fileName, fileType, and fileData are required' }, { status: 400 });
  }

  // Limit individual file to ~10 MB base64 (~7.5 MB raw)
  if (fileData.length > 14_000_000) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
  }

  const evidence = await prisma.warrantyEvidence.create({
    data: {
      warrantyId: params.id,
      fileName,
      fileType,
      fileData,
      uploadedBy: (session?.user as any)?.email || 'owner',
    },
  });

  return NextResponse.json({ id: evidence.id, fileName: evidence.fileName, fileType: evidence.fileType, uploadedAt: evidence.uploadedAt });
}
