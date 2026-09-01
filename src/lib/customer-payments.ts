import { prisma } from './prisma';
import { nextDocumentNumber } from './document-sequences';
import { loadCustomerInvoices, updateCustomerInvoice } from './customer-invoices';
import { loadSalesOrders, updateSalesOrder } from './sales-orders';
import { canTransition } from './lifecycle';

export type CustomerPaymentStatus = 'PENDING' | 'CONFIRMED' | 'REVERSED';

export interface CustomerPayment {
  id: string;
  paymentNumber: string;
  customerInvoiceId: string;
  invoiceNumber: string;
  customerName: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  bankReference: string;
  currency: string;
  notes?: string;
  receiptFileName?: string;
  receiptAttachment?: {
    fileName: string;
    fileData?: string;
    fileType?: string;
    fileSize?: string;
    uploadedAt?: string;
  };
  status: CustomerPaymentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function toPayment(row: any): CustomerPayment {
  return {
    id: row.id,
    paymentNumber: row.paymentNumber,
    customerInvoiceId: row.customerInvoiceId || '',
    invoiceNumber: row.invoiceNumber || '',
    customerName: row.customerName || '',
    paymentDate: row.paymentDate.toISOString(),
    amount: Number(row.amount),
    paymentMethod: row.paymentMethod,
    bankReference: row.bankReference || '',
    currency: row.currency,
    notes: row.notes ?? undefined,
    receiptFileName: row.receiptFileName ?? undefined,
    receiptAttachment: row.receiptFileName
      ? {
          fileName: row.receiptFileName,
          fileData: row.receiptFileData ?? undefined,
          fileType: row.receiptFileType ?? undefined,
          fileSize: row.receiptFileSize !== null ? String(row.receiptFileSize) : undefined,
          uploadedAt: row.createdAt.toISOString(),
        }
      : undefined,
    status: row.status as CustomerPaymentStatus,
    createdBy: row.createdBy ?? '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadCustomerPayments(): Promise<CustomerPayment[]> {
  const rows = await prisma.customerPayment.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toPayment);
}

async function cascadeSoPaymentStatus(salesOrderNumber: string, invoiceStatus: string) {
  const allSOs = await loadSalesOrders();
  const so = allSOs.find((s) => s.salesOrderNumber === salesOrderNumber);
  if (!so) return;

  if (invoiceStatus === 'PAID') {
    if (canTransition('SALES_ORDER', so.status, 'PAID')) {
      await updateSalesOrder(so.id, { status: 'PAID' as any });
    }
  } else if (invoiceStatus === 'PARTIALLY_PAID') {
    if (canTransition('SALES_ORDER', so.status, 'PARTIALLY_PAID')) {
      await updateSalesOrder(so.id, { status: 'PARTIALLY_PAID' as any });
    }
  }
}

export async function recordCustomerPayment(input: {
  customerInvoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  bankReference: string;
  currency?: string;
  notes?: string;
  receiptFileName?: string;
  receiptAttachment?: {
    fileName: string;
    fileData?: string;
    fileType?: string;
    fileSize?: string;
    uploadedAt?: string;
  };
  createdBy: string;
}): Promise<{ payment: CustomerPayment; invoice: any } | null> {
  if (input.amount <= 0) return null;

  const invoices = await loadCustomerInvoices();
  const inv = invoices.find((i) => i.id === input.customerInvoiceId);
  if (!inv) return null;

  const payableStatuses = ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'];
  if (!payableStatuses.includes(inv.status)) return null;

  const outstanding = inv.totalValue - (inv.amountPaid || 0);
  if (input.amount > outstanding) return null;

  const paymentNumber = await nextDocumentNumber('CP');
  const receiptFileName = input.receiptFileName || input.receiptAttachment?.fileName;

  const row = await prisma.customerPayment.create({
    data: {
      paymentNumber,
      customerInvoiceId: input.customerInvoiceId,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      paymentDate: new Date(input.paymentDate),
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      bankReference: input.bankReference,
      currency: input.currency || inv.currency,
      notes: input.notes,
      receiptFileName,
      receiptFileData: input.receiptAttachment?.fileData,
      receiptFileType: input.receiptAttachment?.fileType,
      receiptFileSize: input.receiptAttachment?.fileSize ? Number(input.receiptAttachment.fileSize) : undefined,
      status: 'CONFIRMED',
      createdBy: input.createdBy,
      allocations: {
        create: [{ customerInvoiceId: input.customerInvoiceId, amountAllocated: input.amount }],
      },
    },
  });
  const payment = toPayment(row);

  const newAmountPaid = (inv.amountPaid || 0) + input.amount;
  const invPatch: any = { amountPaid: newAmountPaid };
  if (newAmountPaid >= inv.totalValue) {
    invPatch.status = 'PAID';
    invPatch.paidAt = new Date().toISOString();
  } else if (newAmountPaid > 0) {
    invPatch.status = 'PARTIALLY_PAID';
  }
  const updatedInv = await updateCustomerInvoice(inv.id, invPatch);

  await cascadeSoPaymentStatus(inv.salesOrderNumber, updatedInv?.status || inv.status);

  return { payment, invoice: updatedInv };
}

export async function reverseCustomerPayment(paymentId: string, reason: string): Promise<{ payment: CustomerPayment; invoice: any } | null> {
  const row = await prisma.customerPayment.findUnique({ where: { id: paymentId } });
  if (!row || row.status === 'REVERSED') return null;

  const updatedRow = await prisma.customerPayment.update({
    where: { id: paymentId },
    data: {
      status: 'REVERSED',
      notes: `${row.notes || ''} [REVERSED: ${reason}]`.trim(),
    },
  });
  const payment = toPayment(updatedRow);

  const invoices = await loadCustomerInvoices();
  const inv = invoices.find((i) => i.id === payment.customerInvoiceId);
  if (inv) {
    const newAmountPaid = Math.max(0, (inv.amountPaid || 0) - payment.amount);
    const invPatch: any = { amountPaid: newAmountPaid };
    if (newAmountPaid <= 0) {
      invPatch.status = 'SENT';
      invPatch.paidAt = null;
    } else {
      invPatch.status = 'PARTIALLY_PAID';
    }
    const updatedInv = await updateCustomerInvoice(inv.id, invPatch);

    await reverseCascadeSoPaymentStatus(inv.salesOrderNumber, updatedInv?.status || invPatch.status);

    return { payment, invoice: updatedInv };
  }

  return { payment, invoice: null };
}

async function reverseCascadeSoPaymentStatus(salesOrderNumber: string, newInvoiceStatus: string) {
  const allSOs = await loadSalesOrders();
  const so = allSOs.find((s) => s.salesOrderNumber === salesOrderNumber);
  if (!so) return;

  let targetSoStatus: string | null = null;
  if (newInvoiceStatus === 'SENT' || newInvoiceStatus === 'VIEWED') {
    targetSoStatus = 'INVOICED';
  } else if (newInvoiceStatus === 'PARTIALLY_PAID') {
    targetSoStatus = 'PARTIALLY_PAID';
  }

  // Reversal now goes through the same lifecycle guard as the forward cascade —
  // previously this set the SO status unconditionally, which could revert an order
  // to PARTIALLY_PAID/INVOICED from a status with no legal path back (e.g. COMPLETED).
  if (targetSoStatus && so.status !== targetSoStatus && canTransition('SALES_ORDER', so.status, targetSoStatus)) {
    await updateSalesOrder(so.id, { status: targetSoStatus as any });
  }
}
