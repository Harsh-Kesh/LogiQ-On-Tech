import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadCategories, saveCategories, CategoryItem } from '@/lib/categories';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
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
