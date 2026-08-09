import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentWarehouses, savePersistentWarehouses, WarehouseLocation } from '@/lib/stock';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const persistentWarehouses = loadPersistentWarehouses();
  let warehouseList = Object.values(persistentWarehouses);

  try {
    const dbWarehouses = await prisma.warehouse.findMany({
      orderBy: { code: 'asc' },
    });
    if (dbWarehouses && dbWarehouses.length > 0) {
      dbWarehouses.forEach((dbW) => {
        if (!persistentWarehouses[dbW.code]) {
          warehouseList.push({
            id: dbW.id,
            code: dbW.code,
            name: dbW.name,
            address: dbW.address,
            contactPerson: 'Operations Desk',
            contactEmail: 'warehouse@logiqon.com',
            bins: [
              { id: `bin_${dbW.id}_01`, code: 'BIN-A1-01', zone: 'Zone A', capacityUnits: 1000, isOccupied: false },
            ],
            createdAt: dbW.createdAt.toISOString(),
          });
        }
      });
    }
  } catch (e: any) {}

  return NextResponse.json({ warehouses: warehouseList });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'WAREHOUSE')) {
    return NextResponse.json({ error: 'Unauthorized: Admin or Warehouse operator role required.' }, { status: 403 });
  }

  const { code, name, address, contactPerson, contactEmail, binCode, binZone, binCapacity } = await req.json();

  if (!code || !name || !address) {
    return NextResponse.json({ error: 'Warehouse Code, Name, and Address are required.' }, { status: 400 });
  }

  const cleanCode = code.trim().toUpperCase();
  const persistentWarehouses = loadPersistentWarehouses();

  let targetWh = persistentWarehouses[cleanCode];

  if (!targetWh) {
    targetWh = {
      id: `wh_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
      code: cleanCode,
      name: name.trim(),
      address: address.trim(),
      contactPerson: contactPerson || user.name || 'Operations Manager',
      contactEmail: contactEmail || user.email || 'warehouse@logiqon.com',
      bins: binCode
        ? [{ id: `bin_${Date.now()}`, code: binCode.trim().toUpperCase(), zone: binZone || 'Zone A', capacityUnits: parseInt(binCapacity, 10) || 1000, isOccupied: false }]
        : [{ id: `bin_${Date.now()}`, code: 'BIN-A1-01', zone: 'Zone A - Fast Pick', capacityUnits: 1000, isOccupied: false }],
      createdAt: new Date().toISOString(),
    };
  } else {
    // Add new bin if provided
    if (binCode) {
      const cleanBinCode = binCode.trim().toUpperCase();
      if (!targetWh.bins.some((b) => b.code === cleanBinCode)) {
        targetWh.bins.push({
          id: `bin_${Date.now()}`,
          code: cleanBinCode,
          zone: binZone || 'Zone A',
          capacityUnits: parseInt(binCapacity, 10) || 1000,
          isOccupied: false,
        });
      }
    }
  }

  persistentWarehouses[cleanCode] = targetWh;
  savePersistentWarehouses(persistentWarehouses);

  try {
    await prisma.warehouse.upsert({
      where: { code: cleanCode },
      update: { name: targetWh.name, address: targetWh.address },
      create: { code: cleanCode, name: targetWh.name, address: targetWh.address },
    });
  } catch (e: any) {}

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'WAREHOUSE_LOCATION_CONFIGURED',
    module: 'WAREHOUSE_OPERATIONS',
    targetId: targetWh.id,
    payloadJson: { code: cleanCode, name: targetWh.name, binCount: targetWh.bins.length },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `Warehouse Location '${cleanCode}' updated with ${targetWh.bins.length} bin locations.`,
    warehouse: targetWh,
  });
}
