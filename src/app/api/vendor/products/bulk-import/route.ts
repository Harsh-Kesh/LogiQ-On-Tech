import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentProducts, savePersistentProducts, PersistentProduct } from '@/lib/products';
import { loadCategories } from '@/lib/categories';
import { loadUOMs } from '@/lib/uom';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'VENDOR') {
    return NextResponse.json({ error: 'Unauthorized: Vendor role required.' }, { status: 403 });
  }

  try {
    const { items: rawItems } = await req.json();

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'CSV items payload array is required.' }, { status: 400 });
    }

    const categories = loadCategories();
    const uoms = loadUOMs();
    const persistentProducts = loadPersistentProducts();

    let createdCount = 0;
    const vendorId = `vnd_${user.id}`;
    const vendorName = user.name || user.email || 'Vendor Partner';

    for (let idx = 0; idx < rawItems.length; idx++) {
      const row = rawItems[idx];
      const name = (row.itemName || row.name || row.item_name || '').trim();
      if (!name) continue;

      const catObj = categories.find((c) => c.name.toLowerCase() === (row.category || '').toLowerCase() || c.slug === row.category);
      const catCode = catObj ? catObj.slug.split('-')[0].toUpperCase() : 'GEN';
      const uomObj = uoms.find((u) => u.code.toLowerCase() === (row.uom || row.uomCode || '').toLowerCase() || u.name.toLowerCase() === (row.uom || '').toLowerCase());

      const seq = Math.floor(100 + Math.random() * 900);
      const sku = row.sku && row.sku.trim() ? row.sku.trim().toUpperCase() : `LQ-${catCode}-${seq}${idx}`;
      const barcode = row.barcode && row.barcode.trim() ? row.barcode.trim() : `93123450${Math.floor(10000 + Math.random() * 89999)}`;
      const costPrice = parseFloat(row.costPrice || '0');
      const sellingPrice = parseFloat(row.sellingPrice || '0');
      const wholesalePrice = parseFloat(row.wholesalePrice || '0');
      const status = ['ACTIVE', 'DRAFT', 'DISCONTINUED'].includes(row.status) ? row.status : 'ACTIVE';

      const itemId = `item_vnd_csv_${Date.now()}_${idx}`;
      const newItem: PersistentProduct = {
        id: itemId,
        sku,
        barcode,
        itemName: name,
        description: row.description || '',
        costPrice: isNaN(costPrice) ? 0 : costPrice,
        sellingPrice: isNaN(sellingPrice) ? 0 : sellingPrice,
        wholesalePrice: isNaN(wholesalePrice) ? 0 : wholesalePrice,
        status,
        vendorId,
        vendorEmail: user.email,
        vendorName,
        categoryId: catObj ? catObj.id : undefined,
        categoryName: catObj ? catObj.name : 'General Hardware',
        uomId: uomObj ? uomObj.id : undefined,
        uomCode: uomObj ? uomObj.code : 'PCS',
        uomName: uomObj ? uomObj.name : 'Pieces',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      persistentProducts[itemId] = newItem;
      createdCount++;

      try {
        await prisma.itemMaster.create({
          data: {
            id: itemId,
            sku,
            barcode,
            itemName: name,
            description: newItem.description,
            costPrice: newItem.costPrice,
            sellingPrice: newItem.sellingPrice,
            status: status as any,
            vendorId,
            categoryId: catObj ? catObj.id : null,
            uomId: uomObj ? uomObj.id : null,
          },
        });
      } catch (e: any) {}
    }

    savePersistentProducts(persistentProducts);

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'VENDOR_BULK_CSV_IMPORTED',
      module: 'VENDOR_MANAGEMENT',
      payloadJson: { count: createdCount, vendorName },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${createdCount} vendor products into your catalog!`,
      importedCount: createdCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to process vendor CSV bulk import.' }, { status: 500 });
  }
}
