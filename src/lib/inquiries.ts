// Customer inquiries inbox — reads and replies through the orders@ mailbox
// (MS_SENDER_MAILBOX) with Microsoft Graph. Nothing is copied into the database:
// the mailbox is the source of truth, so staff using Outlook see the same thing.

import { graph, graphConfigured, mailboxPath, senderMailbox } from './msgraph';
import { prisma } from './prisma';
import { extractOrderNumber, groupConversations, textToHtml } from './mail-helpers';

export const HANDLED_CATEGORY = 'LogiQ: handled';

const TEXT_BODY = { Prefer: 'outlook.body-content-type="text"' };

export function inquiriesConfigured(): boolean {
  return graphConfigured() && Boolean(senderMailbox());
}

interface GraphAddress { emailAddress?: { address?: string; name?: string } }

interface GraphMessage {
  id: string;
  conversationId: string;
  subject?: string;
  from?: GraphAddress;
  replyTo?: GraphAddress[];
  toRecipients?: GraphAddress[];
  receivedDateTime: string;
  sentDateTime?: string;
  isRead: boolean;
  bodyPreview?: string;
  body?: { content?: string };
  categories?: string[];
}

export interface InquirySummary {
  id: string;                 // latest inbound message id — used for reply / handled
  conversationId: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  preview: string;
  receivedAt: string;
  unread: boolean;
  handled: boolean;
  messageCount: number;
}

export interface ThreadMessage {
  id: string;
  fromName: string;
  fromEmail: string;
  outbound: boolean;          // sent by us (orders@)
  sentAt: string;
  body: string;               // plain text
}

/** The person to answer: replyTo wins (website forms set it), else the sender. */
function customerOf(m: GraphMessage): { name: string; email: string } {
  const who = m.replyTo?.[0]?.emailAddress || m.from?.emailAddress || {};
  return { name: who.name || who.address || 'Unknown', email: who.address || '' };
}

export async function listInquiries(): Promise<InquirySummary[]> {
  const mb = mailboxPath(senderMailbox());
  const res = await graph<{ value: GraphMessage[] }>(
    'GET',
    `${mb}/mailFolders/inbox/messages?$top=100&$orderby=receivedDateTime desc` +
      `&$select=id,conversationId,subject,from,replyTo,receivedDateTime,isRead,bodyPreview,categories`
  );

  return groupConversations(res.value).map(({ latest, messageCount, unread }) => {
    const customer = customerOf(latest);
    return {
      id: latest.id,
      conversationId: latest.conversationId,
      subject: latest.subject || '(no subject)',
      customerName: customer.name,
      customerEmail: customer.email,
      preview: latest.bodyPreview || '',
      receivedAt: latest.receivedDateTime,
      unread,
      handled: (latest.categories || []).includes(HANDLED_CATEGORY),
      messageCount,
    };
  });
}

export async function getInquiryThread(messageId: string) {
  const mb = mailboxPath(senderMailbox());
  const own = senderMailbox().toLowerCase();

  const anchor = await graph<GraphMessage>('GET', `${mb}/messages/${encodeURIComponent(messageId)}?$select=id,conversationId,subject,from,replyTo,categories`);
  const conv = anchor.conversationId.replace(/'/g, "''");

  // All folders (inbox + Sent Items), so replies sent from the app or Outlook show in the thread.
  const res = await graph<{ value: GraphMessage[] }>(
    'GET',
    `${mb}/messages?$filter=${encodeURIComponent(`conversationId eq '${conv}'`)}&$top=50` +
      `&$select=id,from,receivedDateTime,sentDateTime,isRead,body`,
    undefined,
    TEXT_BODY
  );

  const messages: ThreadMessage[] = res.value
    .map((m) => {
      const fromEmail = m.from?.emailAddress?.address || '';
      return {
        id: m.id,
        fromName: m.from?.emailAddress?.name || fromEmail,
        fromEmail,
        outbound: fromEmail.toLowerCase() === own,
        sentAt: m.sentDateTime || m.receivedDateTime,
        body: m.body?.content || '',
      };
    })
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));

  // Opening a conversation marks its unread inbound messages read (same as Outlook).
  await Promise.all(
    res.value
      .filter((m) => !m.isRead)
      .map((m) => graph('PATCH', `${mb}/messages/${encodeURIComponent(m.id)}`, { isRead: true }).catch(() => {}))
  );

  // Link to the storefront order when the conversation mentions one (e.g. a reply to an order email).
  const orderNumber = extractOrderNumber([anchor.subject || '', ...messages.map((m) => m.body)].join(' '));
  const order = orderNumber
    ? await prisma.storefrontOrder.findFirst({ where: { orderNumber }, select: { id: true, orderNumber: true } })
    : null;

  const customer = customerOf(anchor);
  return {
    subject: anchor.subject || '(no subject)',
    customerName: customer.name,
    customerEmail: customer.email,
    handled: (anchor.categories || []).includes(HANDLED_CATEGORY),
    order,
    messages,
  };
}

/** Reply in the same thread. Graph sends to replyTo when set (website forms), else to the sender. */
export async function replyToInquiry(messageId: string, text: string): Promise<void> {
  const mb = mailboxPath(senderMailbox());
  await graph('POST', `${mb}/messages/${encodeURIComponent(messageId)}/reply`, { comment: textToHtml(text) });
}

export async function setInquiryHandled(messageId: string, handled: boolean): Promise<void> {
  const mb = mailboxPath(senderMailbox());
  const msg = await graph<GraphMessage>('GET', `${mb}/messages/${encodeURIComponent(messageId)}?$select=categories`);
  const others = (msg.categories || []).filter((c) => c !== HANDLED_CATEGORY);
  await graph('PATCH', `${mb}/messages/${encodeURIComponent(messageId)}`, {
    categories: handled ? [...others, HANDLED_CATEGORY] : others,
  });
}
