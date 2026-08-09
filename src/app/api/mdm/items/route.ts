import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentProducts, savePersistentProducts, PersistentProduct, calculateMarginAndMarkup } from '@/lib/products';
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
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const attrKey = searchParams.get('attrKey');
  const attrValue = (searchParams.get('attrValue') || '').toLowerCase().trim();

  const persistentProducts = loadPersistentProducts();
  let items = Object.values(persistentProducts);

  if (search) {
    items = items.filter(
      (i) =>
        i.itemName.toLowerCase().includes(search) ||
        i.sku.toLowerCase().includes(search) ||
        i.barcode.toLowerCase().includes(search) ||
        (i.description && i.description.toLowerCase().includes(search))
    );
  }

  if (categoryId) {
    items = items.filter((i) => i.categoryId === categoryId);
  }

  if (uomId) {
    items = items.filter((i) => i.uomId === uomId || i.uomCode === uomId);
  }

  if (status) {
    items = items.filter((i) => i.status === status);
  }

  if (minPrice) {
    const minP = parseFloat(minPrice);
    if (!isNaN(minP)) items = items.filter((i) => i.sellingPrice >= minP);
  }

  if (maxPrice) {
    const maxP = parseFloat(maxPrice);
    if (!isNaN(maxP)) items = items.filter((i) => i.sellingPrice <= maxP);
  }

  if (attrKey && attrValue) {
    items = items.filter((i) => {
      if (!i.attributes) return false;
      const val = i.attributes[attrKey];
      return val && val.toLowerCase().includes(attrValue);
    });
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
    const body = await req.json();
    const {
      itemName,
      sku,
      barcode,
      costPrice,
      sellingPrice,
      wholesalePrice,
      moq,
      status,
      description,
      categoryId,
      uomId,
      attributes,
    } = body;

    if (!itemName || !itemName.trim()) {
      return NextResponse.json({ error: 'Item Name is required.' }, { status: 400 });
    }

    const cost = parseFloat(costPrice || '0');
    const selling = parseFloat(sellingPrice || '0');
    const wholesale = wholesalePrice !== undefined && wholesalePrice !== '' ? parseFloat(wholesalePrice) : selling;
    const parsedMoq = moq !== undefined && moq !== '' ? parseInt(moq, 10) : 1;

    // Price Sanity Governance Validation
    if (isNaN(cost) || cost < 0 || isNaN(selling) || selling < 0) {
      return NextResponse.json({ error: 'Data Governance Lock: Prices must be non-negative numbers.' }, { status: 400 });
    }
    if (selling < cost) {
      return NextResponse.json(
        { error: `Data Governance Lock: Selling price ($${selling.toFixed(2)}) cannot be lower than cost price ($${cost.toFixed(2)}).` },
        { status: 400 }
      );
    }
    if (wholesale > selling) {
      return NextResponse.json(
        { error: `Data Governance Lock: Wholesale tier price ($${wholesale.toFixed(2)}) cannot exceed retail selling price ($${selling.toFixed(2)}).` },
        { status: 400 }
      );
    }
    if (isNaN(parsedMoq) || parsedMoq < 1) {
      return NextResponse.json({ error: 'Data Governance Lock: Minimum Order Quantity (MOQ) must be an integer >= 1.' }, { status: 400 });
    }

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

    // Global Duplicate Governance Validation Checks
    const persistentProducts = loadPersistentProducts();
    const existingItems = Object.values(persistentProducts);

    const duplicateSku = existingItems.find((i) => i.sku.toUpperCase() === finalSku);
    if (duplicateSku) {
      return NextResponse.json(
        { error: `Data Governance Lock: Duplicate SKU '${finalSku}' already exists in Master Data repository.` },
        { status: 400 }
      );
    }

    const duplicateBarcode = existingItems.find((i) => i.barcode === finalBarcode);
    if (duplicateBarcode) {
      return NextResponse.json(
        { error: `Data Governance Lock: Duplicate Barcode '${finalBarcode}' already exists.` },
        { status: 400 }
      );
    }

    if (catObj) {
      const duplicateName = existingItems.find(
        (i) => i.categoryId === catObj.id && i.itemName.toLowerCase() === itemName.trim().toLowerCase()
      );
      if (duplicateName) {
        return NextResponse.json(
          { error: `Data Governance Lock: An item named '${itemName.trim()}' already exists under '${catObj.name}'.` },
          { status: 400 }
        );
      }
    }

    const { marginPercent, markupPercent } = calculateMarginAndMarkup(cost, selling);
    const itemId = `item_${Date.now()}`;

    // Resolve vendor ownership (Category 1: Vendor Supplied vs Category 2: Internal Platform Stock)
    const inputVendorId = body.vendorId;
    const isVendorProvided = inputVendorId && inputVendorId !== 'PLATFORM' && inputVendorId !== '';
    const resolvedVendorId = user.role === 'VENDOR' ? `vnd_${user.id}` : (isVendorProvided ? inputVendorId : null);
    const resolvedVendorName = user.role === 'VENDOR'
      ? (user.name || 'Vendor Partner')
      : (body.vendorName || (isVendorProvided ? 'Vendor Partner' : 'LogiQ-On Internal Stock'));

    const newItem: PersistentProduct = {
      id: itemId,
      sku: finalSku,
      barcode: finalBarcode,
      itemName: itemName.trim(),
      description: description || '',
      costPrice: cost,
      sellingPrice: selling,
      wholesalePrice: wholesale,
      marginPercent,
      markupPercent,
      moq: parsedMoq,
      status: finalStatus as any,
      vendorId: resolvedVendorId,
      vendorEmail: user.role === 'VENDOR' ? user.email : (isVendorProvided ? body.vendorEmail : undefined),
      vendorName: resolvedVendorName,
      categoryId: catObj ? catObj.id : undefined,
      categoryName: catName,
      uomId: uomObj ? uomObj.id : undefined,
      uomCode,
      uomName,
      attributes: attributes && typeof attributes === 'object' ? attributes : {},
      statusHistory: [{ from: 'NEW', to: finalStatus, changedBy: user.email || 'Admin', changedAt: new Date().toISOString(), reason: 'Initial Item Master Registration' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

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
          attributesJson: JSON.stringify(newItem.attributes),
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
    const body = await req.json();
    const {
      id,
      itemName,
      sku,
      barcode,
      costPrice,
      sellingPrice,
      wholesalePrice,
      moq,
      status,
      description,
      categoryId,
      uomId,
      attributes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID required.' }, { status: 400 });
    }

    const persistentProducts = loadPersistentProducts();
    const item = persistentProducts[id];
    if (!item) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    const cost = costPrice !== undefined ? parseFloat(costPrice) : item.costPrice;
    const selling = sellingPrice !== undefined ? parseFloat(sellingPrice) : item.sellingPrice;
    const wholesale = wholesalePrice !== undefined ? parseFloat(wholesalePrice) : (item.wholesalePrice || selling);
    const parsedMoq = moq !== undefined ? parseInt(moq, 10) : (item.moq || 1);

    if (selling < cost) {
      return NextResponse.json(
        { error: `Data Governance Lock: Selling price ($${selling.toFixed(2)}) cannot be lower than cost price ($${cost.toFixed(2)}).` },
        { status: 400 }
      );
    }

    if (wholesale > selling) {
      return NextResponse.json(
        { error: `Data Governance Lock: Wholesale tier price ($${wholesale.toFixed(2)}) cannot exceed retail selling price ($${selling.toFixed(2)}).` },
        { status: 400 }
      );
    }

    const cleanSku = sku ? sku.trim().toUpperCase() : item.sku;
    const cleanBarcode = barcode ? barcode.trim() : item.barcode;
    const existingItems = Object.values(persistentProducts);

    if (cleanSku && cleanSku !== item.sku) {
      const dupSku = existingItems.find((i) => i.id !== id && i.sku.toUpperCase() === cleanSku);
      if (dupSku) {
        return NextResponse.json({ error: `Data Governance Lock: Duplicate SKU '${cleanSku}' already exists.` }, { status: 400 });
      }
    }

    if (cleanBarcode && cleanBarcode !== item.barcode) {
      const dupBarcode = existingItems.find((i) => i.id !== id && i.barcode === cleanBarcode);
      if (dupBarcode) {
        return NextResponse.json({ error: `Data Governance Lock: Duplicate Barcode '${cleanBarcode}' already exists.` }, { status: 400 });
      }
    }

    // Category Lookup
    const categories = loadCategories();
    const catObj = categories.find((c) => c.id === categoryId || c.slug === categoryId);

    // UOM Lookup
    const uoms = loadUOMs();
    const uomObj = uoms.find((u) => u.id === uomId || u.code === uomId);

    const oldStatus = item.status;
    item.itemName = itemName || item.itemName;
    if (cleanSku) item.sku = cleanSku;
    if (cleanBarcode) item.barcode = cleanBarcode;
    item.costPrice = cost;
    item.sellingPrice = selling;
    item.wholesalePrice = wholesale;
    const { marginPercent, markupPercent } = calculateMarginAndMarkup(cost, selling);
    item.marginPercent = marginPercent;
    item.markupPercent = markupPercent;
    item.moq = parsedMoq;

    if (status && status !== oldStatus) {
      item.status = status;
      if (!item.statusHistory) item.statusHistory = [];
      item.statusHistory.push({
        from: oldStatus,
        to: status,
        changedBy: user.email || 'User',
        changedAt: new Date().toISOString(),
        reason: 'Status updated via MDM Console',
      });
    }

    if (description !== undefined) item.description = description;
    if (attributes && typeof attributes === 'object') item.attributes = attributes;
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
          attributesJson: JSON.stringify(item.attributes),
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
