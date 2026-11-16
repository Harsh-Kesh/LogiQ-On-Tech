// Phase 4 — supplier invoice inbox reader.
// Called by /api/cron/poll-invoices.
// Reads the accounts mailbox through Microsoft Graph when MS_* is configured
// (MS_INVOICE_MAILBOX), otherwise falls back to IMAP (IMAP_* env vars).
// For each email from a known supplier, extracts PDF attachments, parses them,
// creates SupplierInvoice records, then match → bill → tracking email (src/lib/dispatch.ts).

import Imap from 'imap';
import { simpleParser, Attachment } from 'mailparser';
import { prisma } from './prisma';
import { parseInvoicePdf } from './invoice-parser';
import { advanceAfterInvoice } from './dispatch';
import { assignSerials, normalizeCarrier } from './carriers';
import { graph, graphConfigured, invoiceMailbox, mailboxPath } from './msgraph';
import { escapeHtml, extractPoNumber, isAllowedSender } from './mail-helpers';

export interface PollResult {
  source: 'graph' | 'imap' | 'none';
  checked: number;
  invoicesCreated: number;
  skippedUnknownSender: number;
  errors: string[];
}

interface InboundMail {
  graphId?: string;
  categories?: string[];
  subject: string;
  text: string;
  fromAddress: string;
  fromText: string;
  pdfs: { filename: string; content: Buffer }[];
}

// Outlook categories the reader puts on emails in the accounts mailbox, visible to staff in Outlook.
const PROCESSED_CATEGORY = 'LogiQ: invoice processed';
const FAILED_CATEGORY = 'LogiQ: invoice failed';

function isPdf(contentType: string | undefined, filename: string | undefined): boolean {
  return contentType === 'application/pdf' || Boolean(filename?.toLowerCase().endsWith('.pdf'));
}

// ── IMAP (fallback) ──────────────────────────────────────────────────────────

function imapConfig() {
  return {
    user: process.env.IMAP_USER || '',
    password: process.env.IMAP_PASS || '',
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  };
}

function fetchUnseenImapEmails(): Promise<InboundMail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig());
    const emails: InboundMail[] = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) { imap.end(); return reject(err); }

        imap.search(['UNSEEN'], (searchErr, uids) => {
          if (searchErr) { imap.end(); return reject(searchErr); }
          if (!uids || uids.length === 0) { imap.end(); return resolve([]); }

          const fetch = imap.fetch(uids, { bodies: '', markSeen: true });

          fetch.on('message', (msg) => {
            const chunks: Buffer[] = [];
            msg.on('body', (stream) => {
              stream.on('data', (chunk: Buffer) => chunks.push(chunk));
              stream.once('end', async () => {
                try {
                  const parsed = await simpleParser(Buffer.concat(chunks));
                  emails.push({
                    subject: parsed.subject || '',
                    text: parsed.text || '',
                    fromAddress: parsed.from?.value?.[0]?.address || '',
                    fromText: parsed.from?.text || '',
                    pdfs: (parsed.attachments || [])
                      .filter((a: Attachment) => isPdf(a.contentType, a.filename))
                      .map((a: Attachment) => ({ filename: a.filename || 'invoice.pdf', content: a.content as Buffer })),
                  });
                } catch {}
              });
            });
          });

          fetch.once('error', (fetchErr) => { imap.end(); reject(fetchErr); });
          fetch.once('end', () => imap.end());
        });
      });
    });

    imap.once('end', () => resolve(emails));
    imap.once('error', (err: Error) => reject(err));
    imap.connect();
  });
}

// ── Microsoft Graph ──────────────────────────────────────────────────────────

async function fetchGraphInvoiceEmails(mailbox: string): Promise<InboundMail[]> {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const filter = encodeURIComponent(`receivedDateTime ge ${since} and hasAttachments eq true`);
  const list = await graph<{ value: any[] }>(
    'GET',
    `${mailboxPath(mailbox)}/mailFolders/inbox/messages?$filter=${filter}&$orderby=receivedDateTime desc&$top=50&$select=id,subject,from,body,categories`,
    undefined,
    { Prefer: 'outlook.body-content-type="text"' }
  );

  return list.value
    .filter((m) => !(m.categories || []).some((c: string) => c === PROCESSED_CATEGORY || c === FAILED_CATEGORY))
    .map((m) => ({
      graphId: m.id,
      categories: m.categories || [],
      subject: m.subject || '',
      text: m.body?.content || '',
      fromAddress: m.from?.emailAddress?.address || '',
      fromText: m.from?.emailAddress?.name || m.from?.emailAddress?.address || '',
      pdfs: [], // downloaded only for allowed senders, see loadGraphPdfs
    }));
}

