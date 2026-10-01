// Phase 6 — Warranty lifecycle management.
// createWarrantyRecords: called after 3-way match passes for a StorefrontOrder.
// runWarrantyCheck: called daily by /api/cron/warranty-check.

import { prisma } from './prisma';
import { nextDocumentNumber } from './document-sequences';
import { sendTransactionalEmail } from './email';

const ALERT_BUCKETS = [180, 90, 60, 30, 14, 7, 0] as const;
type Bucket = typeof ALERT_BUCKETS[number];

const BUCKET_FLAG: Record<Bucket, string> = {
  180: 'notifiedAt180Days',
  90: 'notifiedAt90Days',
  60: 'notifiedAt60Days',
  30: 'notifiedAt30Days',
  14: 'notifiedAt14Days',
  7: 'notifiedAt7Days',
  0: 'notifiedAtExpiry',
};

/** Create one WarrantyRecord per line item for a confirmed StorefrontOrder. */
export async function createWarrantyRecords(
  storefrontOrderId: string,
  supplierInvoiceId: string
): Promise<void> {
  const sfOrder = await prisma.storefrontOrder.findUniqueOrThrow({
    where: { id: storefrontOrderId },
    include: { items: true },
  });

  const suppInv = await prisma.supplierInvoice.findUniqueOrThrow({
    where: { id: supplierInvoiceId },
  });

  const deliveryDate = new Date();

  // Look up SalesOrder number for traceability
  const salesOrder = sfOrder.salesOrderId
    ? await prisma.salesOrder.findUnique({
        where: { id: sfOrder.salesOrderId },
        select: { salesOrderNumber: true },
      })
    : null;

  for (const item of sfOrder.items) {
    // itemMasterId may not be set on StorefrontOrderItem — fall back to SKU lookup
    const itemMaster = item.itemMasterId
      ? await prisma.itemMaster.findUnique({ where: { id: item.itemMasterId } })
      : await prisma.itemMaster.findFirst({ where: { sku: item.itemCode } });

    const warrantyMonths = itemMaster?.warrantyPeriodMonths;
    if (!warrantyMonths || warrantyMonths <= 0) continue;

    const warrantyNumber = await nextDocumentNumber('WR');
    const warrantyStart = deliveryDate;
    const warrantyExpiry = new Date(warrantyStart);
    warrantyExpiry.setMonth(warrantyExpiry.getMonth() + warrantyMonths);

    const remainingDays = Math.ceil(
      (warrantyExpiry.getTime() - Date.now()) / 86_400_000
    );

    await prisma.warrantyRecord.create({
      data: {
        warrantyNumber,
        itemMasterId: itemMaster?.id || undefined,
        partNumber: item.itemCode,
        partDescription: item.itemName,
        customerName: sfOrder.customerName,
        salesOrderId: sfOrder.salesOrderId || undefined,
        salesOrderNumber: salesOrder?.salesOrderNumber || undefined,
        supplierInvoiceId: suppInv.id,
        supplierInvoiceNumber: suppInv.vendorInvoiceNumber,
        vendorName: suppInv.vendorName,
        deliveryDate,
        warrantyStartRule: itemMaster?.warrantyStartRule || 'DELIVERY_DATE',
        warrantyStartDate: warrantyStart,
        warrantyPeriodMonths: warrantyMonths,
        warrantyExpiryDate: warrantyExpiry,
        remainingDays,
        status: 'ACTIVE',
        notificationEmails: [sfOrder.customerEmail],
        createdBy: 'system',
      },
    });
  }
}

/** Daily cron: recalculate remainingDays + send escalating alert emails. */
export async function runWarrantyCheck(): Promise<{ checked: number; alerted: number; expired: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const records = await prisma.warrantyRecord.findMany({
    where: { status: { not: 'CLOSED' } },
  });

  let alerted = 0;
  let expired = 0;

  for (const rec of records) {
    if (!rec.warrantyExpiryDate) continue;

    const expiry = new Date(rec.warrantyExpiryDate);
    expiry.setHours(0, 0, 0, 0);
    const remainingDays = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);

    // Determine new status
    let newStatus: string = rec.status;
    if (remainingDays < 0) {
      newStatus = 'EXPIRED';
      expired++;
    } else if (remainingDays <= 30) {
      newStatus = 'EXPIRING_SOON';
    } else if (remainingDays <= 180) {
      newStatus = 'FINAL_SIX_MONTHS';
    } else {
      newStatus = 'ACTIVE';
    }

    // Determine which alert bucket fires today (if any)
    let bucketToSend: Bucket | null = null;
    for (const bucket of ALERT_BUCKETS) {
      const flagField = BUCKET_FLAG[bucket] as keyof typeof rec;
      if (remainingDays <= bucket && !rec[flagField]) {
        bucketToSend = bucket;
        break;
      }
    }

    const updates: Record<string, any> = { remainingDays, status: newStatus };
    if (bucketToSend !== null) {
      updates[BUCKET_FLAG[bucketToSend]] = true;
    }

    await prisma.warrantyRecord.update({
      where: { id: rec.id },
      data: updates,
    });

    if (bucketToSend !== null && rec.notificationEmails.length > 0) {
      const label = bucketToSend === 0 ? 'expires TODAY' : `expires in ${bucketToSend} days`;
      const subject =
        bucketToSend === 0
          ? `⚠️ Warranty Expired: ${rec.warrantyNumber} — ${rec.partNumber}`
          : `Warranty Alert (${bucketToSend} days): ${rec.warrantyNumber} — ${rec.partNumber}`;

      const html = `
        <div style="font-family:sans-serif;max-width:640px;margin:0 auto">
          <h2 style="color:#0f172a">Warranty ${label}</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px;color:#64748b">Warranty #</td><td style="padding:6px"><strong>${rec.warrantyNumber}</strong></td></tr>
            <tr><td style="padding:6px;color:#64748b">Part</td><td style="padding:6px">${rec.partNumber}${rec.partDescription ? ' — ' + rec.partDescription : ''}</td></tr>
            <tr><td style="padding:6px;color:#64748b">Customer</td><td style="padding:6px">${rec.customerName || 'N/A'}</td></tr>
            <tr><td style="padding:6px;color:#64748b">Start Date</td><td style="padding:6px">${rec.warrantyStartDate?.toISOString().split('T')[0] || 'N/A'}</td></tr>
            <tr><td style="padding:6px;color:#64748b">Expiry Date</td><td style="padding:6px"><strong>${rec.warrantyExpiryDate?.toISOString().split('T')[0]}</strong></td></tr>
            <tr><td style="padding:6px;color:#64748b">Remaining Days</td><td style="padding:6px"><strong style="color:${remainingDays <= 14 ? '#dc2626' : remainingDays <= 30 ? '#d97706' : '#16a34a'}">${remainingDays}</strong></td></tr>
          </table>
          <p style="margin-top:16px">Please take appropriate action to renew or arrange servicing for this item before the warranty expires.</p>
          <p style="color:#64748b;font-size:12px">LogiQ-On Tech Warranty Management System</p>
        </div>`;

      for (const email of rec.notificationEmails) {
        await sendTransactionalEmail({ to: email, subject, html }).catch(() => {});
      }

      await prisma.warrantyNotification.create({
        data: {
          warrantyId: rec.id,
          daysBucket: bucketToSend,
          recipients: rec.notificationEmails,
          status: 'SENT',
        },
      });

      alerted++;
    }
  }

  return { checked: records.length, alerted, expired };
}
