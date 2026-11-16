// Courier delivery tracking for DISPATCHED orders. Server-only (couriers' API keys live here).
// The daily cron (/api/cron/track-shipments) asks each order's courier for its status;
// applyTrackingUpdate (src/lib/dispatch.ts) stores the ETA and marks the order delivered.

import { prisma } from './prisma';
import { applyTrackingUpdate, type TrackingUpdate } from './dispatch';

// One entry per courier, keyed like src/lib/carriers.ts (e.g. "auspost"). Each takes a tracking
// number and returns its current status (+ delivered time / estimated delivery when known).
// ponytail: empty until the client confirms which couriers their suppliers use and we have API
// access — until then orders are marked delivered with the "Mark Delivered" button.
export const CARRIER_TRACKERS: Record<string, (trackingNumber: string) => Promise<TrackingUpdate>> = {};

export interface TrackRunResult { checked: number; delivered: number; noTracker: number; errors: string[] }

export async function checkDispatchedShipments(): Promise<TrackRunResult> {
  const result: TrackRunResult = { checked: 0, delivered: 0, noTracker: 0, errors: [] };
  const orders = await prisma.storefrontOrder.findMany({
    where: { status: 'DISPATCHED', sektorTrackingNumber: { not: null } },
    select: { id: true, orderNumber: true, trackingCarrier: true, sektorTrackingNumber: true },
  });

  for (const o of orders) {
    const tracker = o.trackingCarrier ? CARRIER_TRACKERS[o.trackingCarrier] : undefined;
    if (!tracker) { result.noTracker++; continue; }
    result.checked++;
    try {
      const update = await tracker(o.sektorTrackingNumber!);
      const applied = await applyTrackingUpdate(o.id, update);
      if (applied.delivered) result.delivered++;
    } catch (err: any) {
      result.errors.push(`${o.orderNumber}: ${err.message}`);
    }
  }
  return result;
}