async function loadGraphPdfs(mailbox: string, mail: InboundMail): Promise<void> {
  const res = await graph<{ value: any[] }>('GET', `${mailboxPath(mailbox)}/messages/${mail.graphId}/attachments`);
  mail.pdfs = res.value
    .filter((a) => a['@odata.type'] === '#microsoft.graph.fileAttachment' && isPdf(a.contentType, a.name))
    .map((a) => ({ filename: a.name, content: Buffer.from(a.contentBytes, 'base64') }));
}

async function tagGraphEmail(mailbox: string, mail: InboundMail, category: string): Promise<void> {
  await graph('PATCH', `${mailboxPath(mailbox)}/messages/${mail.graphId}`, {
    categories: [...(mail.categories || []), category],
  });
}

// ── Shared ───────────────────────────────────────────────────────────────────

/** Known supplier addresses: vendor AP/PO emails, item supplier emails, plus INVOICE_ALLOWED_SENDERS. */
async function supplierAllowList(): Promise<string[]> {
  const [vendors, items] = await Promise.all([
    prisma.vendor.findMany({ select: { apEmail: true, poEmail: true } }),
    prisma.itemMaster.findMany({ where: { supplierEmail: { not: null } }, select: { supplierEmail: true }, distinct: ['supplierEmail'] }),
  ]);
  const fromEnv = (process.env.INVOICE_ALLOWED_SENDERS || '').split(',');
  return [
    ...vendors.flatMap((v) => [v.apEmail, v.poEmail]),
    ...items.map((i) => i.supplierEmail),
    ...fromEnv,
  ].filter((e): e is string => Boolean(e && e.trim()));
}

