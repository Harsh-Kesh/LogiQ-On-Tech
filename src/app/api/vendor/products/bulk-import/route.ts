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
    let rawItems: any[] = [];
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No CSV file provided in upload.' }, { status: 400 });
      }

      const fileName = file.name || '';
      if (!fileName.toLowerCase().endsWith('.csv')) {
        return NextResponse.json({ error: `Invalid file format (${fileName}). Only .csv spreadsheet files are supported.` }, { status: 400 });
      }

      const text = await file.text();
      const lines = text.trim().split('\n');
      if (lines.length <= 1) {
        return NextResponse.json({ error: 'CSV file is empty or missing data rows.' }, { status: 400 });
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      rawItems = lines.slice(1).map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        const item: any = {};
        headers.forEach((h, i) => {
          if (h.includes('name')) item.itemName = parts[i];
          else if (h.includes('sku')) item.sku = parts[i];
          else if (h.includes('barcode')) item.barcode = parts[i];
          else if (h.includes('cost')) item.costPrice = parts[i];
          else if (h.includes('sell') || h.includes('price')) item.sellingPrice = parts[i];
          else if (h.includes('wholesale')) item.wholesalePrice = parts[i];
          else if (h.includes('cat')) item.category = parts[i];
          else if (h.includes('uom')) item.uom = parts[i];
          else if (h.includes('status')) item.status = parts[i];
          else if (h.includes('desc')) item.description = parts[i];
        });
        if (!item.itemName) item.itemName = parts[0];
        return item;
      });
    } else {
      const body = await req.json();
      rawItems = body.items || [];
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'CSV items payload array is required.' }, { status: 400 });
    }

    const categories = loadCategories();
    const uoms = loadUOMs();
    const persistentProducts = loadPersistentProducts();

    // Load existing catalog SKUs and Barcodes to prevent duplicate imports
    const existingProductsList = Object.values(persistentProducts);
    const existingSkus = new Set(existingProductsList.map((p) => (p.sku || '').trim().toUpperCase()));
    const existingBarcodes = new Set(existingProductsList.map((p) => (p.barcode || '').trim()));

    try {
      const dbItems = await prisma.itemMaster.findMany({
        select: { sku: true, barcode: true },
      });
      dbItems.forEach((d) => {
        if (d.sku) existingSkus.add(d.sku.trim().toUpperCase());
        if (d.barcode) existingBarcodes.add(d.barcode.trim());
      });
    } catch (e) {}

    let createdCount = 0;
    let skippedCount = 0;
    const skippedDetails: string[] = [];
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

      // Check for SKU or Barcode duplicate
      if (existingSkus.has(sku) || existingBarcodes.has(barcode)) {
        skippedCount++;
        skippedDetails.push(`${name} (SKU: ${sku})`);
        continue;
      }

      // Mark as existing for intra-file duplicate protection
      existingSkus.add(sku);
      existingBarcodes.add(barcode);

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

    if (createdCount > 0) {
      savePersistentProducts(persistentProducts);
      await logAuditEvent({
        userId: user.id,
        role: user.role,
        action: 'VENDOR_BULK_CSV_IMPORTED',
        module: 'VENDOR_MANAGEMENT',
        payloadJson: { count: createdCount, skippedCount, vendorName },
      }).catch(() => {});
    }

    let resultMsg = '';
    if (createdCount > 0 && skippedCount > 0) {
      resultMsg = `Imported ${createdCount} new vendor products. ${skippedCount} duplicate items skipped.`;
    } else if (createdCount > 0 && skippedCount === 0) {
      resultMsg = `Successfully imported all ${createdCount} vendor products into your catalog!`;
    } else {
      resultMsg = `0 new products imported. All ${skippedCount} items in the CSV file already exist in the catalog.`;
    }

    return NextResponse.json({
      success: true,
      message: resultMsg,
      importedCount: createdCount,
      skippedCount,
      skippedDetails,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to process vendor CSV bulk import.' }, { status: 500 });
  }
}
