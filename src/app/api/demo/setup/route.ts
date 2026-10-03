// One-time demo setup: patches vendor and item master records with realistic
// demo values so the full supply chain flow works without real client data.
// POST /api/demo/setup — PLATFORM_OWNER only.
//
// Product catalog model:
//   costPrice     = what LogiQ pays Sektor (comes from Sektor data feed)
//   sellingPrice  = what LogiQ charges the customer (set by LogiQ in Item Master)
//   supplierItemCode = Sektor's catalog code (used on POs sent to Sektor)
//   sku           = LogiQ's internal code (shown to customers in the store)
//
// Only 5 products are published to the storefront — these represent the demo catalog.
// All others are set to DRAFT / unpublished.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// The 5 storefront products for the demo.
// costPrice  = Sektor's price to us (what the feed brings in)
// sellingPrice = LogiQ's retail price (what the customer pays, owner sets this)
const DEMO_PRODUCTS: Record<string, {
  sektorCode: string;
  costPrice: number;
  sellingPrice: number;
  warrantyMonths: number;
  description: string;
}> = {
  'LQ-SCN-00101': {
    sektorCode: 'SEKT-ZBR-DS2208-SR',
    costPrice: 185.00,
    sellingPrice: 299.00,
    warrantyMonths: 12,
    description: 'Heavy-duty IP65 Bluetooth 2D barcode scanner for warehouse receiving and bin picking.',
  },
  'LQ-PRT-00102': {
    sektorCode: 'SEKT-ZBR-ZD421-TLP',
    costPrice: 420.00,
    sellingPrice: 649.00,
    warrantyMonths: 12,
    description: 'High-speed industrial thermal label printer with Ethernet, USB & Wi-Fi module.',
  },
  'LQ-MOB-00103': {
    sektorCode: 'SEKT-HNW-CT47-AN',
    costPrice: 1150.00,
    sellingPrice: 1799.00,
    warrantyMonths: 24,
    description: 'Enterprise 5.5-inch rugged mobile terminal with 2D Zebra scan engine & 4G SIM.',
  },
  'LQ-RFD-00104': {
    sektorCode: 'SEKT-HNW-IT70-UHF',
    costPrice: 62.00,
    sellingPrice: 99.00,
    warrantyMonths: 12,
    description: 'High-durability printable UHF RFID adhesive tags for pallet and container tracking.',
  },
  'LQ-RFD-00109': {
    sektorCode: 'SEKT-ZBR-FX9600-4P',
    costPrice: 2850.00,
    sellingPrice: 4499.00,
    warrantyMonths: 24,
    description: 'Industrial 4-port UHF RFID reader for automatic dock door pallet scanning.',
  },
};

const DEMO_SKUS = Object.keys(DEMO_PRODUCTS);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const imap = process.env.IMAP_USER || 'demo@logiqon.com';
  const results: string[] = [];

  // 1. Patch vendors with demo bank details + emails
  const vendors = await prisma.vendor.findMany();
  for (const vendor of vendors) {
    const isApex = vendor.companyName?.toLowerCase().includes('apex');
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        bankBsb: vendor.bankBsb || '012-003',
        bankAccountNumber: vendor.bankAccountNumber || (isApex ? '987654321' : '123456789'),
        bankAccountName: vendor.bankAccountName || vendor.companyName,
        poEmail: vendor.poEmail || imap,
        apEmail: vendor.apEmail || imap,
        myobContactId: vendor.myobContactId || `DEMO-MYOB-VENDOR-${vendor.id.slice(0, 8)}`,
      },
    });
    results.push(`Vendor patched: ${vendor.companyName}`);
  }

  // 2. Unpublish all items that are NOT in the 5-product demo catalog
  const unpublished = await prisma.itemMaster.updateMany({
    where: { sku: { notIn: DEMO_SKUS } },
    data: { publishToStore: false },
  });
  results.push(`Unpublished ${unpublished.count} non-demo item(s) from storefront`);

  // 3. Configure the 5 demo products:
  //    - costPrice from Sektor feed, sellingPrice set by LogiQ
  //    - supplierItemCode = Sektor catalog code (goes on POs)
  //    - warranty, serial tracking, store listing flags
  for (const [sku, cfg] of Object.entries(DEMO_PRODUCTS)) {
    const updated = await prisma.itemMaster.updateMany({
      where: { sku },
      data: {
        publishToStore: true,
        status: 'ACTIVE',
        costPrice: cfg.costPrice,
        sellingPrice: cfg.sellingPrice,
        supplierItemCode: cfg.sektorCode,
        storeDescription: cfg.description,
        warrantyPeriodMonths: cfg.warrantyMonths,
        warrantyStartRule: 'DELIVERY_DATE',
        serialTracked: true,
        supplierEmail: imap,
        taxPercent: 10,
      },
    });
    if (updated.count > 0) {
      const margin = (((cfg.sellingPrice - cfg.costPrice) / cfg.sellingPrice) * 100).toFixed(0);
      results.push(
        `${sku}: published ✓ | cost AUD ${cfg.costPrice} | sell AUD ${cfg.sellingPrice} | margin ${margin}% | Sektor: ${cfg.sektorCode}`
      );
    } else {
      results.push(`${sku}: NOT FOUND in Item Master — skipped`);
    }
  }

  // 4. Set supplierEmail fallback on any remaining items
  await prisma.itemMaster.updateMany({
    where: { supplierEmail: null },
    data: { supplierEmail: imap },
  });
  results.push('supplierEmail fallback set on remaining items');

  return NextResponse.json({ success: true, patched: results });
}
