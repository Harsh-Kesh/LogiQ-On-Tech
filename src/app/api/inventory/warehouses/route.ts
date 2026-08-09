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
              { id: `bin_${dbW.id}_01`, code: 'BIN-A1-01', zone: 'Zone A - Fast Pick', capacityUnits: 1000, isOccupied: false },
              { id: `bin_${dbW.id}_02`, code: 'BIN-A1-02', zone: 'Zone A - Reserve', capacityUnits: 2000, isOccupied: false },
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

  const { code, name, address, contactPerson, contactEmail, managerName, managerEmail, binCode, binZone, binCapacity, initialBins } = await req.json();

  if (!code) {
    return NextResponse.json({ error: 'Warehouse Code is required.' }, { status: 400 });
  }

  const cleanCode = code.trim().toUpperCase();
  const persistentWarehouses = loadPersistentWarehouses();
  let targetWh = persistentWarehouses[cleanCode];

  if (!targetWh) {
    if (!name || !address) {
      return NextResponse.json({ error: 'Warehouse Name and Address are required for new location.' }, { status: 400 });
    }

    // Build initial bins list
    let parsedBins = [
      { id: `bin_${Date.now()}_1`, code: 'BIN-A1-01', zone: 'Zone A - Fast Pick', capacityUnits: 1000, isOccupied: false },
    ];

    if (binCode) {
      const rawCodes = binCode.split(',').map((c: string) => c.trim().toUpperCase()).filter(Boolean);
      const rawZones = binZone ? binZone.split(',').map((z: string) => z.trim()).filter(Boolean) : [];

      if (rawCodes.length > 0) {
        parsedBins = rawCodes.map((bc: string, idx: number) => {
          const zoneForBin = rawZones.length === 1
            ? rawZones[0]
            : (rawZones[idx] || rawZones[0] || `Zone ${String.fromCharCode(65 + (idx % 4))}`);
          return {
            id: `bin_${Date.now()}_${idx}`,
            code: bc,
            zone: zoneForBin,
            capacityUnits: parseInt(binCapacity, 10) || 1000,
            isOccupied: false,
          };
        });
      }
    }

    if (Array.isArray(initialBins) && initialBins.length > 0) {
      parsedBins = initialBins.map((ib: any, idx: number) => ({
        id: `bin_${Date.now()}_${idx}`,
        code: (ib.code || `BIN-B${idx + 1}-01`).trim().toUpperCase(),
        zone: ib.zone || 'Zone A',
        capacityUnits: parseInt(ib.capacity, 10) || 1000,
        isOccupied: false,
      }));
    }

    const assignedManagerName = managerName || contactPerson || 'Jack Taylor (Warehouse Lead)';
    const assignedManagerEmail = managerEmail || contactEmail || 'sydney.manager@logiqon.com';

    targetWh = {
      id: `wh_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
      code: cleanCode,
      name: name.trim(),
      address: address.trim(),
      contactPerson: assignedManagerName,
      contactEmail: assignedManagerEmail,
      bins: parsedBins,
      createdAt: new Date().toISOString(),
    };
  } else {
    // Adding a new bin location to an existing warehouse
    if (binCode) {
      const rawCodes = binCode.split(',').map((c: string) => c.trim().toUpperCase()).filter(Boolean);
      rawCodes.forEach((bc: string, idx: number) => {
        if (!targetWh.bins.some((b) => b.code === bc)) {
          targetWh.bins.push({
            id: `bin_${Date.now()}_${idx}`,
            code: bc,
            zone: binZone || 'Zone A',
            capacityUnits: parseInt(binCapacity, 10) || 1000,
            isOccupied: false,
          });
        }
      });
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
    message: `Warehouse '${cleanCode}' updated with ${targetWh.bins.length} bin locations.`,
    warehouse: targetWh,
  });
}
