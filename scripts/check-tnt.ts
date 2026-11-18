// Self-check for src/lib/couriers/tnt.ts.
//   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/check-tnt.ts
//   add a consignment number to also hit TNT live:  ... scripts/check-tnt.ts SKP000301899
import assert from 'node:assert/strict';
import { parseTntResult, tntResultUrl, tntStatus } from '../src/lib/couriers/tnt';

// Real delivered page text (SKP000301899).
const delivered = parseTntResult(`TRACK AND TRACE RESULTS COLLECTING IN TRANSIT DELIVERING DELIVERED
  CONSIGNMENT NUMBER SKP000301899 CONSIGNMENT REFERENCE 1692517
  ESTIMATED DELIVERY BY 18/09/2026 17:00 DELIVERED 18/09/2026 12:10 SIGNED BY Mohamed`);
assert.equal(delivered.deliveredAt?.toISOString(), '2026-09-18T02:10:00.000Z');
assert.equal(delivered.estimatedDelivery?.toISOString(), '2026-09-18T07:00:00.000Z');

// In transit: progress bar still says DELIVERED, but no dated status line → not delivered.
const transit = parseTntResult(`COLLECTING IN TRANSIT DELIVERING DELIVERED CONSIGNMENT NUMBER X1
  ESTIMATED DELIVERY BY 21/11/2026 17:00 IN TRANSIT 19/11/2026 08:02`);
assert.equal(transit.deliveredAt, undefined);
assert.equal(transit.estimatedDelivery?.toISOString(), '2026-11-21T07:00:00.000Z');

assert.deepEqual(parseTntResult('nothing useful'), { deliveredAt: undefined, estimatedDelivery: undefined });
console.log('tnt parser: all checks passed');

const live = process.argv[2];
if (live) {
  (async () => {
    console.log('result link:', await tntResultUrl(live));
    console.log('status:', await tntStatus(live));
  })().catch((e) => { console.error('LIVE CHECK FAILED:', e.message); process.exit(1); });
}
