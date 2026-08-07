import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadUOMs, saveUOMs, UnitOfMeasureItem } from '@/lib/uom';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const uoms = loadUOMs();
  return NextResponse.json({ uoms });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'MDM')) {
    return NextResponse.json({ error: 'Unauthorized: MDM or Owner role required.' }, { status: 403 });
  }

  try {
    const { code, name, description } = await req.json();

    if (!code || !name) {
      return NextResponse.json({ error: 'UOM Code and Name are required.' }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();
    const id = `uom_${cleanCode.toLowerCase()}`;
    const newUOM: UnitOfMeasureItem = {
      id,
      code: cleanCode,
      name: name.trim(),
      description: description || '',
    };

    const uoms = loadUOMs();
    if (uoms.some((u) => u.code === cleanCode)) {
      return NextResponse.json({ error: `UOM code "${cleanCode}" already exists.` }, { status: 400 });
    }

    uoms.push(newUOM);
    saveUOMs(uoms);

    try {
      await prisma.unitOfMeasure.create({
        data: {
          id,
          code: cleanCode,
          name: newUOM.name,
          description: newUOM.description,
        },
      });
    } catch (e: any) {}

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'UOM_CREATED',
      module: 'MASTER_DATA_MDM',
      targetId: id,
      payloadJson: { code: cleanCode, name: newUOM.name },
    }).catch(() => {});

    return NextResponse.json({ success: true, uom: newUOM });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create UOM.' }, { status: 500 });
  }
}
