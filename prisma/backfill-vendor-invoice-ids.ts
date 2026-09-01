// One-time (but safely re-runnable) repair for vendor invoices submitted before the
// vendorId-stamping fix in src/app/api/vendor-invoices/route.ts. Those rows were created
// with vendorId=null, which made them invisible on the submitting vendor's own "My
// Invoices" list (vendorOwnsRecord has no way to match a null vendorId) even though the
// row existed and was visible to the Platform Owner. Run with:
//   npx ts-node --compiler-options '{"module":"commonjs"}' prisma/backfill-vendor-invoice-ids.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orphaned = await prisma.supplierInvoice.findMany({ where: { vendorId: null } });
  console.log(`Found ${orphaned.length} vendor invoice(s) with no vendorId.`);

  let fixed = 0, unmatched = 0;
  for (const inv of orphaned) {
    const vendor = await prisma.vendor.findFirst({ where: { companyName: { equals: inv.vendorName, mode: 'insensitive' } } });
    if (!vendor) {
      console.log(`  UNMATCHED: ${inv.vendorInvoiceNumber} — no vendor found for name "${inv.vendorName}"`);
      unmatched++;
      continue;
    }
    await prisma.supplierInvoice.update({ where: { id: inv.id }, data: { vendorId: vendor.id } });
    console.log(`  Fixed: ${inv.vendorInvoiceNumber} -> ${vendor.companyName}`);
    fixed++;
  }
  console.log(`Done. ${fixed} fixed, ${unmatched} unmatched.`);
}

main()
  .catch((e) => { console.error('Backfill failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
