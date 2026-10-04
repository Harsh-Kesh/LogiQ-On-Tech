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

// Known demo vendors whose platform LOGIN email lives on our own logiqon.* domain
// (vendor@logiqon.tech) — that is a test account credential, not a real supplier
// mailbox, so it must never be used as the PO recipient. These overrides always win,
// even if poEmail was previously (wrongly) auto-filled from that login address.
const DEMO_SUPPLIER_PO_EMAILS: Record<string, string> = {
  'Apex Hardware & Logistics Ltd': 'orders@apexhardware.com.au',
  'Smith Logistics Pty Ltd': 'orders@smithlogistics.com.au',
  'Jonathan Logistics Hub': 'orders@jonathanlogisticshub.com.au',
};

function isOwnDomain(email: string | null | undefined): boolean {
  return !!email && /@logiqon\.(tech|com)$/i.test(email.trim());
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results: { vendorsUpdated: number; itemsUpdated: number; itemEmailsCleared: number; skipped: number } = {
    vendorsUpdated: 0,
    itemsUpdated: 0,
    itemEmailsCleared: 0,
    skipped: 0,
  };

  // 1. Set vendor poEmail. Fill in anything missing from their registered user email,
  // BUT always correct it if that email is on our own logiqon.* domain (a platform
  // login credential, never a real supplier mailbox) or matches a known demo vendor.
  const allVendors = await prisma.vendor.findMany({
    include: { user: { select: { email: true } } },
  });

  for (const vendor of allVendors) {
    const knownFix = DEMO_SUPPLIER_PO_EMAILS[vendor.companyName];
    const needsFix = knownFix && (isOwnDomain(vendor.poEmail) || !vendor.poEmail);
    if (needsFix) {
      await prisma.vendor.update({ where: { id: vendor.id }, data: { poEmail: knownFix, apEmail: isOwnDomain(vendor.apEmail) ? knownFix : vendor.apEmail } });
      results.vendorsUpdated++;
    } else if (!vendor.poEmail && vendor.user?.email && !isOwnDomain(vendor.user.email)) {
      await prisma.vendor.update({ where: { id: vendor.id }, data: { poEmail: vendor.user.email } });
      results.vendorsUpdated++;
    } else if (isOwnDomain(vendor.poEmail)) {
      // A vendor with no known fix but a poEmail stuck on our own domain — clear it so the
      // webhook's "no supplier email configured" warning fires instead of silently misdelivering.
      await prisma.vendor.update({ where: { id: vendor.id }, data: { poEmail: null, apEmail: isOwnDomain(vendor.apEmail) ? null : vendor.apEmail } });
      results.vendorsUpdated++;
    }
  }

  // 1b. Clear any item-level supplierEmail that was previously (wrongly) set to our own
  // domain — e.g. by an older version of the demo seeding route. Once cleared, the PO flow
  // falls back cleanly to the (now-corrected) vendor poEmail above.
  const itemsWithBadEmail = await prisma.itemMaster.findMany({
    where: { supplierEmail: { endsWith: '@logiqon.tech' } },
  });
  const itemsWithBadEmail2 = await prisma.itemMaster.findMany({
    where: { supplierEmail: { endsWith: '@logiqon.com' } },
  });
  for (const item of [...itemsWithBadEmail, ...itemsWithBadEmail2]) {
    await prisma.itemMaster.update({ where: { id: item.id }, data: { supplierEmail: null } });
    results.itemEmailsCleared++;
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
    message: `Fixed poEmail on ${results.vendorsUpdated} vendor(s), supplier codes on ${results.itemsUpdated} item(s), cleared ${results.itemEmailsCleared} stale item email(s), skipped ${results.skipped} already-set.`,
  });
}
