import { PrismaClient, UserRole, VendorStatus, ItemStatus, LedgerMovementType } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@logiqon.tech' },
    update: {},
    create: {
      email: 'customer@logiqon.tech',
      passwordHash,
      fullName: 'Sarah Customer',
      role: UserRole.CUSTOMER,
    },
  });

  console.log('✅ Users seeded: Admin, Vendor, Warehouse, Customer');

  // 2. Vendor Company Profile (1-to-1 with Vendor User)
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
  const catElectronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Industrial Electronics', slug: 'electronics' },
  });

  const catHardware = await prisma.category.upsert({
    where: { slug: 'warehouse-hardware' },
    update: {},
    create: { name: 'Warehouse Hardware & Scanners', slug: 'warehouse-hardware' },
  });

  // 4. Units of Measure (UOM)
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

  // 5. Item Master
  const item1 = await prisma.itemMaster.upsert({
    where: { sku: 'LOGIQ-SCN-001' },
    update: {},
    create: {
      sku: 'LOGIQ-SCN-001',
      barcode: '9312345678901',
      itemName: 'Industrial Wireless Barcode Scanner HD-900',
      description: 'Rugged IP65 rated handheld barcode scanner for warehouse picking.',
      categoryId: catHardware.id,
      uomId: uomPcs.id,
      costPrice: 150.00,
      sellingPrice: 299.00,
      status: ItemStatus.ACTIVE,
      vendorId: vendor.id,
    },
  });

  const item2 = await prisma.itemMaster.upsert({
    where: { sku: 'LOGIQ-TAG-002' },
    update: {},
    create: {
      sku: 'LOGIQ-TAG-002',
      barcode: '9312345678902',
      itemName: 'Smart Asset Tracking RFID Labels (Pack of 100)',
      description: 'High durability RFID adhesive tags for pallet and bin tracking.',
      categoryId: catElectronics.id,
      uomId: uomBox.id,
      costPrice: 45.00,
      sellingPrice: 89.00,
      status: ItemStatus.ACTIVE,
      vendorId: vendor.id,
    },
  });

  console.log('✅ Item Master Data seeded: 2 items');

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

  // 7. Stock Ledger Entry (Immutable Movement linked to User createdBy)
  await prisma.stockLedger.create({
    data: {
      warehouseId: warehouse1.id,
      itemMasterId: item1.id,
      binLocation: 'Aisle 2 - Bin B-04',
      movementType: LedgerMovementType.RECEIPT,
      quantityDelta: 100,
      referenceNumber: 'PO-2026-0001',
      reasonCode: 'INITIAL_STOCK_RECEIPT',
      createdById: whUser.id,
    },
  });

  // Update WarehouseStock summary table
  await prisma.warehouseStock.upsert({
    where: {
      warehouseId_itemMasterId_binLocation: {
        warehouseId: warehouse1.id,
        itemMasterId: item1.id,
        binLocation: 'Aisle 2 - Bin B-04',
      },
    },
    update: { quantityOnHand: 100 },
    create: {
      warehouseId: warehouse1.id,
      itemMasterId: item1.id,
      binLocation: 'Aisle 2 - Bin B-04',
      quantityOnHand: 100,
      quantityReserved: 0,
    },
  });

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
