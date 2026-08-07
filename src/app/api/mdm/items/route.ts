import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentProducts, savePersistentProducts, PersistentProduct } from '@/lib/products';
import { loadCategories } from '@/lib/categories';
import { loadUOMs } from '@/lib/uom';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get('search') || '').toLowerCase().trim();
  const categoryId = searchParams.get('categoryId');
  const uomId = searchParams.get('uomId');
  const status = searchParams.get('status');

  const persistentProducts = loadPersistentProducts();
  let items = Object.values(persistentProducts);

  if (search) {
    items = items.filter(
      (i) =>
        i.itemName.toLowerCase().includes(search) ||
        i.sku.toLowerCase().includes(search) ||
        i.barcode.toLowerCase().includes(search)
    );
  }

  if (categoryId) {
    items = items.filter((i) => i.categoryId === categoryId);
  }

  if (uomId) {
    items = items.filter((i) => i.uomId === uomId);
  }

  if (status) {
    items = items.filter((i) => i.status === status);
  }

  return NextResponse.json({ items, total: items.length });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'MDM' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
  }

  try {
    const { itemName, sku, barcode, costPrice, sellingPrice, status, description, categoryId, uomId } = await req.json();

    if (!itemName || !itemName.trim()) {
      return NextResponse.json({ error: 'Item Name is required.' }, { status: 400 });
    }

    const cost = parseFloat(costPrice || '0');
    const selling = parseFloat(sellingPrice || '0');

    // Category Lookup
    const categories = loadCategories();
    const catObj = categories.find((c) => c.id === categoryId || c.slug === categoryId);
    const catName = catObj ? catObj.name : 'General Hardware';
    const catCode = catObj ? catObj.slug.split('-')[0].toUpperCase() : 'GEN';

    // UOM Lookup
    const uoms = loadUOMs();
    const uomObj = uoms.find((u) => u.id === uomId || u.code === uomId);
    const uomCode = uomObj ? uomObj.code : 'PCS';
    const uomName = uomObj ? uomObj.name : 'Pieces';

    // Auto SKU & Barcode Generation
    const seq = Math.floor(100 + Math.random() * 900);
    const finalSku = sku && sku.trim() ? sku.trim().toUpperCase() : `LQ-${catCode}-${seq}`;
    const finalBarcode = barcode && barcode.trim() ? barcode.trim() : `93123450${Math.floor(10000 + Math.random() * 89999)}`;
    const finalStatus = ['ACTIVE', 'DRAFT', 'DISCONTINUED'].includes(status) ? status : 'ACTIVE';

    const itemId = `item_${Date.now()}`;
    const newItem: PersistentProduct = {
      id: itemId,
      sku: finalSku,
      barcode: finalBarcode,
      itemName: itemName.trim(),
      description: description || '',
      costPrice: cost,
      sellingPrice: selling,
      status: finalStatus,
      vendorId: user.role === 'VENDOR' ? `vnd_${user.id}` : 'vnd_admin_owner',
      vendorEmail: user.email || 'admin@logiqon.tech',
      categoryId: catObj ? catObj.id : undefined,
      categoryName: catName,
      uomId: uomObj ? uomObj.id : undefined,
      uomCode,
      uomName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const persistentProducts = loadPersistentProducts();
    persistentProducts[itemId] = newItem;
    savePersistentProducts(persistentProducts);

    try {
      await prisma.itemMaster.create({
        data: {
          id: itemId,
          sku: finalSku,
          barcode: finalBarcode,
          itemName: newItem.itemName,
          description: newItem.description,
          costPrice: cost,
          sellingPrice: selling,
          status: finalStatus as any,
          vendorId: newItem.vendorId,
          categoryId: catObj ? catObj.id : null,
          uomId: uomObj ? uomObj.id : null,
        },
      });
    } catch (e: any) {}

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'ITEM_MASTER_CREATED',
      module: 'MASTER_DATA_MDM',
      targetId: itemId,
      payloadJson: { itemName: newItem.itemName, sku: finalSku, barcode: finalBarcode },
    }).catch(() => {});

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create item master.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'MDM' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
  }

  try {
    const { id, itemName, sku, barcode, costPrice, sellingPrice, status, description, categoryId, uomId } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Item ID required.' }, { status: 400 });
    }

    const persistentProducts = loadPersistentProducts();
    const item = persistentProducts[id];
    if (!item) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    // Category Lookup
    const categories = loadCategories();
    const catObj = categories.find((c) => c.id === categoryId || c.slug === categoryId);

    // UOM Lookup
    const uoms = loadUOMs();
    const uomObj = uoms.find((u) => u.id === uomId || u.code === uomId);

    item.itemName = itemName || item.itemName;
    if (sku) item.sku = sku.trim().toUpperCase();
    if (barcode) item.barcode = barcode.trim();
    if (costPrice !== undefined) item.costPrice = parseFloat(costPrice);
    if (sellingPrice !== undefined) item.sellingPrice = parseFloat(sellingPrice);
    if (status) item.status = status;
    if (description !== undefined) item.description = description;
    if (catObj) {
      item.categoryId = catObj.id;
      item.categoryName = catObj.name;
    }
    if (uomObj) {
      item.uomId = uomObj.id;
      item.uomCode = uomObj.code;
      item.uomName = uomObj.name;
    }
    item.updatedAt = new Date().toISOString();

    persistentProducts[id] = item;
    savePersistentProducts(persistentProducts);

    try {
      await prisma.itemMaster.update({
        where: { id },
        data: {
          itemName: item.itemName,
          sku: item.sku,
          barcode: item.barcode,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          status: item.status as any,
          description: item.description,
          categoryId: item.categoryId || null,
          uomId: item.uomId || null,
        },
      });
    } catch (e: any) {}

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'ITEM_MASTER_UPDATED',
      module: 'MASTER_DATA_MDM',
      targetId: id,
    }).catch(() => {});

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update item.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'MDM')) {
    return NextResponse.json({ error: 'Unauthorized: Owner or MDM role required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Item ID required.' }, { status: 400 });
  }

  const persistentProducts = loadPersistentProducts();
  if (persistentProducts[id]) {
    delete persistentProducts[id];
    savePersistentProducts(persistentProducts);
  }

  try {
    await prisma.itemMaster.delete({ where: { id } });
  } catch (e: any) {}

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'ITEM_MASTER_DELETED',
    module: 'MASTER_DATA_MDM',
    targetId: id,
  }).catch(() => {});

  return NextResponse.json({ success: true, message: 'Item master deleted successfully.' });
}
