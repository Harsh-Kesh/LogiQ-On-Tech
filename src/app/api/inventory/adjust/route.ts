import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentProducts } from '@/lib/products';
import { addStockLedgerEntry, loadPersistentWarehouses, MovementType } from '@/lib/stock';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'WAREHOUSE')) {
    return NextResponse.json({ error: 'Unauthorized: Admin or Warehouse operator access required.' }, { status: 403 });
  }

  const { itemMasterId, warehouseCode, binLocation, movementType, quantity, referenceNumber, reasonCode } = await req.json();

  const qty = parseInt(quantity, 10);
  const type: MovementType = movementType;

  if (!itemMasterId || !warehouseCode || !binLocation || !type || isNaN(qty) || qty <= 0) {
    return NextResponse.json({ error: 'Item Master, Warehouse, Bin, Valid Movement Type, and Quantity are required.' }, { status: 400 });
  }

  const rawType = (movementType || '').toString().trim().toUpperCase();

  if (!['ISSUE', 'ADJUSTMENT', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB', 'RETURN', 'RECEIPT', 'TRANSFER'].includes(rawType)) {
    return NextResponse.json({ error: 'Invalid Movement Type provided.' }, { status: 400 });
  }

  const persistentProducts = loadPersistentProducts();
  const item = persistentProducts[itemMasterId] || Object.values(persistentProducts).find((p) => p.id === itemMasterId || p.sku === itemMasterId);

  if (!item) {
    return NextResponse.json({ error: `Item Master record '${itemMasterId}' not found.` }, { status: 404 });
  }

  const persistentWarehouses = loadPersistentWarehouses();
  const wh = persistentWarehouses[warehouseCode.trim().toUpperCase()] || Object.values(persistentWarehouses).find((w) => w.code === warehouseCode || w.id === warehouseCode);

  if (!wh) {
    return NextResponse.json({ error: `Warehouse Location '${warehouseCode}' not found.` }, { status: 404 });
  }

  // Determine final MovementType for ledger and exact signed delta
  let finalType: MovementType = 'ADJUSTMENT';
  let delta = 0;

  if (rawType === 'ISSUE') {
    finalType = 'ISSUE';
    delta = -Math.abs(qty);
  } else if (rawType === 'ADJUSTMENT_SUB') {
    finalType = 'ADJUSTMENT';
    delta = -Math.abs(qty);
  } else if (rawType === 'ADJUSTMENT_ADD') {
    finalType = 'ADJUSTMENT';
    delta = Math.abs(qty);
  } else if (rawType === 'RETURN') {
    finalType = 'RETURN';
    delta = Math.abs(qty);
  } else if (rawType === 'RECEIPT') {
    finalType = 'RECEIPT';
    delta = Math.abs(qty);
  } else {
    finalType = 'ADJUSTMENT';
    delta = qty;
  }

  const ref = referenceNumber && referenceNumber.trim() !== ''
    ? referenceNumber.trim().toUpperCase()
    : `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Append IMMUTABLE Stock Ledger row
  const ledgerRow = addStockLedgerEntry({
    warehouseId: wh.id,
    warehouseCode: wh.code,
    warehouseName: wh.name,
    itemMasterId: item.id,
    sku: item.sku,
    barcode: item.barcode,
    itemName: item.itemName,
    vendorId: item.vendorId || null,
    vendorName: item.vendorName || (item.vendorId ? 'Vendor Partner' : 'LogiQ-On Internal Stock'),
    binLocation: binLocation.trim().toUpperCase(),
    movementType: finalType,
    quantityDelta: delta,
    referenceNumber: ref,
    reasonCode: reasonCode || `Manual Stock Adjustment (${finalType})`,
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
        data: { quantityOnHand: { increment: delta } },
      });
    }

    await prisma.stockLedger.create({
      data: {
        warehouseId: wh.id,
        itemMasterId: item.id,
        binLocation: binLocation.trim().toUpperCase(),
        movementType: type as any,
        quantityDelta: delta,
        referenceNumber: ref,
        reasonCode: ledgerRow.reasonCode,
        createdById: user.id,
      },
    });
  } catch (e: any) {}

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: `STOCK_${type}`,
    module: 'WAREHOUSE_OPERATIONS',
    targetId: ledgerRow.id,
    payloadJson: {
      ref,
      type,
      delta,
      sku: item.sku,
      warehouseCode: wh.code,
      binLocation: ledgerRow.binLocation,
      reasonCode: ledgerRow.reasonCode,
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `Stock movement '${type}' logged. Ledger row created with delta ${delta > 0 ? '+' : ''}${delta}. Reference: ${ref}`,
    ledgerEntry: ledgerRow,
  });
}
