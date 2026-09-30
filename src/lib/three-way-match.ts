// Phase 5 — Three-way match engine.
// Compares: StorefrontOrder PO lines ↔ SupplierInvoice total (±2% tolerance).
// On MATCHED: creates MYOB Bill + schedules Monoova bank transfer.
// On MATCH_EXCEPTION: flags for admin review.

import { prisma } from './prisma';
import { createMyobBill } from './myob';
import { sendMonoovaOskoPayment } from './monoova';
import { createWarrantyRecords } from './warranty';

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

  const poTotal = Number(sfOrder.totalAmount);
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

    // Create MYOB Bill if vendor has MYOB contact
    try {
      const firstItem = sfOrder.items[0];
      const itemMaster = firstItem
        ? await prisma.itemMaster.findFirst({
            where: { sku: firstItem.itemCode },
            include: { vendor: true },
          })
        : null;
      const vendor = itemMaster?.vendor;

      if (vendor?.myobContactId && sfOrder.myobPoGuid) {
        const billResult = await createMyobBill({
          supplierContactId: vendor.myobContactId,
          purchaseOrderGuid: sfOrder.myobPoGuid,
          invoiceNumber: suppInv.vendorInvoiceNumber,
          invoiceDate: suppInv.invoiceDate.toISOString().split('T')[0],
          deliveryAddress: sfOrder.deliveryAddress,
          lines: sfOrder.items.map((item) => ({
            itemCode: item.itemCode,
            description: item.itemName,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
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
          data: {
            myobBillGuid: billResult.guid,
            myobBillNumber: billResult.billNumber,
          },
        });

        // Create warranty records for items with a warranty period
        await createWarrantyRecords(storefrontOrderId, supplierInvoiceId).catch((err) =>
          console.error('Warranty record creation failed:', err.message)
        );

        // Trigger Monoova OSKO payment if bank details are configured
        if (vendor.bankBsb && vendor.bankAccountNumber && vendor.bankAccountName) {
          const payResult = await sendMonoovaOskoPayment({
            toAccountBsb: vendor.bankBsb,
            toAccountNumber: vendor.bankAccountNumber,
            toAccountName: vendor.bankAccountName,
            amount: invTotal,
            description: `Payment for PO ${sfOrder.myobPoNumber || sfOrder.orderNumber}`,
            reference: sfOrder.myobPoNumber || sfOrder.orderNumber,
          });

          await prisma.storefrontOrder.update({
            where: { id: storefrontOrderId },
            data: {
              monoovaTxnId: payResult.transactionId,
              monoovaStatus: payResult.status,
              supplierPaidAt: new Date(),
              status: 'SUPPLIER_PAID',
            },
          });

          await prisma.supplierInvoice.update({
            where: { id: supplierInvoiceId },
            data: { monoovaTxnId: payResult.transactionId },
          });
        }
      }
    } catch (err: any) {
      console.error('Three-way match: MYOB Bill/Monoova payment failed:', err.message);
      // Match is still recorded — admin can trigger payment manually
    }
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
