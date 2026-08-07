import { PrismaClient, UserRole, VendorStatus, ItemStatus, LedgerMovementType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getSeedDemoProducts } from '../src/lib/products';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Users & Passwords
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@logiqon.tech' },
    update: {},
    create: {
      email: 'admin@logiqon.tech',
      passwordHash,
      fullName: 'Super Admin (LogiQ)',
      role: UserRole.PLATFORM_OWNER,
      mfaEnabled: true,
    },
  });

  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@logiqon.tech' },
    update: {},
    create: {
      email: 'vendor@logiqon.tech',
      passwordHash,
      fullName: 'John Supplier (Apex Hardware)',
      role: UserRole.VENDOR,
    },
  });

  const whUser = await prisma.user.upsert({
    where: { email: 'warehouse@logiqon.tech' },
    update: {},
    create: {
      email: 'warehouse@logiqon.tech',
      passwordHash,
      fullName: 'Robert Operations (WH Manager)',
      role: UserRole.WAREHOUSE,
    },
  });

  console.log('✅ Users seeded: Admin, Vendor, Warehouse');

  // 2. Vendor Company Profile
  const vendor = await prisma.vendor.upsert({
    where: { abnAcn: '12345678901' },
    update: {},
    create: {
      companyName: 'Apex Hardware & Logistics Ltd',
      abnAcn: '12345678901',
      status: VendorStatus.APPROVED,
      userId: vendorUser.id,
      approvedAt: new Date(),
    },
  });

  console.log('✅ Vendor profile seeded: Apex Hardware');

  // 3. Categories
  const catHardware = await prisma.category.upsert({
    where: { slug: 'barcode-scanners' },
    update: {},
    create: { name: 'Barcode Scanners', slug: 'barcode-scanners' },
  });

  const catElectronics = await prisma.category.upsert({
    where: { slug: 'rfid-tags' },
    update: {},
    create: { name: 'RFID Smart Labels & Tags', slug: 'rfid-tags' },
  });

  // 4. Units of Measure
  const uomPcs = await prisma.unitOfMeasure.upsert({
    where: { code: 'PCS' },
    update: {},
    create: { code: 'PCS', name: 'Pieces', description: 'Individual unit' },
  });

  const uomBox = await prisma.unitOfMeasure.upsert({
    where: { code: 'BOX' },
    update: {},
    create: { code: 'BOX', name: 'Box of 10', description: 'Box containing 10 pcs' },
  });

  // 5. Seed 22 Item Master Records from products library
  const seedProducts = getSeedDemoProducts();
  let firstItem: any = null;

  for (const p of Object.values(seedProducts)) {
    const item = await prisma.itemMaster.upsert({
      where: { sku: p.sku },
      update: {
        itemName: p.itemName,
        barcode: p.barcode,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        status: p.status as ItemStatus,
      },
      create: {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        itemName: p.itemName,
        description: p.description || '',
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        status: p.status as ItemStatus,
        vendorId: vendor.id,
        categoryId: catHardware.id,
        uomId: uomPcs.id,
      },
    });
    if (!firstItem) firstItem = item;
  }

  console.log(`✅ Item Master Data seeded: ${Object.keys(seedProducts).length} items`);

  // 6. Warehouse & Vendor-Warehouse Assignment
  const warehouse1 = await prisma.warehouse.upsert({
    where: { code: 'WH-SYD-01' },
    update: {},
    create: {
      code: 'WH-SYD-01',
      name: 'Sydney Central Logistics Hub',
      address: '100 Logistics Way, Chullora NSW 2190, Australia',
    },
  });

  await prisma.vendorWarehouse.upsert({
    where: {
      vendorId_warehouseId: {
        vendorId: vendor.id,
        warehouseId: warehouse1.id,
      },
    },
    update: {},
    create: {
      vendorId: vendor.id,
      warehouseId: warehouse1.id,
    },
  });

  console.log('✅ Warehouse & Vendor-Warehouse Access Assignment seeded: WH-SYD-01');

  // 7. Stock Ledger Entry
  if (firstItem) {
    await prisma.stockLedger.create({
      data: {
        warehouseId: warehouse1.id,
        itemMasterId: firstItem.id,
        binLocation: 'Aisle 2 - Bin B-04',
        movementType: LedgerMovementType.RECEIPT,
        quantityDelta: 100,
        referenceNumber: 'PO-2026-0001',
        reasonCode: 'INITIAL_STOCK_RECEIPT',
        createdById: whUser.id,
      },
    });

    await prisma.warehouseStock.upsert({
      where: {
        warehouseId_itemMasterId_binLocation: {
          warehouseId: warehouse1.id,
          itemMasterId: firstItem.id,
          binLocation: 'Aisle 2 - Bin B-04',
        },
      },
      update: { quantityOnHand: 100 },
      create: {
        warehouseId: warehouse1.id,
        itemMasterId: firstItem.id,
        binLocation: 'Aisle 2 - Bin B-04',
        quantityOnHand: 100,
        quantityReserved: 0,
      },
    });
  }

  console.log('✅ Stock Ledger & Balances seeded');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
