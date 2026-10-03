// Sektor product data feed sync — POST /api/sektor/sync
// PLATFORM_OWNER only.
//
// When SEKTOR_API_KEY is configured: calls the real Sektor catalog API, pulls live
// product data, and upserts ItemMaster records (price, description, availability).
//
// When SEKTOR_API_KEY is NOT configured (demo mode): runs against a hardcoded catalog
// of simulated Sektor entries for the 9 published products, demonstrating exactly what
// the live sync will do once credentials are provided.
//
// The dual-code model:
//   sku             = LogiQ-On's internal code  (customer-facing, shown in the shop)
//   supplierItemCode = Sektor's catalog code     (sent on POs so the supplier can match)
// Both live on the same ItemMaster row — the feed sync keeps them in sync.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface SektorCatalogEntry {
  sektorCode: string;       // Sektor's own catalog identifier
  ourSku: string;           // Mapped to our internal ItemMaster sku
  productName: string;
  brand: string;
  costPriceAud: number;     // Sektor's buy price to us (ex GST)
  rrpAud: number;           // Recommended retail price
  leadTimeDays: number;
  availableQty: number;     // Sektor's current stock on hand
  manufacturerPartNumber: string;
}

// Simulated Sektor catalog — mirrors what their API would return for our 9 products.
// In production this comes from GET https://api.sektor.com.au/v2/catalog?apiKey=...
const DEMO_SEKTOR_CATALOG: SektorCatalogEntry[] = [
  {
    sektorCode: 'SEKT-ZBR-DS2208-SR',
    ourSku: 'LQ-SCN-00101',
    productName: 'Zebra DS2208 Barcode Scanner Serial/USB',
    brand: 'Zebra Technologies',
    costPriceAud: 185.00,
    rrpAud: 299.00,
    leadTimeDays: 5,
    availableQty: 480,
    manufacturerPartNumber: 'DS2208-SR6U2100AZW',
  },
  {
    sektorCode: 'SEKT-ZBR-ZD421-TLP',
    ourSku: 'LQ-PRT-00102',
    productName: 'Zebra ZD421 Thermal Label Printer USB+Ethernet',
    brand: 'Zebra Technologies',
    costPriceAud: 420.00,
    rrpAud: 649.00,
    leadTimeDays: 7,
    availableQty: 210,
    manufacturerPartNumber: 'ZD4A022-D01E00EZ',
  },
  {
    sektorCode: 'SEKT-HNW-CT47-AN',
    ourSku: 'LQ-MOB-00103',
    productName: 'Honeywell CT47 Android Rugged Mobile Computer 4G',
    brand: 'Honeywell',
    costPriceAud: 1150.00,
    rrpAud: 1799.00,
    leadTimeDays: 10,
    availableQty: 95,
    manufacturerPartNumber: 'CT47-X0N-38D100G',
  },
  {
    sektorCode: 'SEKT-HNW-IT70-UHF',
    ourSku: 'LQ-RFD-00104',
    productName: 'Honeywell IT70 UHF RFID Adhesive Label Tags (1000pk)',
    brand: 'Honeywell',
    costPriceAud: 62.00,
    rrpAud: 99.00,
    leadTimeDays: 3,
    availableQty: 3200,
    manufacturerPartNumber: 'IT70-240-002',
  },
  {
    sektorCode: 'SEKT-ZBR-FX9600-4P',
    ourSku: 'LQ-RFD-00109',
    productName: 'Zebra FX9600 4-Port UHF RFID Fixed Reader',
    brand: 'Zebra Technologies',
    costPriceAud: 2850.00,
    rrpAud: 4499.00,
    leadTimeDays: 14,
    availableQty: 42,
    manufacturerPartNumber: 'FX9600-82325A50-WW',
  },
  {
    sektorCode: 'SEKT-ZBR-DS457-FM',
    ourSku: 'LQ-SCN-00110',
    productName: 'Zebra DS457 Fixed Mount Barcode Scanner',
    brand: 'Zebra Technologies',
    costPriceAud: 340.00,
    rrpAud: 549.00,
    leadTimeDays: 7,
    availableQty: 175,
    manufacturerPartNumber: 'DS457-SR20009ZZWW',
  },
  {
    sektorCode: 'SEKT-ZBR-CS6080-WR',
    ourSku: 'LQ-SCN-00113',
    productName: 'Zebra CS6080 Bluetooth Ring Scanner',
    brand: 'Zebra Technologies',
    costPriceAud: 275.00,
    rrpAud: 449.00,
    leadTimeDays: 5,
    availableQty: 260,
    manufacturerPartNumber: 'CS6080-SR000000AZZWW',
  },
  {
    sektorCode: 'SEKT-HNW-PX4E-IND',
    ourSku: 'LQ-PRT-00114',
    productName: 'Honeywell PX4E Industrial Thermal Label Printer',
    brand: 'Honeywell',
    costPriceAud: 890.00,
    rrpAud: 1349.00,
    leadTimeDays: 10,
    availableQty: 68,
    manufacturerPartNumber: 'PX4E010000000130',
  },
  {
    sektorCode: 'SEKT-HNW-CN80G-CF',
    ourSku: 'LQ-MOB-00115',
    productName: 'Honeywell CN80G Cold Freezer Mobile Computer -30C',
    brand: 'Honeywell',
    costPriceAud: 2200.00,
    rrpAud: 3499.00,
    leadTimeDays: 14,
    availableQty: 38,
    manufacturerPartNumber: 'CN80G-L0N-2EN220E',
  },
];

