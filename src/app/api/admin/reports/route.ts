import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Pull all relevant data concurrently
  const [allOrders, allInvoices, warrantyStatusCounts, pendingWarranties] = await Promise.all([
    prisma.storefrontOrder.findMany({
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        paidAt: true,
        fulfilledAt: true,
        supplierPaidAt: true,
        matchedAt: true,
        poEmailSentAt: true,
        poEmailSentTo: true,
        threeWayMatchResult: true,
        threeWayMatchNotes: true,
        myobPoNumber: true,
        myobSoNumber: true,
        myobBillNumber: true,
        monoovaTxnId: true,
        monoovaStatus: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplierInvoice.findMany({
      select: {
        id: true,
        vendorInvoiceNumber: true,
        vendorName: true,
        linkedPoNumber: true,
        invoiceAmount: true,
        status: true,
        invoiceDate: true,
        dueDate: true,
        threeWayMatchResult: true,
        matchedAt: true,
        monoovaTxnId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.warrantyRecord.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.warrantyRecord.findMany({
      where: { status: 'PENDING_DATA' },
      select: { id: true, warrantyNumber: true, partNumber: true, customerName: true, createdAt: true },
      take: 20,
    }),
  ]);

  // ── Order-to-Fulfilment metrics ───────────────────────────────────────────
  const statusCounts: Record<string, { count: number; value: number }> = {};
  for (const o of allOrders) {
    if (!statusCounts[o.status]) statusCounts[o.status] = { count: 0, value: 0 };
    statusCounts[o.status].count++;
    statusCounts[o.status].value += Number(o.totalAmount);
  }

  const thisMonthOrders = allOrders.filter((o) => o.createdAt >= startOfMonth);
  const fulfilledOrders = allOrders.filter((o) => o.status === 'FULFILLED' && o.fulfilledAt && o.paidAt);
  const avgDaysToFulfil =
    fulfilledOrders.length > 0
      ? fulfilledOrders.reduce((sum, o) => {
          const ms = o.fulfilledAt!.getTime() - o.paidAt!.getTime();
          return sum + ms / 86_400_000;
        }, 0) / fulfilledOrders.length
      : null;

  const customerMap: Record<string, { count: number; value: number }> = {};
  for (const o of allOrders) {
    if (!customerMap[o.customerName]) customerMap[o.customerName] = { count: 0, value: 0 };
    customerMap[o.customerName].count++;
    customerMap[o.customerName].value += Number(o.totalAmount);
  }
  const topCustomers = Object.entries(customerMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // ── Procurement metrics ───────────────────────────────────────────────────
  const procOrders = allOrders.filter((o) =>
    ['PO_SENT', 'INVOICE_RECEIVED', 'MATCH_PENDING', 'MATCHED', 'MATCH_EXCEPTION', 'BILL_CREATED', 'SUPPLIER_PAID', 'FULFILLED'].includes(o.status)
  );
  const openPOs = allOrders.filter((o) => o.status === 'PO_SENT');
  const openPOValue = openPOs.reduce((s, o) => s + Number(o.totalAmount), 0);
  const avgAgeDays =
    openPOs.length > 0
      ? openPOs.reduce((s, o) => {
          const ref = o.poEmailSentAt || o.paidAt || o.createdAt;
          return s + (now.getTime() - ref.getTime()) / 86_400_000;
        }, 0) / openPOs.length
      : 0;

  const vendorMap: Record<string, { count: number; value: number }> = {};
  for (const o of procOrders) {
    const vendor = o.poEmailSentTo || 'Unknown Vendor';
    if (!vendorMap[vendor]) vendorMap[vendor] = { count: 0, value: 0 };
    vendorMap[vendor].count++;
    vendorMap[vendor].value += Number(o.totalAmount);
  }
  const byVendor = Object.entries(vendorMap)
    .map(([vendor, v]) => ({ vendor, ...v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ── Three-Way Match metrics ───────────────────────────────────────────────
  const matchedOrders = allOrders.filter((o) =>
    ['MATCHED', 'BILL_CREATED', 'SUPPLIER_PAID', 'FULFILLED'].includes(o.status) &&
    o.threeWayMatchResult === 'MATCHED'
  );
  const exceptionOrders = allOrders.filter((o) =>
    o.status === 'MATCH_EXCEPTION' || o.threeWayMatchResult === 'EXCEPTION'
  );
  const matchedValue = matchedOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const exceptionValue = exceptionOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const totalMatched = matchedOrders.length + exceptionOrders.length;
  const exceptionRate = totalMatched > 0 ? exceptionOrders.length / totalMatched : 0;

  // ── Accounts Payable metrics ──────────────────────────────────────────────
  const invStatusMap: Record<string, { count: number; value: number }> = {};
  for (const i of allInvoices) {
    if (!invStatusMap[i.status]) invStatusMap[i.status] = { count: 0, value: 0 };
    invStatusMap[i.status].count++;
    invStatusMap[i.status].value += Number(i.invoiceAmount);
  }
  const approvedInvoices = allInvoices.filter((i) => i.status === 'APPROVED');
  const totalOwed = approvedInvoices.reduce((s, i) => s + Number(i.invoiceAmount), 0);

  // ── Exception management ──────────────────────────────────────────────────
  const stuckAtPaid = allOrders.filter((o) => o.status === 'PAID' && o.updatedAt < cutoff24h);
  const matchExceptions = exceptionOrders;

  return NextResponse.json({
    orderFulfilment: {
      byStatus: Object.entries(statusCounts).map(([status, v]) => ({ status, ...v })),
      thisMonth: {
        count: thisMonthOrders.length,
        value: thisMonthOrders.reduce((s, o) => s + Number(o.totalAmount), 0),
      },
      avgDaysToFulfil,
      fulfilledCount: fulfilledOrders.length,
      totalCount: allOrders.length,
      totalValue: allOrders.reduce((s, o) => s + Number(o.totalAmount), 0),
      topCustomers,
      recentOrders: allOrders.slice(0, 25).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt,
        fulfilledAt: o.fulfilledAt,
        paidAt: o.paidAt,
      })),
    },
    procurement: {
      openCount: openPOs.length,
      openValue: openPOValue,
      avgAgeDays: Math.round(avgAgeDays * 10) / 10,
      overdueCount: openPOs.filter((o) => {
        const ref = o.poEmailSentAt || o.paidAt || o.createdAt;
        return (now.getTime() - ref.getTime()) / 86_400_000 > 14;
      }).length,
      byVendor,
      orders: procOrders.slice(0, 30).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        myobPoNumber: o.myobPoNumber,
        poEmailSentTo: o.poEmailSentTo,
        poEmailSentAt: o.poEmailSentAt,
        ageDays: o.poEmailSentAt
          ? Math.ceil((now.getTime() - o.poEmailSentAt.getTime()) / 86_400_000)
          : null,
      })),
    },
    matching: {
      matchedCount: matchedOrders.length,
      matchedValue,
      exceptionCount: exceptionOrders.length,
      exceptionValue,
      exceptionRate: Math.round(exceptionRate * 1000) / 10,
      exceptions: matchExceptions.slice(0, 20).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        totalAmount: Number(o.totalAmount),
        status: o.status,
        threeWayMatchNotes: o.threeWayMatchNotes,
        matchedAt: o.matchedAt,
      })),
    },
    payables: {
      byStatus: Object.entries(invStatusMap).map(([status, v]) => ({ status, ...v })),
      totalOwed,
      totalInvoiceCount: allInvoices.length,
      invoices: allInvoices.slice(0, 30).map((i) => ({
        id: i.id,
        vendorInvoiceNumber: i.vendorInvoiceNumber,
        vendorName: i.vendorName,
        linkedPoNumber: i.linkedPoNumber,
        invoiceAmount: Number(i.invoiceAmount),
        status: i.status,
        invoiceDate: i.invoiceDate,
        dueDate: i.dueDate,
        threeWayMatchResult: i.threeWayMatchResult,
        monoovaTxnId: i.monoovaTxnId,
      })),
    },
    exceptions: {
      matchExceptions: matchExceptions.slice(0, 20).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        totalAmount: Number(o.totalAmount),
        status: o.status,
        threeWayMatchNotes: o.threeWayMatchNotes,
      })),
      stuckAtPaid: stuckAtPaid.slice(0, 20).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        totalAmount: Number(o.totalAmount),
        updatedAt: o.updatedAt,
        ageDays: Math.ceil((now.getTime() - o.updatedAt.getTime()) / 86_400_000),
      })),
      pendingWarranties: pendingWarranties.map((w) => ({
        id: w.id,
        warrantyNumber: w.warrantyNumber,
        partNumber: w.partNumber,
        customerName: w.customerName,
        createdAt: w.createdAt,
      })),
      warrantyByStatus: warrantyStatusCounts.map((r) => ({ status: r.status, count: r._count.id })),
      total: matchExceptions.length + stuckAtPaid.length + pendingWarranties.length,
    },
  });
}
