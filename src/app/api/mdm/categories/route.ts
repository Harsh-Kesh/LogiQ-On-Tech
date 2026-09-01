import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadCategories, createCategory, updateCategory, deleteCategory, hasChildCategories } from '@/lib/categories';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const categories = await loadCategories();
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized: Platform Owner or Vendor role required.' }, { status: 403 });
  }

  try {
    const { name, parentId, description } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category Name is required.' }, { status: 400 });
    }

    const newCategory = await createCategory({ name, parentId, description });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'CATEGORY_CREATED',
      module: 'MASTER_DATA_MDM',
      targetId: newCategory.id,
      payloadJson: { name: newCategory.name, parentId },
    }).catch(() => {});

    return NextResponse.json({ success: true, category: newCategory });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create category.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category Name is required.' }, { status: 400 });
    }

    const categories = await loadCategories();
    const existing = categories.find((c) => c.id === id);
    if (!existing) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }

    const updated = await updateCategory(id, { name, description });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'CATEGORY_UPDATED',
      module: 'MASTER_DATA_MDM',
      targetId: id,
      payloadJson: { oldName: existing.name, newName: updated.name },
    }).catch(() => {});

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update category.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 });
    }

    const categories = await loadCategories();
    const target = categories.find((c) => c.id === id);

    if (!target) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }

    // Prevent deletion if category has children
    if (await hasChildCategories(id)) {
      return NextResponse.json(
        { error: 'Cannot delete a category that has subcategories. Remove all children first.' },
        { status: 400 }
      );
    }

    await deleteCategory(id);

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'CATEGORY_DELETED',
      module: 'MASTER_DATA_MDM',
      targetId: id,
      payloadJson: { name: target.name },
    }).catch(() => {});

    return NextResponse.json({ success: true, deleted: target.name });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete category.' }, { status: 500 });
  }
}
