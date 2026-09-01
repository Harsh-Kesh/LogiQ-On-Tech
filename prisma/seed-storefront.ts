// One-time (but safely re-runnable) population of: (1) storefront images/descriptions
// for the item catalog so the public Products pages show real listings again, (2) vendor
// allocation for the one item that had none, and (3) opening stock across all warehouses
// so Inventory actually shows quantities on hand. Run with:
//   npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed-storefront.ts
// against whichever DATABASE_URL is active (local, or Neon for production).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Only these 9 SKUs have real product photography on disk (public/images/products/**),
// carried over from the marketing site before the JSON->Postgres migration. Publishing
// only these to the storefront keeps every listing backed by a real, matching image
// instead of a generic stand-in for the other 15 catalog items (labels, tape, pallets,
// etc.) that never had dedicated photography.
const STOREFRONT_ITEMS: Record<string, { images: string[]; storeDescription: string }> = {
  'LQ-SCN-00101': {
    images: ['/images/products/barcode-scanners/zebra-ds2200.jpg', '/images/products/barcode-scanners/zebra-ls2208.jpg'],
    storeDescription: 'Heavy-duty IP65 Bluetooth 2D barcode scanner for warehouse receiving and bin picking.',
  },
  'LQ-PRT-00102': {
    images: ['/images/products/desktop-printers/zebra-zd421.jpg', '/images/products/desktop-printers/honeywell-pc42t-plus.jpg'],
    storeDescription: 'High-speed industrial thermal label printer with Ethernet, USB & Wi-Fi module.',
  },
  'LQ-MOB-00103': {
    images: ['/images/products/mobile-computers/honeywell-ct47.jpg', '/images/products/mobile-computers/zebra-et5x.jpg'],
    storeDescription: 'Enterprise 5.5-inch rugged mobile terminal with 2D Zebra scan engine & 4G SIM.',
  },
  'LQ-RFD-00104': {
    images: ['/images/products/rfid/honeywell-it70-tags.jpg'],
    storeDescription: 'High-durability printable UHF RFID adhesive tags for pallet and container tracking.',
  },
  'LQ-RFD-00109': {
    images: ['/images/products/rfid/zebra-fx9600.jpg', '/images/products/rfid/zebra-atr7000.jpg'],
    storeDescription: 'Industrial 4-port UHF RFID reader for automatic dock door pallet scanning.',
  },
  'LQ-SCN-00110': {
    images: ['/images/products/barcode-scanners/zebra-ds457.jpg', '/images/products/barcode-scanners/zebra-ds4600.jpg'],
    storeDescription: 'Conveyor belt high-speed barcode reader for automated package sortation.',
  },
  'LQ-SCN-00113': {
    images: ['/images/products/barcode-scanners/zebra-cs60.jpg', '/images/products/barcode-scanners/cipherlab-2200.jpg'],
    storeDescription: 'Hands-free Bluetooth finger ring scanner with haptic vibration feedback.',
  },
  'LQ-PRT-00114': {
    images: ['/images/products/desktop-printers/honeywell-e-class-mark-iii.jpg', '/images/products/desktop-printers/bixolon-xd5-40.jpg'],
    storeDescription: 'Full metal chassis 24/7 continuous duty cycle thermal label printer.',
  },
  'LQ-MOB-00115': {
    images: ['/images/products/mobile-computers/honeywell-cn80g.jpg', '/images/products/mobile-computers/honeywell-ck65.jpg'],
    storeDescription: 'Deep-freeze rated mobile computer operating reliably down to -30C with defroster.',
  },
};

// Opening stock for every catalog item (not just the storefront 9) so warehouses show
// real quantities on hand for internal operations too. Consumables (labels, tape, tags,
// pallets, cartons, ribbons) get bulk pack/roll/pallet-scale quantities; hardware gets
// per-unit quantities scaled to how expensive/bulky the item actually is.
const OPENING_STOCK: Record<string, number> = {
  'LQ-SCN-00101': 320,
  'LQ-PRT-00102': 180,
  'LQ-MOB-00103': 240,
  'LQ-RFD-00104': 1200,
  'LQ-SCL-00105': 60,
  'LQ-LBL-00106': 2400,
  'LQ-RBN-00107': 1600,
  'LQ-PLT-00108': 850,
  'LQ-RFD-00109': 90,
  'LQ-SCN-00110': 140,
  'LQ-BOX-00111': 3200,
  'LQ-LBL-00112': 1400,
  'LQ-SCN-00113': 210,
  'LQ-PRT-00114': 75,
  'LQ-MOB-00115': 130,
  'LQ-MNT-00116': 260,
  'LQ-VER-00117': 45,
  'LQ-ANT-00118': 150,
  'LQ-LBL-00119': 1100,
  'LQ-TP-00120': 2600,
  'LQ-BAT-00121': 900,
  'LQ-CHG-00122': 220,
  'LQ-TBL-00110': 95,
  'LQ-LBL-00123': 1300,
};

