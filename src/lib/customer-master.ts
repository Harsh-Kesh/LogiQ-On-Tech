import { prisma } from './prisma';

// FR-MD-004: Customer Master Data — customer-specific selling terms per item.
// Key fields (per user spec): Customer Name, Item Code, Item Description,
// Selling Price, Currency, MOQ, Payment Terms, Incoterms.

export interface CustomerMasterRecord {
  id: string;
  customerName: string;
  itemCode: string;
  // The customer's own reference code for this item, when it differs from LogiQ's SKU —
  // captured so future automation (EDI, customer PO matching) can map their code to ours.
  customerItemCode?: string;
  itemDescription: string;
  sellingPrice: number;
  currency: string;
  moq: number;
  paymentTerms: string;
  incoterms: string;
  // Expected fulfillment lead time to this customer, in days — distinct from a vendor's
  // supply lead time; this is how long the customer is told to expect delivery to take.
  leadTimeDays: number;
  createdAt: string;
  updatedAt: string;
}

function toRecord(row: any): CustomerMasterRecord {
  return {
    id: row.id,
    customerName: row.customerName,
    itemCode: row.itemCode,
    customerItemCode: row.customerItemCode ?? undefined,
    itemDescription: row.itemDescription,
    sellingPrice: Number(row.sellingPrice),
    currency: row.currency,
    moq: row.moq,
    paymentTerms: row.paymentTerms,
    incoterms: row.incoterms,
    leadTimeDays: row.leadTimeDays,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadCustomerMasterData(): Promise<CustomerMasterRecord[]> {
  const rows = await prisma.customerPricing.findMany({ orderBy: { createdAt: 'asc' } });
  return rows.map(toRecord);
}

export async function createCustomerMasterRecord(
  input: Omit<CustomerMasterRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CustomerMasterRecord> {
  const row = await prisma.customerPricing.create({
    data: {
      customerName: input.customerName,
      itemCode: input.itemCode,
      customerItemCode: input.customerItemCode || null,
      itemDescription: input.itemDescription,
      sellingPrice: input.sellingPrice,
      currency: input.currency,
      moq: input.moq,
      paymentTerms: input.paymentTerms,
      incoterms: input.incoterms,
      leadTimeDays: input.leadTimeDays,
    },
  });
  return toRecord(row);
}

export async function updateCustomerMasterRecord(
  id: string,
  patch: Partial<CustomerMasterRecord>
): Promise<CustomerMasterRecord | null> {
  const { id: _ignoredId, createdAt, updatedAt, ...rest } = patch as any;
  try {
    const row = await prisma.customerPricing.update({ where: { id }, data: rest });
    return toRecord(row);
  } catch {
    return null;
  }
}

export async function deleteCustomerMasterRecord(id: string): Promise<boolean> {
  try {
    await prisma.customerPricing.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

interface CreateBatchLineInput {
  itemCode: string;
  customerItemCode?: string;
  itemDescription: string;
  sellingPrice: number;
  moq: number;
  incoterms: string;
}

interface CreateBatchInput {
  customerName: string;
  currency: string;
  paymentTerms: string;
  leadTimeDays: number;
  lines: CreateBatchLineInput[];
}

/**
 * Create one or more price-agreement lines for a customer in one call.
 * Customer identity is matched case/whitespace-insensitively against what's already
 * on file. If this customer already exists, their stored name/currency/payment terms
 * win — this is what actually prevents the same customer forking into a second,
 * mismatched identity from a retyped name, rather than just hoping the UI catches it.
 * Rejects the whole batch if any line duplicates an item this customer already has a
 * price agreement for — two rows for the same customer+item is an ambiguous price,
 * not a valid state; editing the existing row is the correct way to change it.
 */
export async function createCustomerMasterBatch(
  input: CreateBatchInput
): Promise<{ records: CustomerMasterRecord[]; matchedExistingCustomer: boolean }> {
  const submittedName = input.customerName.trim();
  const existingMatch = await prisma.customerPricing.findFirst({
    where: { customerName: { equals: submittedName, mode: 'insensitive' } },
  });

  const customerName = existingMatch ? existingMatch.customerName : submittedName;
  const currency = existingMatch ? existingMatch.currency : input.currency.trim().toUpperCase();
  const paymentTerms = existingMatch ? existingMatch.paymentTerms : input.paymentTerms.trim();
  const leadTimeDays = existingMatch ? existingMatch.leadTimeDays : input.leadTimeDays;

  const existingForCustomer = await prisma.customerPricing.findMany({
    where: { customerName: { equals: customerName, mode: 'insensitive' } },
    select: { itemCode: true },
  });
  const existingItemCodes = new Set(existingForCustomer.map((r) => r.itemCode));
  const requestedCodes = [...new Set(input.lines.map((l) => l.itemCode))];
  const duplicateCodes = requestedCodes.filter((code) => existingItemCodes.has(code));
  if (duplicateCodes.length > 0) {
    throw new Error(
      `${customerName} already has a price agreement for ${duplicateCodes.join(', ')}. Edit the existing record instead of adding it again.`
    );
  }

  const records = await Promise.all(
    input.lines.map((line) =>
      createCustomerMasterRecord({
        customerName,
        itemCode: line.itemCode,
        customerItemCode: line.customerItemCode,
        itemDescription: line.itemDescription,
        sellingPrice: line.sellingPrice,
        currency,
        moq: line.moq,
        paymentTerms,
        incoterms: line.incoterms,
        leadTimeDays,
      })
    )
  );

  return { records, matchedExistingCustomer: Boolean(existingMatch) };
}
