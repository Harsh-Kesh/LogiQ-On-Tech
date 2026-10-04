// What we owe the supplier for a StorefrontOrder — always priced at the item's
// supplier COST price, never the customer-facing selling price recorded on the
// order itself. Used everywhere the pipeline needs "the PO/invoice amount":
// the 3-way match, the simulated supplier invoice, and the supplier payment.

import { prisma } from './prisma';

export interface PoTotal {
  subtotal: number;
  taxTotal: number;
  total: number;
}

export async function computeSupplierPoTotal(
  items: { itemCode: string; quantity: number; taxPercent: number | string | { toString(): string } }[]
): Promise<PoTotal> {
  const codes = items.map((i) => i.itemCode);
  const masters = await prisma.itemMaster.findMany({ where: { sku: { in: codes } } });
  const costBySku = new Map(masters.map((m) => [m.sku, Number(m.costPrice)]));

  let subtotal = 0;
  let taxTotal = 0;
  for (const item of items) {
    const cost = costBySku.get(item.itemCode) ?? 0;
    const tax = Number(item.taxPercent) || 0;
    subtotal += item.quantity * cost;
    taxTotal += item.quantity * cost * (tax / 100);
  }

  return { subtotal, taxTotal, total: subtotal + taxTotal };
}
