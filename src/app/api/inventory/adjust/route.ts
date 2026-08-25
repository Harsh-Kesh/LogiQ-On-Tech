import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentProducts } from '@/lib/products';
import { addStockLedgerEntry, loadPersistentWarehouses, MovementType, calculateStockOnHand } from '@/lib/stock';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'WAREHOUSE')) {
    return NextResponse.json({ error: 'Unauthorized: Admin or Warehouse operator access required.' }, { status: 403 });
  }

  const { itemMasterId, warehouseCode, binLocation, movementType, quantity, referenceNumber, reasonCode, sourceBinLocation, destinationBinLocation } = await req.json();

  const qty = parseInt(quantity, 10);
  const type: MovementType = movementType;
  const rawType = (movementType || '').toString().trim().toUpperCase();

  if (isNaN(qty) || qty <= 0) {
    return NextResponse.json({ error: 'Valid positive Quantity is required.' }, { status: 400 });
  }

  if (rawType === 'TRANSFER') {
    if (!itemMasterId || !warehouseCode || !sourceBinLocation || !destinationBinLocation) {
      return NextResponse.json({ error: 'Item Master, Warehouse, sourceBinLocation, and destinationBinLocation are required for TRANSFER.' }, { status: 400 });
    }
  } else if (!itemMasterId || !warehouseCode || !binLocation || !type) {
    return NextResponse.json({ error: 'Item Master, Warehouse, Bin, and Valid Movement Type are required.' }, { status: 400 });
  }

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
  } else if (rawType === 'TRANSFER') {
    finalType = 'TRANSFER';
    delta = Math.abs(qty);
  } else {
    finalType = 'ADJUSTMENT';
    delta = qty;
  }

  // M-10: Negative stock guard for downward movements
  const stockOnHand = calculateStockOnHand();
  if (delta < 0) {
    const targetBin = binLocation?.trim().toUpperCase();
    const binStock = stockOnHand.find(
      (s) => s.warehouseCode === wh.code && s.binLocation === targetBin && (s.itemMasterId === item.id || s.sku === item.sku)
    );
    const currentQty = binStock?.quantityOnHand || 0;
    if (currentQty + delta < 0) {
      return NextResponse.json(
        { error: `Insufficient stock: ${item.sku} has ${currentQty} units in ${targetBin} (${wh.code}). Cannot deduct ${Math.abs(delta)} units.` },
        { status: 400 }
      );
    }
  }

  if (rawType === 'TRANSFER' && sourceBinLocation) {
    const srcBin = sourceBinLocation.trim().toUpperCase();
    const srcStock = stockOnHand.find(
      (s) => s.warehouseCode === wh.code && s.binLocation === srcBin && (s.itemMasterId === item.id || s.sku === item.sku)
    );
    const srcQty = srcStock?.quantityOnHand || 0;
    if (srcQty < Math.abs(qty)) {
      return NextResponse.json(
        { error: `Insufficient stock: ${item.sku} has ${srcQty} units in source bin ${srcBin} (${wh.code}). Cannot transfer ${Math.abs(qty)} units.` },
        { status: 400 }
      );
    }
  }

  const ref = referenceNumber && referenceNumber.trim() !== ''
    ? referenceNumber.trim().toUpperCase()
    : `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Append IMMUTABLE Stock Ledger row
  let ledgerRow: any;
  
  if (finalType === 'TRANSFER') {
    addStockLedgerEntry({
      warehouseId: wh.id,
      warehouseCode: wh.code,
      warehouseName: wh.name,
      itemMasterId: item.id,
      sku: item.sku,
      barcode: item.barcode,
      itemName: item.itemName,
      vendorId: item.vendorId || null,
      vendorName: item.vendorName || (item.vendorId ? 'Vendor Partner' : 'LogiQ-On Internal Stock'),
      binLocation: sourceBinLocation.trim().toUpperCase(),
      movementType: finalType,
      quantityDelta: -Math.abs(qty),
      referenceNumber: ref,
      reasonCode: reasonCode || `Bin Transfer (Source)`,
      createdById: user.id,
      createdByEmail: user.email,
    });

    ledgerRow = addStockLedgerEntry({
      warehouseId: wh.id,
      warehouseCode: wh.code,
      warehouseName: wh.name,
      itemMasterId: item.id,
      sku: item.sku,
      barcode: item.barcode,
      itemName: item.itemName,
      vendorId: item.vendorId || null,
      vendorName: item.vendorName || (item.vendorId ? 'Vendor Partner' : 'LogiQ-On Internal Stock'),
      binLocation: destinationBinLocation.trim().toUpperCase(),
      movementType: finalType,
      quantityDelta: Math.abs(qty),
      referenceNumber: ref,
      reasonCode: reasonCode || `Bin Transfer (Destination)`,
      createdById: user.id,
      createdByEmail: user.email,
    });

    try {
      const srcStock = await prisma.warehouseStock.findFirst({
        where: { warehouseId: wh.id, itemMasterId: item.id, binLocation: sourceBinLocation.trim().toUpperCase() },
      });
      if (srcStock) {
        await prisma.warehouseStock.update({
          where: { id: srcStock.id },
          data: { quantityOnHand: { decrement: Math.abs(qty) } },
        });
      }

      const destStock = await prisma.warehouseStock.findFirst({
        where: { warehouseId: wh.id, itemMasterId: item.id, binLocation: destinationBinLocation.trim().toUpperCase() },
      });
      if (destStock) {
        await prisma.warehouseStock.update({
          where: { id: destStock.id },
          data: { quantityOnHand: { increment: Math.abs(qty) } },
        });
      } else {
        await prisma.warehouseStock.create({
          data: {
            warehouseId: wh.id,
            itemMasterId: item.id,
            binLocation: destinationBinLocation.trim().toUpperCase(),
            quantityOnHand: Math.abs(qty),
          },
        });
      }

      await prisma.stockLedger.create({
        data: {
          warehouseId: wh.id,
          itemMasterId: item.id,
          binLocation: sourceBinLocation.trim().toUpperCase(),
          movementType: finalType as any,
          quantityDelta: -Math.abs(qty),
          referenceNumber: ref,
          reasonCode: `Bin Transfer (Source)`,
          createdById: user.id,
        },
      });

      await prisma.stockLedger.create({
        data: {
          warehouseId: wh.id,
          itemMasterId: item.id,
          binLocation: destinationBinLocation.trim().toUpperCase(),
          movementType: finalType as any,
          quantityDelta: Math.abs(qty),
          referenceNumber: ref,
          reasonCode: `Bin Transfer (Destination)`,
          createdById: user.id,
        },
      });
    } catch (e: any) {}

  } else {
    ledgerRow = addStockLedgerEntry({
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

    try {
      const existingStock = await prisma.warehouseStock.findFirst({
        where: { warehouseId: wh.id, itemMasterId: item.id, binLocation: binLocation.trim().toUpperCase() },
      });

      if (existingStock) {
        await prisma.warehouseStock.update({
          where: { id: existingStock.id },
          data: { quantityOnHand: { increment: delta } },
        });
      } else if (delta > 0) {
        await prisma.warehouseStock.create({
          data: {
            warehouseId: wh.id,
            itemMasterId: item.id,
            binLocation: binLocation.trim().toUpperCase(),
            quantityOnHand: delta,
          },
        });
      }

      await prisma.stockLedger.create({
        data: {
          warehouseId: wh.id,
          itemMasterId: item.id,
          binLocation: binLocation.trim().toUpperCase(),
          movementType: finalType as any,
          quantityDelta: delta,
          referenceNumber: ref,
          reasonCode: ledgerRow.reasonCode,
          createdById: user.id,
        },
      });
    } catch (e: any) {}
  }

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: `STOCK_${finalType}`,
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
