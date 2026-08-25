import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadUOMs, saveUOMs, UnitOfMeasureItem } from '@/lib/uom';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'MDM')) {
    return NextResponse.json({ error: 'Unauthorized: MDM or Owner role required.' }, { status: 403 });
  }

  try {
    const { id, name, description } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'UOM ID is required.' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'UOM Name is required.' }, { status: 400 });
    }

    const uoms = loadUOMs();
    const idx = uoms.findIndex((u) => u.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'UOM not found.' }, { status: 404 });
    }

    const oldName = uoms[idx].name;
    uoms[idx].name = name.trim();
    if (description !== undefined) uoms[idx].description = description;
    saveUOMs(uoms);

    try {
      await prisma.unitOfMeasure.update({
        where: { id },
        data: { name: name.trim(), description: description || uoms[idx].description },
      });
    } catch (e: any) {}

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'UOM_UPDATED',
      module: 'MASTER_DATA_MDM',
      targetId: id,
      payloadJson: { oldName, newName: name.trim() },
    }).catch(() => {});

    return NextResponse.json({ success: true, uom: uoms[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update UOM.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'MDM')) {
    return NextResponse.json({ error: 'Unauthorized: MDM or Owner role required.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'UOM ID is required.' }, { status: 400 });
    }

    const uoms = loadUOMs();
    const target = uoms.find((u) => u.id === id);

    if (!target) {
      return NextResponse.json({ error: 'UOM not found.' }, { status: 404 });
    }

    // Prevent deletion of default system UOMs
    const systemCodes = ['PCS', 'BOX', 'CTN', 'PLT', 'KG', 'MTR', 'PK'];
    if (systemCodes.includes(target.code)) {
      return NextResponse.json(
        { error: `Cannot delete system UOM "${target.code}". System UOMs are protected.` },
        { status: 400 }
      );
    }

    const filtered = uoms.filter((u) => u.id !== id);
    saveUOMs(filtered);

    try {
      await prisma.unitOfMeasure.delete({ where: { id } });
    } catch (e: any) {}

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'UOM_DELETED',
      module: 'MASTER_DATA_MDM',
      targetId: id,
      payloadJson: { code: target.code, name: target.name },
    }).catch(() => {});

    return NextResponse.json({ success: true, deleted: target.code });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete UOM.' }, { status: 500 });
  }
}
