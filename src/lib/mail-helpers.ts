// Pure helpers shared by the invoice reader, the inquiry inbox and outbound email.
// No imports, so scripts/check-mail-helpers.ts can test them without a database.

/** Escape text for safe insertion into email HTML. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Plain text typed by a person -> email-safe HTML, keeping line breaks. */
export function textToHtml(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, '<br>');
}

/** PO reference in an email subject/body, e.g. "PO-2026-00012". */
export function extractPoNumber(text: string): string | null {
  const match = text.match(/PO[-\s]?(\d{4}[-\s]\d{5}|\d{5,})/i);
  return match ? match[0].replace(/\s/g, '-').toUpperCase() : null;
}

/** Storefront order number, e.g. "SO-2026-00042". */
export function extractOrderNumber(text: string): string | null {
  const match = text.match(/\bSO-\d{4}-\d{5}\b/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Allow-list check for supplier invoice senders. Entries are full addresses
 * ("ap@supplier.com.au") or whole domains ("@supplier.com.au").
 * An empty list allows everyone.
 */
export function isAllowedSender(address: string, allowList: string[]): boolean {
  if (allowList.length === 0) return true;
  const addr = address.trim().toLowerCase();
  return allowList.some((entry) => {
    const e = entry.trim().toLowerCase();
    if (!e) return false;
    return e.startsWith('@') ? addr.endsWith(e) : addr === e;
  });
}

export interface InboxMessage {
  id: string;
  conversationId: string;
  receivedDateTime: string;
  isRead: boolean;
  categories?: string[];
}

export interface ConversationSummary<T extends InboxMessage> {
  latest: T;
  messageCount: number;
  unread: boolean;
}

/** Collapse inbox messages into one row per conversation, newest conversation first. */
export function groupConversations<T extends InboxMessage>(messages: T[]): ConversationSummary<T>[] {
  const byConversation = new Map<string, ConversationSummary<T>>();
  for (const m of messages) {
    const existing = byConversation.get(m.conversationId);
    if (!existing) {
      byConversation.set(m.conversationId, { latest: m, messageCount: 1, unread: !m.isRead });
      continue;
    }
    existing.messageCount++;
    existing.unread = existing.unread || !m.isRead;
    if (m.receivedDateTime > existing.latest.receivedDateTime) existing.latest = m;
  }
  return Array.from(byConversation.values()).sort((a, b) =>
    b.latest.receivedDateTime.localeCompare(a.latest.receivedDateTime)
  );
}
