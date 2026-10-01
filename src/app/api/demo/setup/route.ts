// One-time demo setup: patches vendor and item master records with realistic
// demo values so the full supply chain flow works without real client data.
// POST /api/demo/setup — PLATFORM_OWNER only.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  // 2. Set warranty periods on published store items
  const warrantyMap: Record<string, number> = {
    'LQ-SCN-00101': 12, // Barcode Scanner — 12 months
    'LQ-PRT-00102': 12, // Label Printer — 12 months
    'LQ-MOB-00103': 24, // Rugged Mobile Computer — 24 months
    'LQ-RFD-00104': 12, // RFID Tags — 12 months
    'LQ-RFD-00109': 24, // RFID Portal Reader — 24 months
    'LQ-SCN-00110': 12, // Fixed Mount Scanner — 12 months
    'LQ-SCN-00113': 12, // Ring Scanner — 12 months
    'LQ-PRT-00114': 24, // Industrial Printer — 24 months
    'LQ-MOB-00115': 24, // Cold Storage Terminal — 24 months
  };

  for (const [sku, months] of Object.entries(warrantyMap)) {
    const updated = await prisma.itemMaster.updateMany({
      where: { sku },
      data: {
        warrantyPeriodMonths: months,
        warrantyStartRule: 'DELIVERY_DATE',
        serialTracked: true,
      },
    });
    if (updated.count > 0) results.push(`Item ${sku}: warranty set to ${months} months`);
  }

  // 3. Set supplierEmail on items that don't have vendor poEmail yet
  await prisma.itemMaster.updateMany({
    where: { supplierEmail: null },
    data: { supplierEmail: imap },
  });
  results.push('Item supplierEmail fallback set to IMAP inbox');

  return NextResponse.json({ success: true, patched: results });
}
