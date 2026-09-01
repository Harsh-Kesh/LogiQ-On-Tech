import type { SalesOrderStatus } from './sales-orders';
import type { DispatchStatus } from './dispatch-notes';
import type { CustomerInvoiceStatus } from './customer-invoices';
import type { PurchaseOrderStatus } from './purchase-orders';
import type { VendorInvoiceStatus } from './vendor-invoices';

type TransitionMap<S extends string> = Partial<Record<S, S[]>>;

function allowed<S extends string>(map: TransitionMap<S>, from: S, to: S): boolean {
  return map[from]?.includes(to) ?? false;
}

const SO_TRANSITIONS: TransitionMap<SalesOrderStatus> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['STOCK_CHECK', 'CANCELLED'],
  STOCK_CHECK: ['PARTIALLY_ALLOCATED', 'ALLOCATED', 'CANCELLED'],
  PARTIALLY_ALLOCATED: ['ALLOCATED', 'CANCELLED'],
  ALLOCATED: ['PARTIALLY_DISPATCHED', 'READY_FOR_DISPATCH', 'PARTIALLY_ALLOCATED', 'CANCELLED'],
  PARTIALLY_DISPATCHED: ['READY_FOR_DISPATCH', 'DISPATCHED', 'CANCELLED'],
  READY_FOR_DISPATCH: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: ['INVOICED'],
  INVOICED: ['PARTIALLY_PAID', 'PAID'],
  PARTIALLY_PAID: ['PAID'],
  PAID: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const DN_TRANSITIONS: TransitionMap<DispatchStatus> = {
  PENDING: ['ALLOCATED', 'READY_FOR_DISPATCH', 'ON_HOLD', 'CANCELLED'],
  ALLOCATED: ['PICKING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'ON_HOLD', 'CANCELLED'],
  PICKING: ['PICKED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'ON_HOLD'],
  PICKED: ['PACKING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'ON_HOLD'],
  PACKING: ['PACKED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'ON_HOLD'],
  PACKED: ['READY_FOR_DISPATCH', 'DISPATCHED', 'ON_HOLD'],
  READY_FOR_DISPATCH: ['DISPATCHED', 'ON_HOLD', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'DELIVERED', 'PARTIALLY_DELIVERED', 'DELIVERY_EXCEPTION', 'ON_HOLD'],
  IN_TRANSIT: ['DELIVERED', 'PARTIALLY_DELIVERED', 'DELIVERY_EXCEPTION', 'ON_HOLD'],
  PARTIALLY_DELIVERED: ['DELIVERED', 'DELIVERY_EXCEPTION'],
  DELIVERED: ['DELIVERY_EXCEPTION', 'RETURNED'],
  DELIVERY_EXCEPTION: ['IN_TRANSIT', 'RETURNED', 'ON_HOLD'],
  ON_HOLD: ['PENDING', 'ALLOCATED', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'CANCELLED'],
  RETURNED: [],
  CANCELLED: [],
};

const CI_TRANSITIONS: TransitionMap<CustomerInvoiceStatus> = {
  DRAFT: ['APPROVED', 'SENT', 'VOID'],
  APPROVED: ['SENT', 'VOID'],
  SENT: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'],
  VIEWED: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'],
  PARTIALLY_PAID: ['PAID', 'OVERDUE', 'VOID'],
  PAID: [],
  OVERDUE: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'VOID'],
  VOID: [],
};

const PO_TRANSITIONS: TransitionMap<PurchaseOrderStatus> = {
  DRAFT: ['APPROVED', 'CANCELLED'],
  APPROVED: ['SENT_TO_VENDOR', 'CANCELLED'],
  SENT_TO_VENDOR: ['VENDOR_CONFIRMED', 'CANCELLED'],
  VENDOR_CONFIRMED: ['PARTIALLY_SUPPLIED', 'FULLY_SUPPLIED'],
  PARTIALLY_SUPPLIED: ['FULLY_SUPPLIED'],
  FULLY_SUPPLIED: ['VENDOR_INVOICE_RECEIVED'],
  VENDOR_INVOICE_RECEIVED: ['PAYMENT_PENDING'],
  PAYMENT_PENDING: ['PARTIALLY_PAID', 'PAID'],
  PARTIALLY_PAID: ['PAID'],
  PAID: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

const VI_TRANSITIONS: TransitionMap<VendorInvoiceStatus> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'ON_HOLD', 'DISPUTED', 'REJECTED'],
  ON_HOLD: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  DISPUTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  APPROVED: ['PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DISPUTED', 'VOID'],
  REJECTED: [],
  PARTIALLY_PAID: ['PAID', 'OVERDUE'],
  PAID: [],
  OVERDUE: ['PARTIALLY_PAID', 'PAID', 'DISPUTED', 'VOID'],
  VOID: [],
};

export type EntityType = 'SALES_ORDER' | 'DISPATCH_NOTE' | 'CUSTOMER_INVOICE' | 'PURCHASE_ORDER' | 'VENDOR_INVOICE';

export function canTransition(entity: EntityType, from: string, to: string): boolean {
  switch (entity) {
    case 'SALES_ORDER': return allowed(SO_TRANSITIONS, from as SalesOrderStatus, to as SalesOrderStatus);
    case 'DISPATCH_NOTE': return allowed(DN_TRANSITIONS, from as DispatchStatus, to as DispatchStatus);
    case 'CUSTOMER_INVOICE': return allowed(CI_TRANSITIONS, from as CustomerInvoiceStatus, to as CustomerInvoiceStatus);
    case 'PURCHASE_ORDER': return allowed(PO_TRANSITIONS, from as PurchaseOrderStatus, to as PurchaseOrderStatus);
    case 'VENDOR_INVOICE': return allowed(VI_TRANSITIONS, from as VendorInvoiceStatus, to as VendorInvoiceStatus);
    default: return false;
  }
}

export function getAllowedTransitions(entity: EntityType, from: string): string[] {
  switch (entity) {
    case 'SALES_ORDER': return SO_TRANSITIONS[from as SalesOrderStatus] ?? [];
    case 'DISPATCH_NOTE': return DN_TRANSITIONS[from as DispatchStatus] ?? [];
    case 'CUSTOMER_INVOICE': return CI_TRANSITIONS[from as CustomerInvoiceStatus] ?? [];
    case 'PURCHASE_ORDER': return PO_TRANSITIONS[from as PurchaseOrderStatus] ?? [];
    case 'VENDOR_INVOICE': return VI_TRANSITIONS[from as VendorInvoiceStatus] ?? [];
    default: return [];
  }
}

/**
 * Finds the shortest chain of legal transitions from `from` to `to` for an entity's
 * state machine. Used to auto-cascade a dependent record's status (e.g. a Purchase
 * Order advancing when its linked Vendor Invoice is registered or paid) without
 * bypassing the transition guards — each hop in the returned path is still a legal
 * single-step transition. Returns null if `to` is unreachable from `from`.
 */
export function findTransitionPath(entity: EntityType, from: string, to: string): string[] | null {
  if (from === to) return [];
  const visited = new Set([from]);
  const queue: Array<{ node: string; path: string[] }> = [{ node: from, path: [] }];
  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    for (const next of getAllowedTransitions(entity, node)) {
      if (next === to) return [...path, next];
      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ node: next, path: [...path, next] });
      }
    }
  }
  return null;
}

export function formatStatus(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
