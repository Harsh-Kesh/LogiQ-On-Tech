// Courier delivery tracking for DISPATCHED orders. Server-only. No AI — plain status lookups.
// The daily cron (/api/cron/track-shipments) and the order page's "Check courier now" button ask
// the order's courier for its status; applyTrackingUpdate (src/lib/dispatch.ts) stores the ETA
// and marks the order delivered.

import { prisma } from './prisma';
import { applyTrackingUpdate, type TrackingUpdate } from './dispatch';
import { tntStatus } from './couriers/tnt';

// One entry per courier, keyed like src/lib/carriers.ts. Each takes a tracking number and
// returns its current status (+ delivered time / estimated delivery when known).
// ponytail: StarTrack not automated yet — needs a live consignment (they expire after ~21 days)
// to read its result page; until then those orders use the "Mark Delivered" button.
export const CARRIER_TRACKERS: Record<string, (trackingNumber: string) => Promise<TrackingUpdate>> = {
  tnt: tntStatus,
};

export type OrderCheck =
  | { outcome: 'no_tracker' }
  | { outcome: 'checked'; status: TrackingUpdate['status']; delivered: boolean; estimatedDelivery?: Date };

/** Ask the courier about one DISPATCHED order and apply the answer. */
export async function checkOrderTracking(o: { id: string; trackingCarrier: string | null; sektorTrackingNumber: string | null }): Promise<OrderCheck> {
  const tracker = o.trackingCarrier ? CARRIER_TRACKERS[o.trackingCarrier] : undefined;
  if (!tracker || !o.sektorTrackingNumber) return { outcome: 'no_tracker' };
  const update = await tracker(o.sektorTrackingNumber);
  const applied = await applyTrackingUpdate(o.id, update);
  return { outcome: 'checked', status: update.status, delivered: !!applied.delivered, estimatedDelivery: update.estimatedDelivery };
}

export interface TrackRunResult { checked: number; delivered: number; noTracker: number; errors: string[] }

export async function checkDispatchedShipments(): Promise<TrackRunResult> {
  const result: TrackRunResult = { checked: 0, delivered: 0, noTracker: 0, errors: [] };
  const orders = await prisma.storefrontOrder.findMany({
    where: { status: 'DISPATCHED', sektorTrackingNumber: { not: null } },
    select: { id: true, orderNumber: true, trackingCarrier: true, sektorTrackingNumber: true },
  });

  for (const o of orders) {
    try {
      const r = await checkOrderTracking(o);
      if (r.outcome === 'no_tracker') { result.noTracker++; continue; }
      result.checked++;
      if (r.delivered) result.delivered++;
    } catch (err: any) {
      result.errors.push(`${o.orderNumber}: ${err.message}`);
    }
  }
  return result;
}
