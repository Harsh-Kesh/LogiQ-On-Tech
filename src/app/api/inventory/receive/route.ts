import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentProducts } from '@/lib/products';
import { addStockLedgerEntry, loadPersistentWarehouses } from '@/lib/stock';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'WAREHOUSE')) {
    return NextResponse.json({ error: 'Unauthorized: Admin or Warehouse operator access required.' }, { status: 403 });
  }

  const { itemMasterId, warehouseCode, binLocation, quantityReceived, poReference, vendorId } = await req.json();

  const qty = parseInt(quantityReceived, 10);
  if (!itemMasterId || !warehouseCode || !binLocation || isNaN(qty) || qty <= 0) {
    return NextResponse.json({ error: 'Item Master, Warehouse, Bin Location, and a positive Quantity Received are required.' }, { status: 400 });
  }

  // Load Item Master details
  const persistentProducts = loadPersistentProducts();
  let item = persistentProducts[itemMasterId] || Object.values(persistentProducts).find((p) => p.id === itemMasterId || p.sku === itemMasterId);

  if (!item) {
    return NextResponse.json({ error: `Item Master record '${itemMasterId}' not found.` }, { status: 404 });
  }

  // Load Warehouse Location
  const persistentWarehouses = loadPersistentWarehouses();
  const wh = persistentWarehouses[warehouseCode.trim().toUpperCase()] || Object.values(persistentWarehouses).find((w) => w.code === warehouseCode || w.id === warehouseCode);

  if (!wh) {
    return NextResponse.json({ error: `Warehouse Location '${warehouseCode}' not found.` }, { status: 404 });
  }

  // Generate GRN Reference Number
  const grnRef = `GRN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Determine supplier entity (Vendor-Supplied vs Internal Stock)
  const resolvedVendorId = vendorId || item.vendorId || null;
  const resolvedVendorName = item.vendorId
    ? (item.vendorName || 'Apex Hardware & Logistics Ltd')
    : (vendorId ? 'Vendor Supplier' : 'LogiQ-On Internal Stock');

  // Append IMMUTABLE Stock Ledger RECEIPT row
  const ledgerRow = addStockLedgerEntry({
    warehouseId: wh.id,
    warehouseCode: wh.code,
    warehouseName: wh.name,
    itemMasterId: item.id,
    sku: item.sku,
    barcode: item.barcode,
    itemName: item.itemName,
    vendorId: resolvedVendorId,
    vendorName: resolvedVendorName,
    binLocation: binLocation.trim().toUpperCase(),
    movementType: 'RECEIPT',
    quantityDelta: qty,
    referenceNumber: poReference ? poReference.trim().toUpperCase() : grnRef,
    reasonCode: resolvedVendorId ? `Vendor Delivery GRN (${resolvedVendorName})` : 'Direct Platform Purchase / Internal Stock',
    createdById: user.id,
    createdByEmail: user.email,
  });

  // Database synchronization
  try {
    const existingStock = await prisma.warehouseStock.findFirst({
      where: { warehouseId: wh.id, itemMasterId: item.id, binLocation: binLocation.trim().toUpperCase() },
    });

    if (existingStock) {
      await prisma.warehouseStock.update({
        where: { id: existingStock.id },
        data: { quantityOnHand: { increment: qty } },
      });
    } else {
      await prisma.warehouseStock.create({
        data: {
          warehouseId: wh.id,
          itemMasterId: item.id,
          binLocation: binLocation.trim().toUpperCase(),
          quantityOnHand: qty,
        },
      });
    }

    await prisma.stockLedger.create({
      data: {
        warehouseId: wh.id,
        itemMasterId: item.id,
        binLocation: binLocation.trim().toUpperCase(),
        movementType: 'RECEIPT',
        quantityDelta: qty,
        referenceNumber: ledgerRow.referenceNumber,
        reasonCode: ledgerRow.reasonCode,
        createdById: user.id,
      },
    });
  } catch (e: any) {
    console.warn('Prisma stock receiving sync warning:', e.message);
  }

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'INBOUND_STOCK_RECEIVED',
    module: 'WAREHOUSE_OPERATIONS',
    targetId: ledgerRow.id,
    payloadJson: {
      grnRef: ledgerRow.referenceNumber,
      sku: item.sku,
      itemName: item.itemName,
      warehouseCode: wh.code,
      binLocation: ledgerRow.binLocation,
      quantityReceived: qty,
      supplier: resolvedVendorName,
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `Successfully received ${qty} units of ${item.itemName} (${item.sku}) at ${wh.code} / ${ledgerRow.binLocation}. GRN Ref: ${ledgerRow.referenceNumber}`,
    ledgerEntry: ledgerRow,
  });
}
