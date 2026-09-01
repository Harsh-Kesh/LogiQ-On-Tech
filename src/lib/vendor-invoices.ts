import { prisma } from './prisma';

// Owner-side #11, #12, #13, #14 — Vendor Invoice registration, view, payment, status.
// FR-SI-001..005, FR-SP-001..003.

export type VendorInvoiceStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ON_HOLD'
  | 'DISPUTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID';

export interface VendorInvoicePayment {
  id: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: string; // e.g. EFT, Cheque, BPAY
  bankReferenceNumber: string;
  comments?: string;
  receiptAttachment?: { fileName: string; fileUrl?: string };
  createdBy: string;
}

export interface VendorInvoice {
  id: string;
  vendorInvoiceNumber: string; // supplier's number
  linkedPoNumber: string;
  vendorName: string;
  vendorId?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  invoiceAmount: number;
  varianceVsPo?: number;
  attachment?: { fileName: string; fileUrl?: string };
  status: VendorInvoiceStatus;
  payments: VendorInvoicePayment[];
  amountPaid: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const VI_INCLUDE = { paymentAllocations: { include: { supplierPayment: true } } } as const;
type VendorInvoiceRow = Awaited<ReturnType<typeof prisma.supplierInvoice.findFirstOrThrow<{ include: typeof VI_INCLUDE }>>>;

function toVendorInvoice(row: VendorInvoiceRow): VendorInvoice {
  const payments: VendorInvoicePayment[] = row.paymentAllocations.map((a) => ({
    id: a.supplierPayment.id,
    paymentDate: a.supplierPayment.paymentDate.toISOString(),
    amountPaid: Number(a.amountAllocated),
    paymentMethod: a.supplierPayment.paymentMethod,
    bankReferenceNumber: a.supplierPayment.bankReference || '',
    comments: a.supplierPayment.notes ?? undefined,
    receiptAttachment: a.supplierPayment.evidenceUrl ? { fileName: a.supplierPayment.evidenceUrl.split('/').pop() || 'receipt', fileUrl: a.supplierPayment.evidenceUrl } : undefined,
    createdBy: a.supplierPayment.createdBy || '',
  }));

  return {
    id: row.id,
    vendorInvoiceNumber: row.vendorInvoiceNumber,
    linkedPoNumber: row.linkedPoNumber,
    vendorName: row.vendorName,
    vendorId: row.vendorId ?? undefined,
    invoiceDate: row.invoiceDate.toISOString(),
    dueDate: row.dueDate.toISOString(),
    currency: row.currency,
    invoiceAmount: Number(row.invoiceAmount),
    varianceVsPo: row.varianceVsPo !== null ? Number(row.varianceVsPo) : undefined,
    attachment: row.attachmentFileName ? { fileName: row.attachmentFileName, fileUrl: row.attachmentUrl ?? undefined } : undefined,
    status: row.status as VendorInvoiceStatus,
    payments,
    amountPaid: Number(row.amountPaid),
    createdBy: row.createdBy ?? '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadVendorInvoices(): Promise<VendorInvoice[]> {
  const rows = await prisma.supplierInvoice.findMany({ include: VI_INCLUDE, orderBy: { createdAt: 'desc' } });
  return rows.map(toVendorInvoice);
}

export async function createVendorInvoice(input: Omit<VendorInvoice, 'id' | 'createdAt' | 'updatedAt' | 'payments' | 'amountPaid' | 'status'> & { status?: VendorInvoiceStatus }): Promise<VendorInvoice> {
  const row = await prisma.supplierInvoice.create({
    data: {
      vendorInvoiceNumber: input.vendorInvoiceNumber,
      linkedPoNumber: input.linkedPoNumber,
      vendorName: input.vendorName,
      vendorId: input.vendorId,
      invoiceDate: new Date(input.invoiceDate),
      dueDate: new Date(input.dueDate),
      currency: input.currency,
      invoiceAmount: input.invoiceAmount,
      varianceVsPo: input.varianceVsPo,
      attachmentFileName: input.attachment?.fileName,
      attachmentUrl: input.attachment?.fileUrl,
      status: input.status || 'SUBMITTED',
      amountPaid: 0,
      createdBy: input.createdBy,
    },
    include: VI_INCLUDE,
  });
  return toVendorInvoice(row);
}

export async function updateVendorInvoice(id: string, patch: Partial<VendorInvoice>): Promise<VendorInvoice | null> {
  const data: any = {};
  (['vendorInvoiceNumber', 'linkedPoNumber', 'vendorName', 'vendorId', 'currency', 'invoiceAmount', 'varianceVsPo', 'status', 'amountPaid', 'createdBy'] as const).forEach((k) => {
    if (patch[k] !== undefined) data[k] = patch[k];
  });
  if (patch.invoiceDate !== undefined) data.invoiceDate = new Date(patch.invoiceDate);
  if (patch.dueDate !== undefined) data.dueDate = new Date(patch.dueDate);
  if (patch.attachment !== undefined) {
    data.attachmentFileName = patch.attachment?.fileName ?? null;
    data.attachmentUrl = patch.attachment?.fileUrl ?? null;
  }

  try {
    await prisma.supplierInvoice.update({ where: { id }, data });
  } catch {
    return null;
  }
  const row = await prisma.supplierInvoice.findUnique({ where: { id }, include: VI_INCLUDE });
  return row ? toVendorInvoice(row) : null;
}

// Owner-side #13 Vendor Payment Processing + #14 Payment Status.
export async function recordVendorPayment(invoiceId: string, payment: Omit<VendorInvoicePayment, 'id'>): Promise<VendorInvoice | null> {
  if (payment.amountPaid <= 0) return null;
  const row = await prisma.supplierInvoice.findUnique({ where: { id: invoiceId }, include: VI_INCLUDE });
  if (!row) return null;

  const payableStatuses: VendorInvoiceStatus[] = ['APPROVED', 'PARTIALLY_PAID', 'OVERDUE'];
  if (!payableStatuses.includes(row.status as VendorInvoiceStatus)) return null;
  const outstanding = Number(row.invoiceAmount) - Number(row.amountPaid);
  if (payment.amountPaid > outstanding) return null;

  await prisma.supplierPayment.create({
    data: {
      paymentNumber: `VP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      paymentDate: new Date(payment.paymentDate),
      amount: payment.amountPaid,
      currency: row.currency,
      paymentMethod: payment.paymentMethod,
      bankReference: payment.bankReferenceNumber,
      evidenceUrl: payment.receiptAttachment?.fileUrl,
      notes: payment.comments,
      status: 'POSTED',
      createdBy: payment.createdBy,
      allocations: {
        create: [{ supplierInvoiceId: invoiceId, amountAllocated: payment.amountPaid }],
      },
    },
  });

  // Recomputed by summing every allocation against this invoice — self-healing against
  // drift rather than a running increment, matching the original behavior exactly.
  const allAllocations = await prisma.supplierPaymentAllocation.findMany({ where: { supplierInvoiceId: invoiceId } });
  const newAmountPaid = allAllocations.reduce((s, a) => s + Number(a.amountAllocated), 0);
  const newStatus: VendorInvoiceStatus = newAmountPaid >= Number(row.invoiceAmount) ? 'PAID' : newAmountPaid > 0 ? 'PARTIALLY_PAID' : (row.status as VendorInvoiceStatus);

  const updatedRow = await prisma.supplierInvoice.update({
    where: { id: invoiceId },
    data: { amountPaid: newAmountPaid, status: newStatus },
    include: VI_INCLUDE,
  });
  return toVendorInvoice(updatedRow);
}
