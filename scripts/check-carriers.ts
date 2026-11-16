// Self-check for src/lib/carriers.ts. Run: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/check-carriers.ts
import assert from 'node:assert/strict';
import { normalizeCarrier, trackingUrl, carrierLabel, assignSerials } from '../src/lib/carriers';

assert.equal(normalizeCarrier('StarTrack (Australia Post)'), 'startrack', 'StarTrack wins over Australia Post');
assert.equal(normalizeCarrier('Australia Post eParcel'), 'auspost');
assert.equal(normalizeCarrier('auspost'), 'auspost', 'stored key round-trips');
assert.equal(normalizeCarrier('TNT Express'), 'tnt');
assert.equal(normalizeCarrier('Couriers Please'), 'couriersplease');
assert.equal(normalizeCarrier('Fastway'), 'aramex');
assert.equal(normalizeCarrier('Hunter Express'), 'Hunter Express', 'unknown carrier kept as text');
assert.equal(normalizeCarrier('  '), null);
assert.equal(normalizeCarrier(null), null);

assert.equal(trackingUrl('auspost', ' 33ABC123 '), 'https://auspost.com.au/mypost/track/details/33ABC123');
assert.equal(trackingUrl('tnt', 'X 1'), 'https://www.tnt.com/express/en_au/site/shipping-tools/tracking.html?searchType=con&cons=X%201');
assert.equal(trackingUrl('Hunter Express', '123'), null, 'no link for unknown carrier');
assert.equal(trackingUrl(null, '123'), null);
assert.equal(carrierLabel('startrack'), 'StarTrack');
assert.equal(carrierLabel('Hunter Express'), 'Hunter Express');

const pairs = assignSerials(
  [{ id: 'w1', partNumber: 'TC21' }, { id: 'w2', partNumber: 'ZD421' }, { id: 'w3', partNumber: 'DS2208' }],
  [
    { itemCode: null, serialNumbers: ['S-X'] },          // no code: fills first unmatched record
    { itemCode: 'zd421', serialNumbers: ['Z1', 'Z2'] },  // case-insensitive code match
    { itemCode: 'TC21', serialNumbers: [] },             // no serials: ignored
  ]
);
assert.deepEqual(pairs, [{ id: 'w2', serialNumber: 'Z1, Z2' }, { id: 'w1', serialNumber: 'S-X' }]);

console.log('carriers: all checks passed');