// Fixed, deterministic split across the 4 seeded warehouses so every warehouse ends up
// with a non-zero share of every item (matches getSeededWarehouses() in src/lib/stock.ts).
const WAREHOUSE_SPLIT: Array<{ code: string; share: number }> = [
  { code: 'WH-SYD-01', share: 0.4 },
  { code: 'WH-MEL-02', share: 0.3 },
  { code: 'WH-BNE-03', share: 0.2 },
  { code: 'WH-PER-04', share: 0.1 },
];

const MAIN_BIN = 'MAIN';
const SEED_REFERENCE_PREFIX = 'GRN-SEED-INITIAL';

async function main() {
  const apex = await prisma.vendor.findFirst({ where: { companyName: 'Apex Hardware & Logistics Ltd' } });
  if (!apex) throw new Error('Expected vendor "Apex Hardware & Logistics Ltd" to already exist — run prisma/seed-production.ts first.');

  console.log('Allocating unassigned items to a vendor...');
  const unassigned = await prisma.itemMaster.updateMany({
    where: { vendorId: null },
    data: { vendorId: apex.id },
  });
  console.log(`  ${unassigned.count} item(s) allocated to ${apex.companyName}`);

  console.log('Publishing storefront listings...');
  let published = 0;
  for (const [sku, data] of Object.entries(STOREFRONT_ITEMS)) {
    const item = await prisma.itemMaster.findUnique({ where: { sku } });
    if (!item) { console.log(`  SKIP ${sku} — not found in Item Master`); continue; }
    await prisma.itemMaster.update({
      where: { sku },
      data: {
        publishToStore: true,
        storeDescription: data.storeDescription,
        storeImages: data.images,
        imageUrl: item.imageUrl || data.images[0],
      },
    });
    published++;
  }
  console.log(`  ${published} item(s) published to the storefront`);

  console.log('Seeding opening stock...');
  const warehouses = await prisma.warehouse.findMany({ where: { code: { in: WAREHOUSE_SPLIT.map((w) => w.code) } } });
  const whByCode = new Map(warehouses.map((w) => [w.code, w]));

  let inserted = 0, skipped = 0;
  for (const [sku, totalQty] of Object.entries(OPENING_STOCK)) {
    const item = await prisma.itemMaster.findUnique({ where: { sku } });
    if (!item) { console.log(`  SKIP ${sku} — not found in Item Master`); continue; }
    const vendor = item.vendorId ? await prisma.vendor.findUnique({ where: { id: item.vendorId } }) : null;

    for (const { code, share } of WAREHOUSE_SPLIT) {
      const wh = whByCode.get(code);
      if (!wh) continue;
      const qty = Math.round(totalQty * share);
      if (qty <= 0) continue;
      const referenceNumber = `${SEED_REFERENCE_PREFIX}-${sku}-${code}`;

      const existing = await prisma.stockLedger.findFirst({ where: { referenceNumber, itemMasterId: item.id, warehouseId: wh.id } });
      if (existing) { skipped++; continue; }

      await prisma.stockLedger.create({
        data: {
          warehouseId: wh.id,
          itemMasterId: item.id,
          sku: item.sku,
          barcode: item.barcode,
          itemName: item.itemName,
          vendorId: item.vendorId,
          vendorName: vendor?.companyName || null,
          binLocation: MAIN_BIN,
          movementType: 'RECEIPT',
          quantityDelta: qty,
          referenceNumber,
          reasonCode: vendor ? `Vendor Delivery GRN (${vendor.companyName})` : 'Direct Platform Purchase / Internal Stock',
          createdByEmail: 'owner@logiqon.com',
        },
      });
      inserted++;
    }
  }
  console.log(`  ${inserted} stock ledger row(s) created, ${skipped} already existed`);

  // Vendor Master Data (VendorPricing) is normally created/updated as a side effect of
  // the Item Master creation API (see upsertVendorMasterRecord in src/lib/vendor-master.ts)
  // — every item allocated to a vendor gets a matching sourcing/cost record there. These
  // 24 catalog items were seeded straight into ItemMaster, bypassing that route entirely,
  // so Vendor Master Data was left empty despite every item having a vendorId. Backfill it
  // here with the same defaults the real route uses (Net 30 / EXW / 7-day lead time).
  console.log('Backfilling Vendor Master Data...');
  let vendorPricingCreated = 0, vendorPricingSkipped = 0;
  const allItems = await prisma.itemMaster.findMany({ where: { sku: { in: Object.keys(OPENING_STOCK) } } });
  for (const item of allItems) {
    if (!item.vendorId) continue;
    const vendor = await prisma.vendor.findUnique({ where: { id: item.vendorId } });
    if (!vendor) continue;

    const existing = await prisma.vendorPricing.findFirst({ where: { vendorName: vendor.companyName, itemCode: item.sku } });
    if (existing) { vendorPricingSkipped++; continue; }

    await prisma.vendorPricing.create({
      data: {
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        itemMasterId: item.id,
        itemCode: item.sku,
        itemDescription: item.itemName,
        purchasePrice: item.costPrice,
        currency: 'AUD',
        moq: item.moq,
        leadTimeDays: 7,
        paymentTerms: 'Net 30',
        incoterms: 'EXW',
      },
    });
    vendorPricingCreated++;
  }
  console.log(`  ${vendorPricingCreated} Vendor Master Data row(s) created, ${vendorPricingSkipped} already existed`);

  console.log('Done.');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
