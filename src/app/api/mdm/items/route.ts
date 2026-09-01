import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentProducts, PersistentProduct, calculateMarginAndMarkup, validateStorePublish, createItemMasterRecord, updateItemMasterRecord, deleteItemMasterRecord } from '@/lib/products';
import { loadCategories } from '@/lib/categories';
import { loadUOMs } from '@/lib/uom';
import { upsertVendorMasterRecord } from '@/lib/vendor-master';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

async function resolveVendorIdByCompanyName(companyName: string): Promise<string | null> {
  const vendor = await prisma.vendor.findFirst({ where: { companyName } });
  return vendor?.id || null;
}

async function resolveVendorById(vendorId?: string, vendorEmail?: string): Promise<{ id: string; companyName: string } | null> {
  if (!vendorId && !vendorEmail) return null;
  const vendor = await prisma.vendor.findFirst({
    where: {
      OR: [
        ...(vendorId ? [{ id: vendorId }] : []),
        ...(vendorEmail ? [{ user: { email: vendorEmail } }] : []),
      ],
    },
  });
  return vendor ? { id: vendor.id, companyName: vendor.companyName } : null;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get('search') || '').toLowerCase().trim();
  const categoryId = searchParams.get('categoryId');
  const uomId = searchParams.get('uomId');
  const status = searchParams.get('status');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const attrKey = searchParams.get('attrKey');
  const attrValue = (searchParams.get('attrValue') || '').toLowerCase().trim();

  const persistentProducts = await loadPersistentProducts();
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

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized: Platform Owner or Vendor role required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      itemName,
      barcode,
      costPrice,
      sellingPrice,
      moq,
      status,
      description,
      categoryId,
      uomId,
      attributes,
      imageUrl,
      primaryVendorName,
      additionalVendors,
      publishToStore,
      storeDescription,
      storeImages,
    } = body;

    if (!itemName || !itemName.trim()) {
      return NextResponse.json({ error: 'Item Name is required.' }, { status: 400 });
    }

    // Every item must be supplied by a registered vendor — there is no such thing as
    // "LogiQ-On internal stock" here, since all warehouse stock is vendor-owned consigned
    // inventory (see the procurement model this app follows).
    if (!primaryVendorName || !String(primaryVendorName).trim()) {
      return NextResponse.json({ error: 'Data Governance Lock: A Primary Vendor is required for every item.' }, { status: 400 });
    }

    const cost = parseFloat(costPrice || '0');
    const selling = parseFloat(sellingPrice || '0');
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
    if (isNaN(parsedMoq) || parsedMoq < 1) {
      return NextResponse.json({ error: 'Data Governance Lock: Minimum Order Quantity (MOQ) must be an integer >= 1.' }, { status: 400 });
    }

    // Category Lookup
    const categories = await loadCategories();
    const catObj = categories.find((c) => c.id === categoryId || c.slug === categoryId);
    const catCode = catObj ? catObj.slug.split('-')[0].toUpperCase() : 'GEN';

    // UOM Lookup
    const uoms = await loadUOMs();
    const uomObj = uoms.find((u) => u.id === uomId || u.code === uomId);

    // Global Duplicate Governance Validation Checks
    const persistentProducts = await loadPersistentProducts();
    const existingItems = Object.values(persistentProducts);

    // SKU is always system-generated — never accepted from the client — so it can never
    // collide with a typo or a duplicate manual entry. Retry with a fresh sequence on the
    // rare random collision instead of surfacing that as a governance error to the owner.
    const existingSkus = new Set(existingItems.map((i) => i.sku.toUpperCase()));
    let finalSku = '';
    for (let attempt = 0; attempt < 20; attempt++) {
      const seq = Math.floor(100 + Math.random() * 900);
      const candidate = `LQ-${catCode}-${seq}`;
      if (!existingSkus.has(candidate)) { finalSku = candidate; break; }
    }
    if (!finalSku) finalSku = `LQ-${catCode}-${Date.now().toString().slice(-6)}`;

    const finalBarcode = barcode && barcode.trim() ? barcode.trim() : `93123450${Math.floor(10000 + Math.random() * 89999)}`;
    const finalStatus = ['ACTIVE', 'DRAFT', 'DISCONTINUED'].includes(status) ? status : 'ACTIVE';

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

    const itemId = `item_${Date.now()}`;

    // Resolve vendor ownership. The stock behind this item is either supplied by a
    // registered vendor (the "primary" allocation — an item can additionally be sourced
    // from other vendors too, recorded below in Vendor Master Data at their own cost) or
    // it's LogiQ's own internal stock, in which case no vendor is assigned at all.
    const resolvedVendorName = primaryVendorName && String(primaryVendorName).trim() ? String(primaryVendorName).trim() : undefined;
    const resolvedVendorId = resolvedVendorName ? await resolveVendorIdByCompanyName(resolvedVendorName) : null;

    const finalStoreImages = Array.isArray(storeImages) ? storeImages.filter((s: any) => typeof s === 'string' && s) : [];
    if (publishToStore === true) {
      const publishError = validateStorePublish({
        vendorId: resolvedVendorId,
        sellingPrice: selling,
        storeDescription,
        storeImages: finalStoreImages,
      });
      if (publishError) {
        return NextResponse.json({ error: publishError }, { status: 400 });
      }
    }

    const newItem = await createItemMasterRecord({
      id: itemId,
      sku: finalSku,
      barcode: finalBarcode,
      itemName: itemName.trim(),
      description: description || '',
      costPrice: cost,
      sellingPrice: selling,
      moq: parsedMoq,
      status: finalStatus,
      vendorId: resolvedVendorId,
      categoryId: catObj ? catObj.id : null,
      uomId: uomObj ? uomObj.id : null,
      imageUrl: imageUrl || '',
      publishToStore: publishToStore === true,
      storeDescription: storeDescription || '',
      storeImages: finalStoreImages,
      attributes: attributes && typeof attributes === 'object' ? attributes : {},
      statusHistory: [{ from: 'NEW', to: finalStatus, changedBy: user.email || 'Admin', changedAt: new Date().toISOString(), reason: 'Initial Item Master Registration' }],
    });

    // Every vendor allocated to this item — the primary one and any additional vendors
    // sourcing it at their own cost — gets (or updates) a Vendor Master Data sourcing
    // record, since that table is the actual source of truth for "vendor X supplies item
    // Y at cost Z" used everywhere pricing is looked up (e.g. Purchase Order creation).
    const vendorSourcingRows: Array<{ vendorName: string; costOfGoods: number }> = [];
    if (resolvedVendorName) vendorSourcingRows.push({ vendorName: resolvedVendorName, costOfGoods: cost });
    if (Array.isArray(additionalVendors)) {
      for (const v of additionalVendors) {
        const vName = v?.vendorName ? String(v.vendorName).trim() : '';
        const vCost = Number(v?.costPrice);
        if (vName && !Number.isNaN(vCost) && vCost >= 0) {
          vendorSourcingRows.push({ vendorName: vName, costOfGoods: vCost });
        }
      }
    }
    for (const row of vendorSourcingRows) {
      try {
        await upsertVendorMasterRecord({
          vendorName: row.vendorName,
          itemCode: finalSku,
          itemDescription: newItem.itemName,
          costOfGoods: row.costOfGoods,
          currency: 'AUD',
          moq: parsedMoq,
          leadTimeDays: 7,
          paymentTerms: 'Net 30',
          incoterms: 'EXW',
        });
      } catch (e) {}
    }

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

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized: Item Master edits are restricted to the Platform Owner.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      id,
      itemName,
      barcode,
      costPrice,
      sellingPrice,
      moq,
      status,
      description,
      categoryId,
      uomId,
      attributes,
      imageUrl,
      publishToStore,
      storeDescription,
      storeImages,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID required.' }, { status: 400 });
    }

    const persistentProducts = await loadPersistentProducts();
    const item = persistentProducts[id];
    if (!item) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    const cost = costPrice !== undefined ? parseFloat(costPrice) : item.costPrice;
    const selling = sellingPrice !== undefined ? parseFloat(sellingPrice) : item.sellingPrice;
    const parsedMoq = moq !== undefined ? parseInt(moq, 10) : (item.moq || 1);

    if (selling < cost) {
      return NextResponse.json(
        { error: `Data Governance Lock: Selling price ($${selling.toFixed(2)}) cannot be lower than cost price ($${cost.toFixed(2)}).` },
        { status: 400 }
      );
    }

    // SKU is system-generated at creation and immutable thereafter — never accepted from
    // the client on edit.
    const cleanSku = item.sku;
    const cleanBarcode = barcode ? barcode.trim() : item.barcode;
    const existingItems = Object.values(persistentProducts);

    if (cleanBarcode && cleanBarcode !== item.barcode) {
      const dupBarcode = existingItems.find((i) => i.id !== id && i.barcode === cleanBarcode);
      if (dupBarcode) {
        return NextResponse.json({ error: `Data Governance Lock: Duplicate Barcode '${cleanBarcode}' already exists.` }, { status: 400 });
      }
    }

    // Category Lookup
    const categories = await loadCategories();
    const catObj = categories.find((c) => c.id === categoryId || c.slug === categoryId);

    // UOM Lookup
    const uoms = await loadUOMs();
    const uomObj = uoms.find((u) => u.id === uomId || u.code === uomId);

    const patch: Parameters<typeof updateItemMasterRecord>[1] = {
      itemName: itemName || item.itemName,
      sku: cleanSku,
      barcode: cleanBarcode,
      costPrice: cost,
      sellingPrice: selling,
      moq: parsedMoq,
    };

    const oldStatus = item.status;
    let nextStatusHistory = item.statusHistory;
    if (status && status !== oldStatus) {
      patch.status = status;
      nextStatusHistory = [
        ...(item.statusHistory || []),
        { from: oldStatus, to: status, changedBy: user.email || 'User', changedAt: new Date().toISOString(), reason: 'Status updated via MDM Console' },
      ];
      patch.statusHistory = nextStatusHistory;
    }

    if (description !== undefined) patch.description = description;
    if (body.vendorId !== undefined || body.vendorEmail !== undefined) {
      const vendor = await resolveVendorById(body.vendorId, body.vendorEmail);
      if (vendor) patch.vendorId = vendor.id;
    }
    if (imageUrl !== undefined) patch.imageUrl = imageUrl;
    if (attributes && typeof attributes === 'object') patch.attributes = attributes;

    const nextStoreDescription = storeDescription !== undefined ? storeDescription : item.storeDescription;
    const nextStoreImages = storeImages !== undefined
      ? (Array.isArray(storeImages) ? storeImages.filter((s: any) => typeof s === 'string' && s) : [])
      : (item.storeImages || []);
    const nextPublishToStore = publishToStore !== undefined ? publishToStore === true : !!item.publishToStore;

    if (nextPublishToStore) {
      const publishError = validateStorePublish({
        vendorId: patch.vendorId !== undefined ? patch.vendorId : item.vendorId,
        sellingPrice: selling,
        storeDescription: nextStoreDescription,
        storeImages: nextStoreImages,
      });
      if (publishError) {
        return NextResponse.json({ error: publishError }, { status: 400 });
      }
    }
    patch.storeDescription = nextStoreDescription;
    patch.storeImages = nextStoreImages;
    patch.publishToStore = nextPublishToStore;
    if (catObj) patch.categoryId = catObj.id;
    if (uomObj) patch.uomId = uomObj.id;

    const updated = await updateItemMasterRecord(id, patch);
    if (!updated) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'ITEM_MASTER_UPDATED',
      module: 'MASTER_DATA_MDM',
      targetId: id,
    }).catch(() => {});

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update item.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized: Owner or MDM role required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Item ID required.' }, { status: 400 });
  }

  const ok = await deleteItemMasterRecord(id);
  if (!ok) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'ITEM_MASTER_DELETED',
    module: 'MASTER_DATA_MDM',
    targetId: id,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
