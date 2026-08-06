import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, loadPersistentUsers } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { loadPersistentProducts, savePersistentProducts, PersistentProduct } from '@/lib/products';

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

  // Combine database products and persistent products
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

  // Filter persistent products strictly scoped to owning vendor
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

  const { itemName, sku, barcode, costPrice, sellingPrice, status, description } = await req.json();

  if (!itemName) {
    return NextResponse.json({ error: 'Item / Product Name is required.' }, { status: 400 });
  }

  const cost = parseFloat(costPrice || '0');
  const selling = parseFloat(sellingPrice || '0');

  if (isNaN(cost) || cost < 0 || isNaN(selling) || selling < 0) {
    return NextResponse.json({ error: 'Prices must be valid non-negative numbers.' }, { status: 400 });
  }

  const finalSku = sku?.trim() ? sku.trim().toUpperCase() : `SKU-APX-${Date.now().toString().slice(-5)}`;
  const finalBarcode = barcode?.trim() ? barcode.trim() : `93${Math.floor(10000000001 + Math.random() * 89999999999)}`;
  const finalStatus = ['ACTIVE', 'DRAFT', 'DISCONTINUED'].includes(status) ? status : 'ACTIVE';

  const productId = `item_${Date.now()}`;
  const newProduct: PersistentProduct = {
    id: productId,
    sku: finalSku,
    barcode: finalBarcode,
    itemName,
    description: description || '',
    costPrice: cost,
    sellingPrice: selling,
    status: finalStatus,
    vendorId,
    vendorEmail,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save to persistent file store
  const persistentProducts = loadPersistentProducts();
  persistentProducts[productId] = newProduct;
  savePersistentProducts(persistentProducts);

  // Attempt saving to DB
  try {
    await prisma.itemMaster.create({
      data: {
        id: productId,
        sku: finalSku,
        barcode: finalBarcode,
        itemName,
        description: description || '',
        costPrice: cost,
        sellingPrice: selling,
        status: finalStatus as any,
        vendorId,
      },
    });
  } catch (e: any) {
    console.warn('Prisma DB product save warning:', e.message);
  }

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'VENDOR_PRODUCT_CREATED',
    module: 'VENDOR_MANAGEMENT',
    targetId: productId,
    payloadJson: { itemName, sku: finalSku, barcode: finalBarcode, sellingPrice: selling, vendorId },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `Product "${itemName}" (${finalSku}) created successfully!`,
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

  // Governance Lock: Only APPROVED vendors can edit products
  if (vendorStatus !== 'APPROVED') {
    return NextResponse.json(
      {
        error: `Catalog Governance Lock: Product catalog management is restricted to APPROVED vendors. Your registration status is currently ${vendorStatus}.`,
      },
      { status: 403 }
    );
  }

  const { id, itemName, sku, barcode, costPrice, sellingPrice, status, description } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'Product ID is required for editing.' }, { status: 400 });
  }

  const persistentProducts = loadPersistentProducts();
  const existingPersistent = persistentProducts[id];

  // Multi-Tenant Isolation Security Check
  if (existingPersistent && existingPersistent.vendorId !== vendorId && existingPersistent.vendorEmail !== vendorEmail) {
    return NextResponse.json({ error: 'Access Denied: Product belongs to another vendor account.' }, { status: 403 });
  }

  const cost = parseFloat(costPrice || '0');
  const selling = parseFloat(sellingPrice || '0');

  if (existingPersistent) {
    existingPersistent.itemName = itemName || existingPersistent.itemName;
    if (sku) existingPersistent.sku = sku.trim().toUpperCase();
    if (barcode) existingPersistent.barcode = barcode.trim();
    existingPersistent.costPrice = cost;
    existingPersistent.sellingPrice = selling;
    if (status) existingPersistent.status = status;
    if (description !== undefined) existingPersistent.description = description;
    existingPersistent.updatedAt = new Date().toISOString();

    persistentProducts[id] = existingPersistent;
    savePersistentProducts(persistentProducts);
  }

  try {
    const dbProduct = await prisma.itemMaster.findUnique({ where: { id } });
    if (dbProduct && dbProduct.vendorId && dbProduct.vendorId !== vendorId) {
      return NextResponse.json({ error: 'Access Denied: Product belongs to another vendor account.' }, { status: 403 });
    }

    if (dbProduct) {
      await prisma.itemMaster.update({
        where: { id },
        data: {
          itemName: itemName || dbProduct.itemName,
          sku: sku ? sku.trim().toUpperCase() : dbProduct.sku,
          barcode: barcode ? barcode.trim() : dbProduct.barcode,
          costPrice: cost,
          sellingPrice: selling,
          status: status as any || dbProduct.status,
          description: description !== undefined ? description : dbProduct.description,
        },
      });
    }
  } catch (e: any) {}

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'VENDOR_PRODUCT_UPDATED',
    module: 'VENDOR_MANAGEMENT',
    targetId: id,
    payloadJson: { id, itemName, sellingPrice: selling, vendorId },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `Product updated successfully!`,
  });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized: Vendor access required.' }, { status: 403 });
  }

  const { vendorId, vendorEmail, vendorStatus } = await resolveVendorForUser(user);

  // Governance Lock: Only APPROVED vendors can delete products
  if (vendorStatus !== 'APPROVED') {
    return NextResponse.json(
      {
        error: `Catalog Governance Lock: Product catalog management is restricted to APPROVED vendors. Your registration status is currently ${vendorStatus}.`,
      },
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

  // Multi-Tenant Isolation Security Check
  if (target && target.vendorId !== vendorId && target.vendorEmail !== vendorEmail) {
    return NextResponse.json({ error: 'Access Denied: Product belongs to another vendor account.' }, { status: 403 });
  }

  if (target) {
    delete persistentProducts[id];
    savePersistentProducts(persistentProducts);
  }

  try {
    const dbProduct = await prisma.itemMaster.findUnique({ where: { id } });
    if (dbProduct && dbProduct.vendorId && dbProduct.vendorId !== vendorId) {
      return NextResponse.json({ error: 'Access Denied: Product belongs to another vendor account.' }, { status: 403 });
    }
    if (dbProduct) {
      await prisma.itemMaster.delete({ where: { id } });
    }
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
