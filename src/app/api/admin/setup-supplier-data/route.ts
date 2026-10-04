import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Vendor supplier catalog codes keyed by LogiQ SKU
const SUPPLIER_CODES: Record<string, string> = {
  // Apex Hardware & Logistics Ltd
  'LQ-SCN-00101': 'APX-HD900-2D',
  'LQ-PRT-00102': 'APX-LP300-TT',
  'LQ-MOB-00103': 'APX-PDAX5-A13',
  'LQ-RFD-00104': 'APX-RFDT-UHF100',
  'LQ-SCL-00105': 'APX-LS300-SS',
  'LQ-RFD-00109': 'APX-GATE400-4P',
  'LQ-SCN-00113': 'APX-RNG20-BT2D',
  'LQ-PRT-00114': 'APX-LPH-203DPI',
  'LQ-MOB-00115': 'APX-FRZX-MINUS30',
  'LQ-MNT-00116': 'APX-VESA-FLK-DC',
  'LQ-VER-00117': 'APX-VFY-1D2D-ISO',
  'LQ-ANT-00118': 'APX-ANT-9DBI-CP',
  'LQ-BAT-00121': 'APX-BAT-6700-X5',
  'LQ-CHG-00122': 'APX-CHG-4T4B-ETH',
  'LQ-TBL-00110': 'APX-TBF-G2-WIN11',
  // Smith Logistics Pty Ltd
  'LQ-LBL-00106': 'SML-DT100150-1K',
  'LQ-RBN-00107': 'SML-TTR110300-RES',
  'LQ-PLT-00108': 'SML-PLT-HW1165',
  'LQ-BOX-00111': 'SML-CTN504030-DW',
  'LQ-LBL-00112': 'SML-CRY5025-500',
  'LQ-LBL-00119': 'SML-GHS-FLM-500',
  'LQ-TP-00120': 'SML-WAP70150-RGF',
  'LQ-LBL-00123': 'SML-VOID-PP-500',
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results: { vendorsUpdated: number; itemsUpdated: number; skipped: number } = {
    vendorsUpdated: 0,
    itemsUpdated: 0,
    skipped: 0,
  };

  // 1. Set vendor poEmail from their registered user email (only where not already set)
  const vendors = await prisma.vendor.findMany({
    where: { poEmail: null },
    include: { user: { select: { email: true } } },
  });

  for (const vendor of vendors) {
    if (vendor.user?.email) {
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { poEmail: vendor.user.email },
      });
      results.vendorsUpdated++;
    }
  }

  // 2. Set supplier item codes (only where not already set)
  for (const [sku, supplierCode] of Object.entries(SUPPLIER_CODES)) {
    const item = await prisma.itemMaster.findUnique({ where: { sku } });
    if (!item) { results.skipped++; continue; }
    if (item.supplierItemCode) { results.skipped++; continue; }

    await prisma.itemMaster.update({
      where: { sku },
      data: { supplierItemCode: supplierCode },
    });
    results.itemsUpdated++;
  }

  return NextResponse.json({
    ok: true,
    ...results,
    message: `Set poEmail on ${results.vendorsUpdated} vendor(s), supplier codes on ${results.itemsUpdated} item(s), skipped ${results.skipped} already-set.`,
  });
}
