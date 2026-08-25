import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadCategories, saveCategories, CategoryItem } from '@/lib/categories';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const categories = loadCategories();
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'MDM')) {
    return NextResponse.json({ error: 'Unauthorized: MDM or Owner role required.' }, { status: 403 });
  }

  try {
    const { name, parentId, description } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category Name is required.' }, { status: 400 });
    }

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const id = `cat_${Date.now()}`;
    const newCategory: CategoryItem = {
      id,
      name: name.trim(),
      slug,
      parentId: parentId || null,
      description: description || '',
    };

    const categories = loadCategories();
    categories.push(newCategory);
    saveCategories(categories);

    try {
      await prisma.category.create({
        data: {
          id,
          name: newCategory.name,
          slug,
          parentId: parentId || null,
        },
      });
    } catch (e: any) {}

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'CATEGORY_CREATED',
      module: 'MASTER_DATA_MDM',
      targetId: id,
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

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'MDM')) {
    return NextResponse.json({ error: 'Unauthorized: MDM or Owner role required.' }, { status: 403 });
  }

  try {
    const { id, name, description } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category Name is required.' }, { status: 400 });
    }

    const categories = loadCategories();
    const idx = categories.findIndex((c) => c.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }

    const oldName = categories[idx].name;
    categories[idx].name = name.trim();
    categories[idx].slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    if (description !== undefined) categories[idx].description = description;
    saveCategories(categories);

    try {
      await prisma.category.update({
        where: { id },
        data: { name: name.trim(), slug: categories[idx].slug },
      });
    } catch (e: any) {}

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'CATEGORY_UPDATED',
      module: 'MASTER_DATA_MDM',
      targetId: id,
      payloadJson: { oldName, newName: name.trim() },
    }).catch(() => {});

    return NextResponse.json({ success: true, category: categories[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update category.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 });
    }

    const categories = loadCategories();
    const target = categories.find((c) => c.id === id);

    if (!target) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }

    // Prevent deletion if category has children
    const hasChildren = categories.some((c) => c.parentId === id);
    if (hasChildren) {
      return NextResponse.json(
        { error: 'Cannot delete a category that has subcategories. Remove all children first.' },
        { status: 400 }
      );
    }

    const filtered = categories.filter((c) => c.id !== id);
    saveCategories(filtered);

    try {
      await prisma.category.delete({ where: { id } });
    } catch (e: any) {}

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
