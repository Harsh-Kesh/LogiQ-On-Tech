import { prisma } from './prisma';

// FR-MD-004: Vendor Master Data — vendor pricing per item with commercial terms.
// Key fields (per user spec): Vendor Name, Item Code, Item Description,
// Cost of Goods, Currency, MOQ, Lead Time, Payment Terms, Incoterms.

export interface VendorMasterRecord {
  id: string;
  vendorName: string;
  itemCode: string;
  itemDescription: string;
  costOfGoods: number;
  currency: string;
  moq: number;
  leadTimeDays: number;
  paymentTerms: string;
  incoterms: string;
  createdAt: string;
  updatedAt: string;
}

function toRecord(row: any): VendorMasterRecord {
  return {
    id: row.id,
    vendorName: row.vendorName,
    itemCode: row.itemCode,
    itemDescription: row.itemDescription,
    costOfGoods: Number(row.purchasePrice),
    currency: row.currency,
    moq: row.moq,
    leadTimeDays: row.leadTimeDays,
    paymentTerms: row.paymentTerms,
    incoterms: row.incoterms,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadVendorMasterData(): Promise<VendorMasterRecord[]> {
  const rows = await prisma.vendorPricing.findMany({ orderBy: { createdAt: 'asc' } });
  return rows.map(toRecord);
}

export async function createVendorMasterRecord(
  input: Omit<VendorMasterRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<VendorMasterRecord> {
  const row = await prisma.vendorPricing.create({
    data: {
      vendorName: input.vendorName,
      itemCode: input.itemCode,
      itemDescription: input.itemDescription,
      purchasePrice: input.costOfGoods,
      currency: input.currency,
      moq: input.moq,
      leadTimeDays: input.leadTimeDays,
      paymentTerms: input.paymentTerms,
      incoterms: input.incoterms,
    },
  });
  return toRecord(row);
}

export async function updateVendorMasterRecord(
  id: string,
  patch: Partial<VendorMasterRecord>
): Promise<VendorMasterRecord | null> {
  const { id: _ignoredId, createdAt, updatedAt, costOfGoods, ...rest } = patch as any;
  const data: any = { ...rest };
  if (costOfGoods !== undefined) data.purchasePrice = costOfGoods;
  try {
    const row = await prisma.vendorPricing.update({ where: { id }, data });
    return toRecord(row);
  } catch {
    return null;
  }
}

export async function deleteVendorMasterRecord(id: string): Promise<boolean> {
  try {
    await prisma.vendorPricing.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * An item can be sourced from more than one vendor, each at their own cost — this is
 * the single place that fact gets recorded. Used both by the Vendor Master form and by
 * Item Master creation (where the owner allocates one or more vendors to a new item in
 * one step). Matches on vendorName + itemCode: updates the existing sourcing record for
 * that pair if one exists, otherwise creates a new one.
 */
export async function upsertVendorMasterRecord(
  input: Omit<VendorMasterRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<VendorMasterRecord> {
  const existing = await prisma.vendorPricing.findFirst({
    where: { vendorName: input.vendorName, itemCode: input.itemCode },
  });
  if (existing) {
    return (await updateVendorMasterRecord(existing.id, input)) as VendorMasterRecord;
  }
  return createVendorMasterRecord(input);
}