async function fetchSektorCatalog(): Promise<SektorCatalogEntry[]> {
  const apiKey = process.env.SEKTOR_API_KEY;
  if (!apiKey) {
    console.log('[Sektor DEMO] No SEKTOR_API_KEY — using simulated catalog data');
    return DEMO_SEKTOR_CATALOG;
  }

  // Live Sektor API call — enabled once client provides API key
  const res = await fetch('https://api.sektor.com.au/v2/catalog', {
    headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Sektor API returned ${res.status}`);
  const data = await res.json();
  // Map Sektor's response shape to our internal type
  return data.products.map((p: any) => ({
    sektorCode: p.sku,
    ourSku: p.customerSku || p.sku,
    productName: p.name,
    brand: p.brand,
    costPriceAud: p.nettPrice,
    rrpAud: p.rrp,
    leadTimeDays: p.leadTimeDays || 7,
    availableQty: p.stockOnHand || 0,
    manufacturerPartNumber: p.mpn || '',
  }));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isDemo = !process.env.SEKTOR_API_KEY;
  const catalog = await fetchSektorCatalog();
  const results: { sku: string; sektorCode: string; action: string; changes: string[] }[] = [];

  for (const entry of catalog) {
    const item = await prisma.itemMaster.findUnique({ where: { sku: entry.ourSku } });
    if (!item) {
      results.push({ sku: entry.ourSku, sektorCode: entry.sektorCode, action: 'SKIPPED', changes: ['Item not found in Item Master'] });
      continue;
    }

    const changes: string[] = [];
    const patch: Record<string, any> = {};

    // Always sync the Sektor code
    if (item.supplierItemCode !== entry.sektorCode) {
      patch.supplierItemCode = entry.sektorCode;
      changes.push(`supplierItemCode: ${item.supplierItemCode || '(none)'} → ${entry.sektorCode}`);
    }

    // Sync manufacturer part number
    if (item.manufacturerCode !== entry.manufacturerPartNumber) {
      patch.manufacturerCode = entry.manufacturerPartNumber;
      changes.push(`manufacturerCode → ${entry.manufacturerPartNumber}`);
    }

    // Sync lead time
    if (item.leadTimeDays !== entry.leadTimeDays) {
      patch.leadTimeDays = entry.leadTimeDays;
      changes.push(`leadTimeDays: ${item.leadTimeDays ?? '?'} → ${entry.leadTimeDays}`);
    }

    // Update cost price if Sektor price changed by more than 1%
    const currentCost = Number(item.costPrice);
    const costDiff = Math.abs(currentCost - entry.costPriceAud) / (currentCost || 1);
    if (costDiff > 0.01) {
      patch.costPrice = entry.costPriceAud;
      changes.push(`costPrice: AUD ${currentCost.toFixed(2)} → AUD ${entry.costPriceAud.toFixed(2)}`);
    }

    if (Object.keys(patch).length > 0) {
      await prisma.itemMaster.update({ where: { sku: entry.ourSku }, data: patch });
      results.push({ sku: entry.ourSku, sektorCode: entry.sektorCode, action: 'UPDATED', changes });
    } else {
      results.push({ sku: entry.ourSku, sektorCode: entry.sektorCode, action: 'NO_CHANGE', changes: [] });
    }
  }

  return NextResponse.json({
    success: true,
    demo: isDemo,
    message: isDemo
      ? 'Simulated Sektor catalog sync complete. Set SEKTOR_API_KEY to connect to the live feed.'
      : 'Live Sektor catalog sync complete.',
    syncedCount: results.filter((r) => r.action === 'UPDATED').length,
    noChangeCount: results.filter((r) => r.action === 'NO_CHANGE').length,
    skippedCount: results.filter((r) => r.action === 'SKIPPED').length,
    results,
  });
}
