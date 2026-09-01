import { prisma } from './prisma';
import { nextDocumentNumber } from './document-sequences';

// Owner-side #7, #8 — Sales Invoice creation + send to customer. FR-CI-001..008.

export type CustomerInvoiceStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'SENT'
  | 'VIEWED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID';

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string; // INV-YYYY-#####
  salesOrderNumber: string;
  dispatchNumber?: string;
  customerName: string;
  customerEmail?: string;
  billingAddress?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  lines: Array<{ itemCode: string; itemName: string; quantity: number; unitPrice: number; taxPercent: number; lineTotal: number }>;
  subtotal: number;
  taxTotal: number;
  totalValue: number;
  amountPaid: number;
  status: CustomerInvoiceStatus;
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;
  pdfSnapshot?: string; // stored path or filename
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const CI_INCLUDE = { lines: true } as const;
type CustomerInvoiceRow = Awaited<ReturnType<typeof prisma.customerInvoice.findFirstOrThrow<{ include: typeof CI_INCLUDE }>>>;

function toInvoice(row: CustomerInvoiceRow): CustomerInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    salesOrderNumber: row.salesOrderNumber,
    dispatchNumber: row.dispatchNumber ?? undefined,
    customerName: row.customerName,
    customerEmail: row.customerEmail ?? undefined,
    billingAddress: row.billingAddress ?? undefined,
    issueDate: row.issueDate.toISOString(),
    dueDate: row.dueDate.toISOString(),
    currency: row.currency,
    lines: (row.lines || []).map((l) => ({
      itemCode: l.itemCode,
      itemName: l.itemName,
      quantity: l.quantity,
      unitPrice: Number(l.unitPrice),
      taxPercent: Number(l.taxPercent),
      lineTotal: Number(l.lineTotal),
    })),
    subtotal: Number(row.subtotal),
    taxTotal: Number(row.taxTotal),
    totalValue: Number(row.totalValue),
    amountPaid: Number(row.amountPaid),
    status: row.status as CustomerInvoiceStatus,
    sentAt: row.sentAt?.toISOString(),
    viewedAt: row.viewedAt?.toISOString(),
    paidAt: row.paidAt?.toISOString(),
    pdfSnapshot: row.pdfSnapshotUrl ?? undefined,
    createdBy: row.createdBy ?? '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadCustomerInvoices(): Promise<CustomerInvoice[]> {
  const rows = await prisma.customerInvoice.findMany({ include: CI_INCLUDE, orderBy: { createdAt: 'desc' } });
  return rows.map(toInvoice);
}

// BR-012 atomic number allocation.
export async function createCustomerInvoice(input: Omit<CustomerInvoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'status' | 'amountPaid'> & { status?: CustomerInvoiceStatus }): Promise<CustomerInvoice> {
  const invoiceNumber = await nextDocumentNumber('CI');
  const row = await prisma.customerInvoice.create({
    data: {
      invoiceNumber,
      salesOrderNumber: input.salesOrderNumber,
      dispatchNumber: input.dispatchNumber,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      billingAddress: input.billingAddress,
      issueDate: new Date(input.issueDate),
      dueDate: new Date(input.dueDate),
      currency: input.currency,
      subtotal: input.subtotal,
      taxTotal: input.taxTotal,
      totalValue: input.totalValue,
      amountPaid: 0,
      status: input.status || 'DRAFT',
      createdBy: input.createdBy,
      lines: {
        create: input.lines.map((l) => ({
          itemCode: l.itemCode,
          itemName: l.itemName,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxPercent: l.taxPercent,
          lineTotal: l.lineTotal,
        })),
      },
    },
    include: CI_INCLUDE,
  });
  return toInvoice(row);
}

export async function updateCustomerInvoice(id: string, patch: Partial<CustomerInvoice>): Promise<CustomerInvoice | null> {
  const data: any = {};
  (['salesOrderNumber', 'dispatchNumber', 'customerName', 'customerEmail', 'billingAddress', 'currency', 'subtotal', 'taxTotal', 'totalValue', 'amountPaid', 'status', 'createdBy'] as const).forEach((k) => {
    if (patch[k] !== undefined) data[k] = patch[k];
  });
  if (patch.issueDate !== undefined) data.issueDate = new Date(patch.issueDate);
  if (patch.dueDate !== undefined) data.dueDate = new Date(patch.dueDate);
  if (patch.sentAt !== undefined) data.sentAt = patch.sentAt ? new Date(patch.sentAt) : null;
  if (patch.viewedAt !== undefined) data.viewedAt = patch.viewedAt ? new Date(patch.viewedAt) : null;
  if (patch.paidAt !== undefined) data.paidAt = patch.paidAt ? new Date(patch.paidAt) : null;
  if (patch.pdfSnapshot !== undefined) data.pdfSnapshotUrl = patch.pdfSnapshot;

  try {
    await prisma.customerInvoice.update({ where: { id }, data });
  } catch {
    return null;
  }
  const row = await prisma.customerInvoice.findUnique({ where: { id }, include: CI_INCLUDE });
  return row ? toInvoice(row) : null;
}
