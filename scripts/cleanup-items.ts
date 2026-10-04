/**
 * Deletes all item_master records that are NOT one of the 5 core shop products.
 * Cleans up dependent records in the correct order to avoid FK violations.
 * Run with: npx tsx scripts/cleanup-items.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KEEP_SKUS = [
  'LQ-SCN-00101', // Barcode Scanner — Zebra DS2200
  'LQ-PRT-00102', // Label Printer — Zebra ZD421
  'LQ-MOB-00103', // Mobile Computer — Honeywell CT47
  'LQ-RFD-00104', // RFID Tags — Honeywell IT70
  'LQ-RFD-00109', // RFID Reader — Zebra FX9600
];

async function main() {
  const toDelete = await prisma.itemMaster.findMany({
    where: { sku: { notIn: KEEP_SKUS } },
    select: { id: true, sku: true, itemName: true },
  });

  if (toDelete.length === 0) {
    console.log('Nothing to delete — only the 5 core items exist.');
    return;
  }

  const ids = toDelete.map((i) => i.id);
  console.log(`\nDeleting ${toDelete.length} items:`);
  toDelete.forEach((i) => console.log(`  - ${i.sku}: ${i.itemName}`));

  // 1. Warranty records (required itemMasterId)
  const w = await prisma.warrantyRecord.deleteMany({ where: { itemMasterId: { in: ids } } });
  console.log(`\nDeleted ${w.count} warranty record(s)`);

  // 2. Stock ledger entries (required itemMasterId)
  const l = await prisma.stockLedger.deleteMany({ where: { itemMasterId: { in: ids } } });
  console.log(`Deleted ${l.count} stock ledger entry(ies)`);

  // 3. Warehouse stock (required itemMasterId)
  const s = await prisma.warehouseStock.deleteMany({ where: { itemMasterId: { in: ids } } });
  console.log(`Deleted ${s.count} warehouse stock row(s)`);

  // 4. Null-out optional itemMasterId references so the FK allows the item delete
  const vp = await prisma.vendorPricing.updateMany({
    where: { itemMasterId: { in: ids } },
    data: { itemMasterId: null },
  });
  console.log(`Nulled ${vp.count} vendor pricing record(s)`);

  const cp = await prisma.customerPricing.updateMany({
    where: { itemMasterId: { in: ids } },
    data: { itemMasterId: null },
  });
  console.log(`Nulled ${cp.count} customer pricing record(s)`);

  // 5. Delete the item masters
  const deleted = await prisma.itemMaster.deleteMany({
    where: { id: { in: ids } },
  });
  console.log(`\nDeleted ${deleted.count} item master record(s).`);

  // Confirm what's left
  const remaining = await prisma.itemMaster.findMany({ select: { sku: true, itemName: true } });
  console.log('\nRemaining items in Item Master:');
  remaining.forEach((i) => console.log(`  ✓ ${i.sku}: ${i.itemName}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
