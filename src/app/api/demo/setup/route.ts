// One-time demo setup: patches vendor and item master records with realistic
// demo values so the full supply chain flow works without real client data.
// POST /api/demo/setup — PLATFORM_OWNER only.
//
// Product catalog model:
//   costPrice        = what LogiQ pays the supplier
//   sellingPrice     = what LogiQ charges the customer (set by LogiQ in Item Master)
//   supplierItemCode = the supplier's own catalog number (used on POs sent to them)
//   sku              = LogiQ's internal code (shown to customers in the store)
//
// Only 5 products are published to the storefront — these represent the demo catalog.
// All others are set to DRAFT / unpublished.
//
// Note: this is unrelated to the Sektor courier/delivery tracking integration
// (sektorStatus, sektorTrackingNumber, /api/webhooks/sektor) — that is a real,
// separate feature for tracking shipments after dispatch, not a supplier.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// The 5 storefront products for the demo. supplierCode is a generic, randomly
// generated supplier catalog number — not tied to any particular brand.
const DEMO_PRODUCTS: Record<string, {
  supplierCode: string;
  costPrice: number;
  sellingPrice: number;
  warrantyMonths: number;
  description: string;
}> = {
  'LQ-SCN-00101': {
    supplierCode: '482917',
    costPrice: 185.00,
    sellingPrice: 299.00,
    warrantyMonths: 12,
    description: 'Heavy-duty IP65 Bluetooth 2D barcode scanner for warehouse receiving and bin picking.',
  },
  'LQ-PRT-00102': {
    supplierCode: '739204',
    costPrice: 420.00,
    sellingPrice: 649.00,
    warrantyMonths: 12,
    description: 'High-speed industrial thermal label printer with Ethernet, USB & Wi-Fi module.',
  },
  'LQ-MOB-00103': {
    supplierCode: '615830',
    costPrice: 1150.00,
    sellingPrice: 1799.00,
    warrantyMonths: 24,
    description: 'Enterprise 5.5-inch rugged mobile terminal with 2D Zebra scan engine & 4G SIM.',
  },
  'LQ-RFD-00104': {
    supplierCode: '294761',
    costPrice: 62.00,
    sellingPrice: 99.00,
    warrantyMonths: 12,
    description: 'High-durability printable UHF RFID adhesive tags for pallet and container tracking.',
  },
  'LQ-RFD-00109': {
    supplierCode: '856402',
    costPrice: 2850.00,
    sellingPrice: 4499.00,
    warrantyMonths: 24,
    description: 'Industrial 4-port UHF RFID reader for automatic dock door pallet scanning.',
  },
};

const DEMO_SKUS = Object.keys(DEMO_PRODUCTS);

// Known demo vendors — fallback PO emails are real-looking EXTERNAL addresses.
// Never the internal logiqon.* domain: that is a platform login/IMAP credential,
// not a supplier mailbox, and a PO sent there is a PO sent to ourselves.
const DEMO_SUPPLIER_PO_EMAILS: Record<string, string> = {
  'Apex Hardware & Logistics Ltd': 'orders@apexhardware.com.au',
  'Smith Logistics Pty Ltd': 'orders@smithlogistics.com.au',
  'Jonathan Logistics Hub': 'orders@jonathanlogisticshub.com.au',
};

function isInternalDomain(email: string | null | undefined): boolean {
  return !!email && /@logiqon\.(tech|com)$/i.test(email.trim());
}

function fallbackSupplierEmail(companyName: string): string {
  if (DEMO_SUPPLIER_PO_EMAILS[companyName]) return DEMO_SUPPLIER_PO_EMAILS[companyName];
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'supplier';
  return `orders@${slug}.com.au`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results: string[] = [];

  // 1. Patch vendors with demo bank details + emails. PO/AP email is only ever
  // filled in or corrected — never pointed at our own logiqon.* domain.
  const vendors = await prisma.vendor.findMany();
  for (const vendor of vendors) {
    const isApex = vendor.companyName?.toLowerCase().includes('apex');
    const poEmail = vendor.poEmail && !isInternalDomain(vendor.poEmail) ? vendor.poEmail : fallbackSupplierEmail(vendor.companyName);
    const apEmail = vendor.apEmail && !isInternalDomain(vendor.apEmail) ? vendor.apEmail : poEmail;
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        bankBsb: vendor.bankBsb || '012-003',
        bankAccountNumber: vendor.bankAccountNumber || (isApex ? '987654321' : '123456789'),
        bankAccountName: vendor.bankAccountName || vendor.companyName,
        poEmail,
        apEmail,
        myobContactId: vendor.myobContactId || `DEMO-MYOB-VENDOR-${vendor.id.slice(0, 8)}`,
      },
    });
    results.push(`Vendor patched: ${vendor.companyName} — PO email: ${poEmail}`);
  }

  // 2. Unpublish all items that are NOT in the 5-product demo catalog
  const unpublished = await prisma.itemMaster.updateMany({
    where: { sku: { notIn: DEMO_SKUS } },
    data: { publishToStore: false },
  });
  results.push(`Unpublished ${unpublished.count} non-demo item(s) from storefront`);

  // 3. Configure the 5 demo products:
  //    - costPrice = what we pay the supplier, sellingPrice set by LogiQ
  //    - supplierItemCode = the supplier's own catalog number (goes on POs)
  //    - warranty, serial tracking, store listing flags
  for (const [sku, cfg] of Object.entries(DEMO_PRODUCTS)) {
    const updated = await prisma.itemMaster.updateMany({
      where: { sku },
      data: {
        publishToStore: true,
        status: 'ACTIVE',
        costPrice: cfg.costPrice,
        sellingPrice: cfg.sellingPrice,
        supplierItemCode: cfg.supplierCode,
        storeDescription: cfg.description,
        warrantyPeriodMonths: cfg.warrantyMonths,
        warrantyStartRule: 'DELIVERY_DATE',
        serialTracked: true,
        taxPercent: 10,
      },
    });
    if (updated.count > 0) {
      const margin = (((cfg.sellingPrice - cfg.costPrice) / cfg.sellingPrice) * 100).toFixed(0);
      results.push(
        `${sku}: published ✓ | cost AUD ${cfg.costPrice} | sell AUD ${cfg.sellingPrice} | margin ${margin}% | Supplier code: ${cfg.supplierCode}`
      );
    } else {
      results.push(`${sku}: NOT FOUND in Item Master — skipped`);
    }
  }

  // Item-level supplierEmail is left alone — the PO flow already falls back
  // to the linked vendor's poEmail (set above) when it is not set per-item.

  return NextResponse.json({ success: true, patched: results });
}
