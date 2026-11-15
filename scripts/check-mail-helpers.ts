// Self-check for src/lib/mail-helpers.ts. Run: npx ts-node scripts/check-mail-helpers.ts
import assert from 'node:assert/strict';
import {
  escapeHtml, textToHtml, extractPoNumber, extractOrderNumber, isAllowedSender, groupConversations,
} from '../src/lib/mail-helpers';

assert.equal(escapeHtml(`<b>"A&B"</b>'`), '&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;&#39;');
assert.equal(textToHtml('Hi <x>\nThanks'), 'Hi &lt;x&gt;<br>Thanks');

assert.equal(extractPoNumber('Invoice for PO-2026-00012 attached'), 'PO-2026-00012');
assert.equal(extractPoNumber('re: po 2026 00012'), 'PO-2026-00012');
assert.equal(extractPoNumber('no reference'), null);

assert.equal(extractOrderNumber('Re: Order Confirmed — SO-2026-00042'), 'SO-2026-00042');
assert.equal(extractOrderNumber('nothing here'), null);

assert.equal(isAllowedSender('anyone@x.com', []), true, 'empty list allows all');
assert.equal(isAllowedSender('AP@Supplier.com.au', ['ap@supplier.com.au']), true, 'case-insensitive exact');
assert.equal(isAllowedSender('billing@supplier.com.au', ['@supplier.com.au']), true, 'domain entry');
assert.equal(isAllowedSender('ap@evil-supplier.com.au', ['@supplier.com.au']), false, 'domain must match after @');
assert.equal(isAllowedSender('someone@other.com', ['ap@supplier.com.au', '']), false);

const grouped = groupConversations([
  { id: 'a1', conversationId: 'A', receivedDateTime: '2026-11-01T10:00:00Z', isRead: true },
  { id: 'b1', conversationId: 'B', receivedDateTime: '2026-11-02T10:00:00Z', isRead: true },
  { id: 'a2', conversationId: 'A', receivedDateTime: '2026-11-03T10:00:00Z', isRead: false },
]);
assert.equal(grouped.length, 2);
assert.equal(grouped[0].latest.id, 'a2', 'newest conversation first, newest message as latest');
assert.equal(grouped[0].messageCount, 2);
assert.equal(grouped[0].unread, true);
assert.equal(grouped[1].latest.id, 'b1');
assert.equal(grouped[1].unread, false);

console.log('mail-helpers: all checks passed');
