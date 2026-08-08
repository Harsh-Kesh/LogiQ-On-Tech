import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { loadPersistentProducts, savePersistentProducts, PersistentProduct, calculateMarginAndMarkup } from '@/lib/products';
import { loadCategories } from '@/lib/categories';

async function resolveVendorForUser(user: any): Promise<{ vendorId: string; vendorEmail: string; vendorStatus: string }> {
  const email = (user.email || '').toLowerCase().trim();
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      include: { vendor: true },
    });
    if (dbUser?.vendor) {
      return { vendorId: dbUser.vendor.id, vendorEmail: email, vendorStatus: dbUser.vendor.status };
    }
  } catch (e) {}

  const persistentUsers = loadPersistentUsers();
  const pRecord = Object.values(persistentUsers).find((u) => u.email.toLowerCase() === email);
  if (pRecord) {
    return { vendorId: `vnd_${pRecord.id}`, vendorEmail: email, vendorStatus: pRecord.status || 'PENDING' };
  }

  return { vendorId: `vnd_${user.id}`, vendorEmail: email, vendorStatus: 'PENDING' };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'VENDOR' && user.role !== 'PLATFORM_OWNER')) {
    return NextResponse.json({ error: 'Unauthorized: Vendor or Admin access required.' }, { status: 403 });
  }

  const { vendorId, vendorEmail } = await resolveVendorForUser(user);
  const persistentProducts = loadPersistentProducts();
  let productList: any[] = [];

  try {
    const dbProducts = await prisma.itemMaster.findMany({
      where: user.role === 'PLATFORM_OWNER' ? {} : { vendorId },
      orderBy: { createdAt: 'desc' },
    });
    if (dbProducts && dbProducts.length > 0) {
      productList = dbProducts.map((p) => ({
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        itemName: p.itemName,
        description: p.description,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        status: p.status,
        vendorId: p.vendorId,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }));
    }
  } catch (e: any) {}

  const scopedPersistent = Object.values(persistentProducts).filter(
    (p) => user.role === 'PLATFORM_OWNER' || p.vendorId === vendorId || p.vendorEmail === vendorEmail
  );

  scopedPersistent.forEach((sp) => {
    if (!productList.some((p) => p.id === sp.id || p.sku === sp.sku)) {
      productList.unshift(sp);
    }
  });

  return NextResponse.json({ products: productList });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized: Vendor access required.' }, { status: 403 });
  }

  const { vendorId, vendorEmail, vendorStatus } = await resolveVendorForUser(user);

  // Governance Lock: Only APPROVED vendors can create products
  if (vendorStatus !== 'APPROVED') {
    return NextResponse.json(
      {
        error: `Catalog Governance Lock: Product catalog management is restricted to APPROVED vendors. Your registration status is currently ${vendorStatus}.`,
      },
      { status: 403 }
    );
  }

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
    return NextResponse.json({ error: 'Item / Product Name is required.' }, { status: 400 });
  }

  const cost = parseFloat(costPrice || '0');
  const selling = parseFloat(sellingPrice || '0');
  const wholesale = wholesalePrice !== undefined && wholesalePrice !== '' ? parseFloat(wholesalePrice) : selling;
  const parsedMoq = moq !== undefined && moq !== '' ? parseInt(moq, 10) : 1;

  // Price Sanity Governance Validation Rules
  if (isNaN(cost) || cost < 0 || isNaN(selling) || selling < 0) {
    return NextResponse.json({ error: 'Data Governance Violation: Prices must be non-negative numbers.' }, { status: 400 });
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

  const categories = loadCategories();
  const catObj = categories.find((c) => c.id === categoryId || c.slug === categoryId);
  const catCode = catObj ? catObj.slug.split('-')[0].toUpperCase() : 'GEN';

  const seq = Math.floor(100 + Math.random() * 900);
  const finalSku = sku && sku.trim() ? sku.trim().toUpperCase() : `LQ-${catCode}-${seq}`;
  const finalBarcode = barcode && barcode.trim() ? barcode.trim() : `93123450${Math.floor(10000 + Math.random() * 89999)}`;
  const finalStatus = ['ACTIVE', 'DRAFT', 'DISCONTINUED'].includes(status) ? status : 'ACTIVE';

  // Global Duplicate Governance Checks
  const persistentProducts = loadPersistentProducts();
  const existingItems = Object.values(persistentProducts);

  const duplicateSku = existingItems.find((p) => p.sku.toUpperCase() === finalSku);
  if (duplicateSku) {
    return NextResponse.json(
      { error: `Data Governance Lock: Duplicate SKU '${finalSku}' already exists in Master Data repository.` },
      { status: 400 }
    );
  }

  const duplicateBarcode = existingItems.find((p) => p.barcode === finalBarcode);
  if (duplicateBarcode) {
    return NextResponse.json(
      { error: `Data Governance Lock: Duplicate Barcode '${finalBarcode}' already exists.` },
      { status: 400 }
    );
  }

  if (catObj) {
    const duplicateName = existingItems.find(
      (p) => p.categoryId === catObj.id && p.itemName.toLowerCase() === itemName.trim().toLowerCase()
    );
    if (duplicateName) {
      return NextResponse.json(
        { error: `Data Governance Lock: An item named '${itemName.trim()}' already exists under '${catObj.name}'.` },
        { status: 400 }
      );
    }
  }

  const { marginPercent, markupPercent } = calculateMarginAndMarkup(cost, selling);
  const productId = `item_${Date.now()}`;

  const newProduct: PersistentProduct = {
    id: productId,
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
    vendorId,
    vendorEmail,
    categoryId: catObj ? catObj.id : undefined,
    categoryName: catObj ? catObj.name : undefined,
    uomId,
    attributes: attributes && typeof attributes === 'object' ? attributes : {},
    statusHistory: [{ from: 'NEW', to: finalStatus, changedBy: vendorEmail, changedAt: new Date().toISOString(), reason: 'Created via Vendor Portal' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  persistentProducts[productId] = newProduct;
  savePersistentProducts(persistentProducts);

  try {
    await prisma.itemMaster.create({
      data: {
        id: productId,
        sku: finalSku,
        barcode: finalBarcode,
        itemName: newProduct.itemName,
        description: newProduct.description,
        costPrice: cost,
        sellingPrice: selling,
        status: finalStatus as any,
        vendorId,
        categoryId: catObj ? catObj.id : null,
        uomId: uomId || null,
        attributesJson: JSON.stringify(newProduct.attributes),
      },
    });
  } catch (e: any) {}

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'VENDOR_PRODUCT_CREATED',
    module: 'VENDOR_MANAGEMENT',
    targetId: productId,
    payloadJson: { itemName: newProduct.itemName, sku: finalSku, barcode: finalBarcode, sellingPrice: selling, vendorId },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `Product "${newProduct.itemName}" (${finalSku}) registered successfully!`,
    product: newProduct,
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized: Vendor access required.' }, { status: 403 });
  }

  const { vendorId, vendorEmail, vendorStatus } = await resolveVendorForUser(user);

  if (vendorStatus !== 'APPROVED') {
    return NextResponse.json(
      { error: `Catalog Governance Lock: Restricted to APPROVED vendors. Current status: ${vendorStatus}.` },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { id, itemName, sku, barcode, costPrice, sellingPrice, wholesalePrice, moq, status, description, categoryId, uomId, attributes } = body;

  if (!id) {
    return NextResponse.json({ error: 'Product ID is required for editing.' }, { status: 400 });
  }

  const persistentProducts = loadPersistentProducts();
  const existing = persistentProducts[id];

  if (existing && existing.vendorId !== vendorId && existing.vendorEmail !== vendorEmail) {
    return NextResponse.json({ error: 'Access Denied: Product belongs to another vendor.' }, { status: 403 });
  }

  const cost = costPrice !== undefined ? parseFloat(costPrice) : (existing?.costPrice || 0);
  const selling = sellingPrice !== undefined ? parseFloat(sellingPrice) : (existing?.sellingPrice || 0);
  const wholesale = wholesalePrice !== undefined ? parseFloat(wholesalePrice) : (existing?.wholesalePrice || selling);
  const parsedMoq = moq !== undefined ? parseInt(moq, 10) : (existing?.moq || 1);

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

  const cleanSku = sku ? sku.trim().toUpperCase() : existing?.sku;
  const cleanBarcode = barcode ? barcode.trim() : existing?.barcode;
  const existingItems = Object.values(persistentProducts);

  if (cleanSku && existing && cleanSku !== existing.sku) {
    const dupSku = existingItems.find((p) => p.id !== id && p.sku.toUpperCase() === cleanSku);
    if (dupSku) {
      return NextResponse.json({ error: `Data Governance Lock: Duplicate SKU '${cleanSku}' already exists.` }, { status: 400 });
    }
  }

  if (cleanBarcode && existing && cleanBarcode !== existing.barcode) {
    const dupBarcode = existingItems.find((p) => p.id !== id && p.barcode === cleanBarcode);
    if (dupBarcode) {
      return NextResponse.json({ error: `Data Governance Lock: Duplicate Barcode '${cleanBarcode}' already exists.` }, { status: 400 });
    }
  }

  const { marginPercent, markupPercent } = calculateMarginAndMarkup(cost, selling);

  if (existing) {
    const oldStatus = existing.status;
    existing.itemName = itemName || existing.itemName;
    if (cleanSku) existing.sku = cleanSku;
    if (cleanBarcode) existing.barcode = cleanBarcode;
    existing.costPrice = cost;
    existing.sellingPrice = selling;
    existing.wholesalePrice = wholesale;
    existing.marginPercent = marginPercent;
    existing.markupPercent = markupPercent;
    existing.moq = parsedMoq;
    if (description !== undefined) existing.description = description;
    if (attributes && typeof attributes === 'object') existing.attributes = attributes;
    if (categoryId) existing.categoryId = categoryId;
    if (uomId) existing.uomId = uomId;

    if (status && status !== oldStatus) {
      existing.status = status;
      if (!existing.statusHistory) existing.statusHistory = [];
      existing.statusHistory.push({
        from: oldStatus,
        to: status,
        changedBy: vendorEmail,
        changedAt: new Date().toISOString(),
        reason: 'Updated via Vendor Portal',
      });
    }

    existing.updatedAt = new Date().toISOString();
    persistentProducts[id] = existing;
    savePersistentProducts(persistentProducts);
  }

  try {
    await prisma.itemMaster.update({
      where: { id },
      data: {
        itemName: itemName || existing?.itemName,
        sku: cleanSku,
        barcode: cleanBarcode,
        costPrice: cost,
        sellingPrice: selling,
        status: status as any || existing?.status,
        description: description !== undefined ? description : existing?.description,
        attributesJson: attributes ? JSON.stringify(attributes) : undefined,
      },
    });
  } catch (e: any) {}

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'VENDOR_PRODUCT_UPDATED',
    module: 'VENDOR_MANAGEMENT',
    targetId: id,
  }).catch(() => {});

  return NextResponse.json({ success: true, message: 'Product updated successfully.' });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized: Vendor access required.' }, { status: 403 });
  }

  const { vendorId, vendorEmail, vendorStatus } = await resolveVendorForUser(user);

  if (vendorStatus !== 'APPROVED') {
    return NextResponse.json(
      { error: `Catalog Governance Lock: Restricted to APPROVED vendors. Current status: ${vendorStatus}.` },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Product ID required.' }, { status: 400 });
  }

  const persistentProducts = loadPersistentProducts();
  const target = persistentProducts[id];

  if (target && target.vendorId !== vendorId && target.vendorEmail !== vendorEmail) {
    return NextResponse.json({ error: 'Access Denied: Product belongs to another vendor account.' }, { status: 403 });
  }

  if (target) {
    delete persistentProducts[id];
    savePersistentProducts(persistentProducts);
  }

  try {
    await prisma.itemMaster.delete({ where: { id } });
  } catch (e: any) {}

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'VENDOR_PRODUCT_DELETED',
    module: 'VENDOR_MANAGEMENT',
    targetId: id,
  }).catch(() => {});

  return NextResponse.json({ success: true, message: 'Product removed from catalog.' });
}
