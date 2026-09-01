// One-time (but safely re-runnable) production data seed.
// Loads the real category tree, UOM list, warehouses, vendor accounts, and the
// 24-item product catalog into whatever DATABASE_URL is active when this runs —
// point it at Neon and run `npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed-production.ts`.
// Every step is an upsert keyed on a natural business key (slug/code/email/sku), so
// running this again is harmless — it fills in anything missing, never duplicates.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'production-seed-data.json'), 'utf-8'));

// Real production login accounts. All start with this password and NO MFA secret —
// each person enrols their own authenticator app on first login (the Platform Owner
// role is enforced to do this immediately by src/middleware.ts). Change these
// passwords after first login; this default is only meant to get you in the door.
const DEFAULT_PASSWORD = 'Password123!';
const ACCOUNTS: Array<{ email: string; fullName: string; role: 'PLATFORM_OWNER' | 'VENDOR'; companyName?: string; abnAcn?: string }> = [
  { email: 'owner@logiqon.com', fullName: 'Platform Owner (LogiQ)', role: 'PLATFORM_OWNER' },
  ...data.vendors.map((v: any) => ({ email: v.email, fullName: v.fullName, role: 'VENDOR' as const, companyName: v.companyName, abnAcn: v.abnAcn })),
];

async function main() {
  console.log('Seeding categories...');
  const categoryIdBySlug = new Map<string, string>();
  // Parents first so parentId FKs resolve.
  for (const c of data.categories.filter((c: any) => !c.parentSlug)) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: { name: c.name, slug: c.slug, description: c.description },
    });
    categoryIdBySlug.set(c.slug, row.id);
  }
  for (const c of data.categories.filter((c: any) => c.parentSlug)) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, parentId: categoryIdBySlug.get(c.parentSlug) || null },
      create: { name: c.name, slug: c.slug, description: c.description, parentId: categoryIdBySlug.get(c.parentSlug) || null },
    });
    categoryIdBySlug.set(c.slug, row.id);
  }
  console.log(`  ${data.categories.length} categories`);

  console.log('Seeding units of measure...');
  const uomIdByCode = new Map<string, string>();
  for (const u of data.uoms) {
    const row = await prisma.unitOfMeasure.upsert({
      where: { code: u.code },
      update: { name: u.name, description: u.description },
      create: { code: u.code, name: u.name, description: u.description },
    });
    uomIdByCode.set(u.code, row.id);
  }
  console.log(`  ${data.uoms.length} UOMs`);

  console.log('Seeding warehouses...');
  for (const w of data.warehouses) {
    await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name, address: w.address, contactPerson: w.contactPerson, contactEmail: w.contactEmail, managerEmail: w.managerEmail },
      create: w,
    });
  }
  console.log(`  ${data.warehouses.length} warehouses`);

  console.log('Seeding accounts...');
  const vendorIdByCompany = new Map<string, string>();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const a of ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { fullName: a.fullName, role: a.role },
      create: { email: a.email, fullName: a.fullName, role: a.role, passwordHash },
    });
    if (a.role === 'VENDOR' && a.companyName && a.abnAcn) {
      const vendor = await prisma.vendor.upsert({
        where: { userId: user.id },
        update: { companyName: a.companyName, abnAcn: a.abnAcn, status: 'APPROVED' },
        create: { userId: user.id, companyName: a.companyName, abnAcn: a.abnAcn, status: 'APPROVED', approvedAt: new Date() },
      });
      vendorIdByCompany.set(a.companyName, vendor.id);
    }
  }
  console.log(`  ${ACCOUNTS.length} accounts (default password: ${DEFAULT_PASSWORD} — change after first login)`);

  console.log('Seeding item catalog...');
  let created = 0, skipped = 0;
  for (const i of data.items) {
    const existing = await prisma.itemMaster.findUnique({ where: { sku: i.sku } });
    if (existing) { skipped++; continue; }
    await prisma.itemMaster.create({
      data: {
        sku: i.sku,
        barcode: i.barcode,
        itemName: i.itemName,
        description: i.description,
        costPrice: i.costPrice,
        sellingPrice: i.sellingPrice,
        moq: i.moq,
        status: i.status,
        categoryId: i.categorySlug ? categoryIdBySlug.get(i.categorySlug) : null,
        uomId: i.uomCode ? uomIdByCode.get(i.uomCode) : null,
        vendorId: i.vendorCompanyName ? vendorIdByCompany.get(i.vendorCompanyName) : null,
        lowStockThreshold: i.lowStockThreshold,
        reorderQuantity: i.reorderQuantity,
      },
    });
    created++;
  }
  console.log(`  ${created} items created, ${skipped} already existed`);

  console.log('Seeding document sequences...');
  const SEQUENCE_CONFIGS: Record<string, { prefix: string; padLength: number }> = {
    SO: { prefix: 'SO', padLength: 5 },
    PO: { prefix: 'PO', padLength: 5 },
    DN: { prefix: 'DSP', padLength: 5 },
    CI: { prefix: 'INV', padLength: 4 },
    VI: { prefix: 'VIN', padLength: 4 },
    CP: { prefix: 'PMT', padLength: 5 },
    VP: { prefix: 'VPT', padLength: 5 },
    OI: { prefix: 'ORQ', padLength: 5 },
    TC: { prefix: 'TRC', padLength: 5 },
  };
  for (const [key, cfg] of Object.entries(SEQUENCE_CONFIGS)) {
    await prisma.documentSequence.upsert({
      where: { key },
      update: {},
      create: { key, prefix: cfg.prefix, yearScope: true, currentValue: 0, padLength: cfg.padLength },
    });
  }

  console.log('Done.');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
