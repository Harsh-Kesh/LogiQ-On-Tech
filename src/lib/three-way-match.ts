// Phase 5 — Three-way match engine.
// Compares: StorefrontOrder PO lines ↔ SupplierInvoice total (±2% tolerance).
// On MATCHED: stops there — owner reviews and triggers bill creation as its own
// step (createSupplierBill, below), then payment as its own step (see
// /api/payments/supplier) — each one a distinct, visible stage in Shop Orders
// rather than one action silently racing through all three.
// On MATCH_EXCEPTION: flags for admin review.

import { prisma } from './prisma';
import { createMyobBill } from './myob';
import { createWarrantyRecords } from './warranty';
import { computeSupplierPoTotal } from './po-total';

const TOLERANCE_PCT = 0.02; // ±2%

export interface ThreeWayMatchResult {
  matched: boolean;
  variance: number;
  variancePct: number;
  notes: string;
}

export async function runThreeWayMatch(
  storefrontOrderId: string,
  supplierInvoiceId: string
): Promise<ThreeWayMatchResult> {
  const [sfOrder, suppInv] = await Promise.all([
    prisma.storefrontOrder.findUniqueOrThrow({
      where: { id: storefrontOrderId },
      include: { items: true },
    }),
    prisma.supplierInvoice.findUniqueOrThrow({
      where: { id: supplierInvoiceId },
    }),
  ]);

  // The PO total is what WE owe the supplier (cost price) — never sfOrder.totalAmount,
  // which is what the CUSTOMER paid us (selling price). Those are different numbers by
  // design (our margin sits between them), so matching against the wrong one would
  // flag every order as a variance exception in anything but a demo.
  const po = await computeSupplierPoTotal(
    sfOrder.items.map((i) => ({ itemCode: i.itemCode, quantity: i.quantity, taxPercent: i.taxPercent }))
  );
  const poTotal = po.total;
  const invTotal = Number(suppInv.invoiceAmount);
  const variance = invTotal - poTotal;
  const variancePct = poTotal > 0 ? Math.abs(variance) / poTotal : 1;
  const matched = variancePct <= TOLERANCE_PCT;

  const notes = matched
    ? `Auto-matched: PO total AUD ${poTotal.toFixed(2)}, Invoice total AUD ${invTotal.toFixed(2)}, variance ${(variancePct * 100).toFixed(2)}%`
    : `EXCEPTION: PO total AUD ${poTotal.toFixed(2)}, Invoice total AUD ${invTotal.toFixed(2)}, variance ${(variancePct * 100).toFixed(2)}% exceeds ±2% threshold`;

  const matchedAt = new Date();

  if (matched) {
    // Update StorefrontOrder → MATCHED
    await prisma.storefrontOrder.update({
      where: { id: storefrontOrderId },
      data: {
        status: 'MATCHED',
        threeWayMatchResult: 'MATCHED',
        threeWayMatchNotes: notes,
        matchedAt,
      },
    });

    // Update SupplierInvoice → APPROVED
    await prisma.supplierInvoice.update({
      where: { id: supplierInvoiceId },
      data: {
        status: 'APPROVED',
        threeWayMatchResult: 'MATCHED',
        threeWayMatchNotes: notes,
        matchedAt,
        varianceVsPo: variance,
      },
    });

    // Always create warranty records when matched (no MYOB dependency)
    await createWarrantyRecords(storefrontOrderId, supplierInvoiceId).catch((err) =>
      console.error('Warranty record creation failed:', err.message)
    );
    // Stops here — MATCHED. Bill creation and payment are separate, owner-triggered
    // steps (createSupplierBill, then /api/payments/supplier) so each shows up as
    // its own stage in the Shop Orders pipeline instead of happening invisibly.
  } else {
    // Flag for admin review
    await prisma.storefrontOrder.update({
      where: { id: storefrontOrderId },
      data: {
        status: 'MATCH_EXCEPTION',
        threeWayMatchResult: 'EXCEPTION',
        threeWayMatchNotes: notes,
        matchedAt,
      },
    });

    await prisma.supplierInvoice.update({
      where: { id: supplierInvoiceId },
      data: {
        status: 'DISPUTED',
        threeWayMatchResult: 'EXCEPTION',
        threeWayMatchNotes: notes,
        matchedAt,
        varianceVsPo: variance,
      },
    });
  }

  return { matched, variance, variancePct, notes };
}

export interface SupplierBillResult {
  billNumber: string;
}

// Owner-triggered step after a MATCHED order: books the supplier's invoice as a
// payable Bill in MYOB. Deliberately separate from both the match and the payment
// (see /api/payments/supplier) so "Bill Created" is its own visible pipeline stage.
export async function createSupplierBill(
  storefrontOrderId: string,
  supplierInvoiceId: string
): Promise<SupplierBillResult> {
  const [sfOrder, suppInv] = await Promise.all([
    prisma.storefrontOrder.findUniqueOrThrow({
      where: { id: storefrontOrderId },
      include: { items: true },
    }),
    prisma.supplierInvoice.findUniqueOrThrow({ where: { id: supplierInvoiceId } }),
  ]);

  if (sfOrder.status !== 'MATCHED') {
    throw new Error(`Order must be MATCHED to create a supplier bill (current: ${sfOrder.status})`);
  }

  const firstItem = sfOrder.items[0];
  const itemMaster = firstItem
    ? await prisma.itemMaster.findFirst({ where: { sku: firstItem.itemCode }, include: { vendor: true } })
    : null;
  const vendor = itemMaster?.vendor;

  const allMasters = await prisma.itemMaster.findMany({ where: { sku: { in: sfOrder.items.map((i) => i.itemCode) } } });
  const costBySku = new Map(allMasters.map((m) => [m.sku, Number(m.costPrice)]));

  const billResult = await createMyobBill({
    // Fall back to demo placeholders so the stub always succeeds
    supplierContactId: vendor?.myobContactId || 'DEMO-MYOB-VENDOR',
    purchaseOrderGuid: sfOrder.myobPoGuid || 'DEMO-MYOB-PO',
    invoiceNumber: suppInv.vendorInvoiceNumber,
    invoiceDate: suppInv.invoiceDate.toISOString().split('T')[0],
    deliveryAddress: sfOrder.deliveryAddress,
    lines: sfOrder.items.map((item) => ({
      itemCode: item.itemCode,
      description: item.itemName,
      quantity: item.quantity,
      unitPrice: costBySku.get(item.itemCode) ?? Number(item.unitPrice),
      taxCode: 'GST',
    })),
    memo: `Supplier Bill for ${sfOrder.orderNumber}`,
  });

  await prisma.storefrontOrder.update({
    where: { id: storefrontOrderId },
    data: {
      myobBillGuid: billResult.guid,
      myobBillNumber: billResult.billNumber,
      status: 'BILL_CREATED',
    },
  });

  await prisma.supplierInvoice.update({
    where: { id: supplierInvoiceId },
    data: { myobBillGuid: billResult.guid, myobBillNumber: billResult.billNumber },
  });

  return { billNumber: billResult.billNumber };
}