async function processInvoiceMail(mail: InboundMail, result: PollResult): Promise<void> {
  const readouts: string[] = [];
  let linkedOrderId: string | undefined;

  for (const pdf of mail.pdfs) {
    let parsed;
    try {
      parsed = await parseInvoicePdf(pdf.content);
    } catch (parseErr: any) {
      throw new Error(`PDF parse error for ${pdf.filename}: ${parseErr.message}`);
    }

    // Try to match to an open StorefrontOrder via PO number in email or PDF
    const poRef = extractPoNumber(`${mail.subject} ${mail.text}`) || parsed.poNumber;
    let storefrontOrder = null;
    if (poRef) {
      storefrontOrder = await prisma.storefrontOrder.findFirst({
        where: {
          OR: [
            { myobPoNumber: { contains: poRef.replace(/PO[-\s]?/i, '').trim() } },
            { myobPoNumber: poRef },
          ],
          status: 'PO_SENT',
        },
      });
    }

    const suppInvoice = await prisma.supplierInvoice.create({
      data: {
        vendorInvoiceNumber: parsed.invoiceNumber || `EMAIL-${Date.now()}`,
        invoiceDate: parsed.invoiceDate ? new Date(parsed.invoiceDate) : new Date(),
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : new Date(Date.now() + 30 * 86400_000),
        vendorName: parsed.supplierName || mail.fromText || 'Unknown Supplier',
        linkedPoNumber: poRef || parsed.poNumber || 'UNKNOWN',
        currency: 'AUD',
        invoiceAmount: parsed.totalAmount ?? 0,
        status: 'SUBMITTED',
      },
    });

    if (storefrontOrder) {
      // Supplier invoices once goods ship, so the invoice's tracking number is the dispatch tracking.
      await prisma.storefrontOrder.update({
        where: { id: storefrontOrder.id },
        data: {
          status: 'INVOICE_RECEIVED',
          supplierInvoiceReceivedAt: new Date(),
          ...(parsed.trackingNumber ? { sektorTrackingNumber: parsed.trackingNumber, trackingCarrier: normalizeCarrier(parsed.carrier) } : {}),
        },
      });

      // Match → bill → tracking email (stops early on a match exception or missing tracking).
      await advanceAfterInvoice(storefrontOrder.id, suppInvoice.id).catch((err) =>
        result.errors.push(`Match/bill/dispatch failed for ${storefrontOrder!.id}: ${err.message}`)
      );

      // Serial/batch numbers onto the warranty records the match created (one per order line).
      const warranties = await prisma.warrantyRecord.findMany({
        where: { supplierInvoiceId: suppInvoice.id },
        orderBy: { createdAt: 'asc' },
      });
      // Claude gives serials per line (matched by item code); the regex fallback only a flat list.
      const serialLines = parsed.lines?.some((l) => l.serialNumbers?.length)
        ? parsed.lines
        : (parsed.serialNumbers ?? []).map((s) => ({ serialNumbers: [s] }));
      const serials = new Map(assignSerials(warranties, serialLines).map((p) => [p.id, p.serialNumber]));
      for (let i = 0; i < warranties.length; i++) {
        const sn = serials.get(warranties[i].id);
        const bn = parsed.batchNumbers?.[i];
        const data: Record<string, string> = {};
        if (sn && !warranties[i].serialNumber) data.serialNumber = sn;
        if (bn && !warranties[i].batchNumber) data.batchNumber = bn;
        if (Object.keys(data).length > 0) {
          await prisma.warrantyRecord.update({ where: { id: warranties[i].id }, data });
        }
      }
      linkedOrderId = storefrontOrder.id;
    }

    readouts.push(`<li><strong>${escapeHtml(pdf.filename)}</strong> (read by ${parsed.parsedBy}): invoice ${escapeHtml(suppInvoice.vendorInvoiceNumber)},
      PO ${escapeHtml(poRef || '—')}, total ${parsed.totalAmount != null ? `AUD ${parsed.totalAmount.toFixed(2)}` : '—'},
      tracking ${escapeHtml(parsed.trackingNumber ? `${parsed.trackingNumber} (${parsed.carrier || 'carrier not shown'})` : '—')}
      — ${storefrontOrder ? `linked to order ${escapeHtml(storefrontOrder.orderNumber)}` : '<span style="color:#b91c1c">not linked to an open order</span>'}</li>`);
    result.invoicesCreated++;
  }

  // Record the received email so it shows on the dashboard Accounts Mailbox page.
  await prisma.emailLog.create({
    data: {
      to: mail.fromAddress,
      subject: mail.subject || '(no subject)',
      mode: 'received',
      orderId: linkedOrderId,
      html: `<div style="font-family:sans-serif;font-size:14px;color:#0f172a;padding:16px">
        <p style="margin:0 0 8px"><strong>From:</strong> ${escapeHtml(mail.fromText || mail.fromAddress)}</p>
        <p style="margin:0 0 4px"><strong>What the app read:</strong></p>
        <ul style="margin:0 0 12px;padding-left:20px">${readouts.join('')}</ul>
        <hr style="border:none;border-top:1px solid #e2e8f0"/>
        <div style="white-space:pre-wrap">${escapeHtml(mail.text || '')}</div>
      </div>`,
    },
  }).catch((err) => result.errors.push(`Inbox log failed for "${mail.subject}": ${err.message}`));
}

export async function pollSupplierInvoices(): Promise<PollResult> {
  const result: PollResult = { source: 'none', checked: 0, invoicesCreated: 0, skippedUnknownSender: 0, errors: [] };
  const useGraph = graphConfigured() && Boolean(invoiceMailbox());

  if (!useGraph && (!process.env.IMAP_USER || !process.env.IMAP_PASS)) {
    result.errors.push('No invoice mailbox configured (set MS_* for Microsoft 365, or IMAP_*) — skipping poll.');
    return result;
  }
  result.source = useGraph ? 'graph' : 'imap';

  let emails: InboundMail[];
  try {
    emails = useGraph ? await fetchGraphInvoiceEmails(invoiceMailbox()) : await fetchUnseenImapEmails();
  } catch (err: any) {
    result.errors.push(`Mailbox connection failed: ${err.message}`);
    return result;
  }
  result.checked = emails.length;

  const allowList = await supplierAllowList();

  for (const mail of emails) {
    // Unknown senders are left untouched (no tag) so staff can deal with them in Outlook.
    if (!isAllowedSender(mail.fromAddress, allowList)) {
      result.skippedUnknownSender++;
      continue;
    }
    try {
      if (useGraph) await loadGraphPdfs(invoiceMailbox(), mail);
      await processInvoiceMail(mail, result);
      if (useGraph) await tagGraphEmail(invoiceMailbox(), mail, PROCESSED_CATEGORY);
    } catch (err: any) {
      result.errors.push(`Failed processing email "${mail.subject}": ${err.message}`);
      if (useGraph) await tagGraphEmail(invoiceMailbox(), mail, FAILED_CATEGORY).catch(() => {});
    }
  }

  return result;
}
