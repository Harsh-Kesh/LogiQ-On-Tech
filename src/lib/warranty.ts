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

    // Alerts go to the platform owner (operations team), not the customer.
    // Configure PLATFORM_OWNER_EMAIL in env vars; falls back to SMTP_USER.
    const ownerEmail = process.env.PLATFORM_OWNER_EMAIL || process.env.SMTP_USER || '';
    const notificationEmails = ownerEmail ? [ownerEmail] : [];

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
        notificationEmails,
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
      const isExpired = bucketToSend === 0 && remainingDays < 0;
      const label = isExpired ? 'has expired' : bucketToSend === 0 ? 'expires TODAY' : `expires in ${bucketToSend} days`;
      const urgencyColor = remainingDays <= 0 ? '#dc2626' : remainingDays <= 14 ? '#dc2626' : remainingDays <= 30 ? '#d97706' : remainingDays <= 90 ? '#f59e0b' : '#16a34a';
      const subject =
        bucketToSend === 0
          ? `⚠️ Warranty ${isExpired ? 'Expired' : 'Expires Today'}: ${rec.warrantyNumber} — ${rec.partNumber} (${rec.customerName || 'N/A'})`
          : `Warranty Alert (${bucketToSend} days remaining): ${rec.warrantyNumber} — ${rec.partNumber}`;

      const html = `
        <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#0f172a">
          <div style="background:${urgencyColor};padding:20px 28px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:18px">Warranty ${label}</h2>
            <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px">Internal alert — LogiQ-On Tech operations</p>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px 28px;border-radius:0 0 8px 8px">
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tr style="background:#f8fafc"><td colspan="2" style="padding:6px 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Warranty Details</td></tr>
              <tr><td style="padding:6px 10px;color:#64748b;width:40%">Warranty #</td><td style="padding:6px 10px;font-weight:700">${rec.warrantyNumber}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:6px 10px;color:#64748b">Part</td><td style="padding:6px 10px">${rec.partNumber}${rec.partDescription ? ' — ' + rec.partDescription : ''}</td></tr>
              <tr><td style="padding:6px 10px;color:#64748b">Customer</td><td style="padding:6px 10px"><strong>${rec.customerName || 'N/A'}</strong></td></tr>
              <tr style="background:#f8fafc"><td style="padding:6px 10px;color:#64748b">Sales Order</td><td style="padding:6px 10px">${rec.salesOrderNumber || 'N/A'}</td></tr>
              <tr><td style="padding:6px 10px;color:#64748b">Vendor</td><td style="padding:6px 10px">${rec.vendorName || 'N/A'}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:6px 10px;color:#64748b">Warranty Start</td><td style="padding:6px 10px">${rec.warrantyStartDate?.toISOString().split('T')[0] || 'N/A'}</td></tr>
              <tr><td style="padding:6px 10px;color:#64748b">Expiry Date</td><td style="padding:6px 10px"><strong>${rec.warrantyExpiryDate?.toISOString().split('T')[0]}</strong></td></tr>
              <tr style="background:#f8fafc"><td style="padding:6px 10px;color:#64748b">Days Remaining</td><td style="padding:6px 10px"><strong style="color:${urgencyColor}">${remainingDays}</strong></td></tr>
            </table>
            <p style="margin:16px 0 4px;font-size:13px;color:#64748b">Log in to the dashboard to review or close this warranty record.</p>
            <p style="margin:0;font-size:12px;color:#94a3b8">LogiQ-On Tech · Warranty Management · Internal notification only</p>
          </div>
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
