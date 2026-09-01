import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadUOMs, createUOM, updateUOM, deleteUOM } from '@/lib/uom';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const uoms = await loadUOMs();
  return NextResponse.json({ uoms });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized: Platform Owner or Vendor role required.' }, { status: 403 });
  }

  try {
    const { code, name, description } = await req.json();

    if (!code || !name) {
      return NextResponse.json({ error: 'UOM Code and Name are required.' }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();
    const uoms = await loadUOMs();
    if (uoms.some((u) => u.code === cleanCode)) {
      return NextResponse.json({ error: `UOM code "${cleanCode}" already exists.` }, { status: 400 });
    }

    const newUOM = await createUOM({ code: cleanCode, name, description });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'UOM_CREATED',
      module: 'MASTER_DATA_MDM',
      targetId: newUOM.id,
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

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized: Platform Owner or Vendor role required.' }, { status: 403 });
  }

  try {
    const { id, name, description } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'UOM ID is required.' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'UOM Name is required.' }, { status: 400 });
    }

    const uoms = await loadUOMs();
    const existing = uoms.find((u) => u.id === id);
    if (!existing) {
      return NextResponse.json({ error: 'UOM not found.' }, { status: 404 });
    }

    const updated = await updateUOM(id, { name, description });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'UOM_UPDATED',
      module: 'MASTER_DATA_MDM',
      targetId: id,
      payloadJson: { oldName: existing.name, newName: updated.name },
    }).catch(() => {});

    return NextResponse.json({ success: true, uom: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update UOM.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized: Platform Owner or Vendor role required.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'UOM ID is required.' }, { status: 400 });
    }

    const uoms = await loadUOMs();
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

    await deleteUOM(id);

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
