import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentProducts, createItemMasterRecord } from '@/lib/products';
import { loadCategories } from '@/lib/categories';
import { loadUOMs } from '@/lib/uom';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized: Owner or MDM role required.' }, { status: 403 });
  }

  try {
    const { items: rawItems } = await req.json();

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'CSV items payload array is required.' }, { status: 400 });
    }

    const categories = await loadCategories();
    const uoms = await loadUOMs();
    const persistentProducts = await loadPersistentProducts();
    const existingSkus = new Set(Object.values(persistentProducts).map((p) => p.sku.toUpperCase()));

    let createdCount = 0;

    for (let idx = 0; idx < rawItems.length; idx++) {
      const row = rawItems[idx];
      const name = (row.itemName || row.name || row.item_name || '').trim();
      if (!name) continue;

      const catObj = categories.find((c) => c.name.toLowerCase() === (row.category || '').toLowerCase() || c.slug === row.category);
      const catCode = catObj ? catObj.slug.split('-')[0].toUpperCase() : 'GEN';
      const uomObj = uoms.find((u) => u.code.toLowerCase() === (row.uom || row.uomCode || '').toLowerCase() || u.name.toLowerCase() === (row.uom || '').toLowerCase());

      const seq = Math.floor(100 + Math.random() * 900);
      let sku = row.sku && row.sku.trim() ? row.sku.trim().toUpperCase() : `LQ-${catCode}-${seq}${idx}`;
      if (existingSkus.has(sku)) sku = `${sku}-${Date.now().toString().slice(-4)}`;
      existingSkus.add(sku);

      const barcode = row.barcode && row.barcode.trim() ? row.barcode.trim() : `93123450${Math.floor(10000 + Math.random() * 89999)}`;
      const costPrice = parseFloat(row.costPrice || '0');
      const sellingPrice = parseFloat(row.sellingPrice || '0');
      const status = ['ACTIVE', 'DRAFT', 'DISCONTINUED'].includes(row.status) ? row.status : 'ACTIVE';

      const itemId = `item_csv_${Date.now()}_${idx}`;
      await createItemMasterRecord({
        id: itemId,
        sku,
        barcode,
        itemName: name,
        description: row.description || '',
        costPrice: isNaN(costPrice) ? 0 : costPrice,
        sellingPrice: isNaN(sellingPrice) ? 0 : sellingPrice,
        moq: 1,
        status,
        vendorId: null,
        categoryId: catObj ? catObj.id : null,
        uomId: uomObj ? uomObj.id : null,
      });
      createdCount++;
    }

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'CSV_BULK_ITEMS_IMPORTED',
      module: 'MASTER_DATA_MDM',
      payloadJson: { count: createdCount },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${createdCount} items into Master Data repository!`,
      importedCount: createdCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to process CSV bulk import.' }, { status: 500 });
  }
}
