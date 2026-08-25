import { loadPersistentOrders } from './orders';
import { loadPersistentReturns } from './returns';
import { isValidAbnAcn } from './validation';

export interface VendorMetrics {
  fulfillmentRate: number;
  onTimeDeliveryRate: number;
  qualityRating: number;
  ordersFulfilled: number;
  totalOrders: number;
  totalReturns: number;
  damagedReturns: number;
}

const ON_TIME_SLA_HOURS = 48;

export function calculateVendorMetrics(vendorId?: string | null, vendorEmail?: string | null, additionalIds?: string[]): VendorMetrics {
  const orders = loadPersistentOrders();
  const returns = loadPersistentReturns();

  const matchIds = new Set<string>();
  if (vendorId) matchIds.add(vendorId);
  if (additionalIds) additionalIds.forEach((id) => matchIds.add(id));

  const vendorOrders = orders.filter((o) => {
    if (o.vendorId && matchIds.has(o.vendorId)) return true;
    if (vendorEmail && o.vendorEmail?.toLowerCase() === vendorEmail.toLowerCase()) return true;
    return false;
  });

  const nonCancelledOrders = vendorOrders.filter((o) => o.status !== 'CANCELLED');
  const dispatchedOrders = vendorOrders.filter((o) => o.status === 'DISPATCHED');
  const totalOrders = nonCancelledOrders.length;
  const ordersFulfilled = dispatchedOrders.length;

  // Fulfillment Rate = dispatched / total non-cancelled orders
  const fulfillmentRate = totalOrders > 0
    ? Math.round((ordersFulfilled / totalOrders) * 1000) / 10
    : 0;

  // On-Time Delivery = orders dispatched within SLA window from creation
  let onTimeCount = 0;
  for (const order of dispatchedOrders) {
    const created = new Date(order.createdAt).getTime();
    const dispatched = new Date(order.updatedAt).getTime();
    const hoursElapsed = (dispatched - created) / (1000 * 60 * 60);
    if (hoursElapsed <= ON_TIME_SLA_HOURS) {
      onTimeCount++;
    }
  }
  const onTimeDeliveryRate = ordersFulfilled > 0
    ? Math.round((onTimeCount / ordersFulfilled) * 1000) / 10
    : 0;

  // Quality Rating derived from return/damage rate against dispatched orders
  // Each damaged return reduces quality; restockable returns have minor impact
  const vendorReturns = returns.filter((r) => {
    const matchOrder = dispatchedOrders.some(
      (o) => o.id === r.orderId || o.orderNumber === r.orderNumber
    );
    return matchOrder;
  });

  const totalReturns = vendorReturns.length;
  const damagedReturns = vendorReturns.filter((r) => r.condition === 'DAMAGED_WRITE_OFF').length;
  const restockableReturns = totalReturns - damagedReturns;

  let qualityRating = 5.0;
  if (ordersFulfilled > 0) {
    const damagePenalty = (damagedReturns / ordersFulfilled) * 3.0;
    const returnPenalty = (restockableReturns / ordersFulfilled) * 1.0;
    qualityRating = Math.max(0, Math.min(5.0, 5.0 - damagePenalty - returnPenalty));
    qualityRating = Math.round(qualityRating * 10) / 10;
  } else {
    qualityRating = 0;
  }

  return {
    fulfillmentRate,
    onTimeDeliveryRate,
    qualityRating,
    ordersFulfilled,
    totalOrders,
    totalReturns,
    damagedReturns,
  };
}

export function checkAbnAcnCompliance(abnAcn?: string | null): { verified: boolean; message: string } {
  if (!abnAcn || !abnAcn.trim()) {
    return { verified: false, message: 'Not Submitted' };
  }
  const result = isValidAbnAcn(abnAcn);
  if (result.valid) {
    return { verified: true, message: 'ATO Checksum Verified' };
  }
  return { verified: false, message: result.message || 'Checksum Failed' };
}
