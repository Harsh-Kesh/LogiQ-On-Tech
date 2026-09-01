import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentWarehouses, createWarehouse, addStockLedgerEntry } from '@/lib/stock';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const persistentWarehouses = await loadPersistentWarehouses();
  return NextResponse.json({ warehouses: Object.values(persistentWarehouses) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized: Platform Owner or Vendor role required.' }, { status: 403 });
  }

  const { code, name, address, contactPerson, contactEmail, managerName, managerEmail, items } = await req.json();

  if (!code) {
    return NextResponse.json({ error: 'Warehouse Code is required.' }, { status: 400 });
  }

  const cleanCode = code.trim().toUpperCase();
  const persistentWarehouses = await loadPersistentWarehouses();
  let targetWh = persistentWarehouses[cleanCode];

  if (!targetWh) {
    if (!name || !address) {
      return NextResponse.json({ error: 'Warehouse Name and Address are required for new location.' }, { status: 400 });
    }

    const assignedManagerName = managerName || contactPerson || 'Jack Taylor (Warehouse Lead)';
    const assignedManagerEmail = managerEmail || contactEmail || 'sydney.manager@logiqon.com';

    targetWh = await createWarehouse({
      code: cleanCode,
      name: name.trim(),
      address: address.trim(),
      contactPerson: assignedManagerName,
      contactEmail: assignedManagerEmail,
      managerEmail: assignedManagerEmail,
    });
  }

  // A1: seed initial stock ledger entries for items selected from Master Data
  let seededItems = 0;
  if (Array.isArray(items) && items.length > 0) {
    for (const it of items) {
      if (!it?.itemMasterId) continue;
      const qty = Math.max(0, parseInt(String(it.initialQty), 10) || 0);
      const binLocation = targetWh.bins[0]?.code || 'MAIN';
      if (qty > 0) {
        await addStockLedgerEntry({
          warehouseId: targetWh.id,
          warehouseCode: targetWh.code,
          warehouseName: targetWh.name,
          itemMasterId: it.itemMasterId,
          sku: it.sku || 'UNKNOWN',
          barcode: '',
          itemName: it.itemName || 'Unknown Item',
          binLocation,
          movementType: 'RECEIPT',
          quantityDelta: qty,
          referenceNumber: `WH-OPEN-${cleanCode}-${Date.now()}`,
          reasonCode: 'Warehouse commissioning — initial stock from Master Data',
          createdById: user.id,
          createdByEmail: user.email || 'owner@logiqon.com',
        });
      }
      seededItems++;
    }
  }

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'WAREHOUSE_LOCATION_CONFIGURED',
    module: 'WAREHOUSE_OPERATIONS',
    targetId: targetWh.id,
    payloadJson: { code: cleanCode, name: targetWh.name, itemCount: seededItems },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `Warehouse '${cleanCode}' configured with ${seededItems} items.`,
    warehouse: targetWh,
    seededItems,
  });
}
