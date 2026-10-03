// Phase 4 — IMAP inbox poller for incoming supplier invoices.
// Called by /api/cron/poll-invoices (Vercel cron every 5 min).
// Reads UNSEEN emails, extracts PDF attachments, parses them for invoice data,
// creates SupplierInvoice records, and triggers 3-way match.

import Imap from 'imap';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import { prisma } from './prisma';
import { parseInvoicePdf } from './invoice-parser';
import { runThreeWayMatch } from './three-way-match';

export interface PollResult {
  checked: number;
  invoicesCreated: number;
  errors: string[];
}

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

function fetchUnseenEmails(): Promise<ParsedMail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig());
    const emails: ParsedMail[] = [];

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
                  emails.push(parsed);
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

function extractPoNumber(mail: ParsedMail): string | null {
  const text = [mail.subject || '', mail.text || ''].join(' ');
  const match = text.match(/PO[-\s]?(\d{4}[-\s]\d{5}|\d{5,})/i);
  return match ? match[0].replace(/\s/g, '-').toUpperCase() : null;
}

export async function pollSupplierInvoices(): Promise<PollResult> {
  const result: PollResult = { checked: 0, invoicesCreated: 0, errors: [] };

  if (!process.env.IMAP_USER || !process.env.IMAP_PASS) {
    result.errors.push('IMAP credentials not configured — skipping poll.');
    return result;
  }

  let emails: ParsedMail[];
  try {
    emails = await fetchUnseenEmails();
  } catch (err: any) {
    result.errors.push(`IMAP connection failed: ${err.message}`);
    return result;
  }

  result.checked = emails.length;

  for (const mail of emails) {
    try {
      // Find PDF attachments
      const pdfs = (mail.attachments || []).filter(
        (a: Attachment) => a.contentType === 'application/pdf' || a.filename?.endsWith('.pdf')
      );

      for (const pdf of pdfs) {
        let parsed;
        try {
          parsed = await parseInvoicePdf(pdf.content as Buffer);
        } catch (parseErr: any) {
          result.errors.push(`PDF parse error for ${pdf.filename}: ${parseErr.message}`);
          continue;
        }

        // Try to match to an open StorefrontOrder via PO number in email or PDF
        const poRef = extractPoNumber(mail) || parsed.poNumber;
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

        // Create SupplierInvoice record
        const suppInvoice = await prisma.supplierInvoice.create({
          data: {
            vendorInvoiceNumber: parsed.invoiceNumber || `EMAIL-${Date.now()}`,
            invoiceDate: parsed.invoiceDate ? new Date(parsed.invoiceDate) : new Date(),
            dueDate: parsed.dueDate ? new Date(parsed.dueDate) : new Date(Date.now() + 30 * 86400_000),
            vendorName: parsed.supplierName || (mail.from?.text || 'Unknown Supplier'),
            linkedPoNumber: poRef || parsed.poNumber || 'UNKNOWN',
            currency: 'AUD',
            invoiceAmount: parsed.totalAmount ?? 0,
            status: 'SUBMITTED',
          },
        });

        // Link and advance StorefrontOrder status
        if (storefrontOrder) {
          await prisma.storefrontOrder.update({
            where: { id: storefrontOrder.id },
            data: {
              status: 'INVOICE_RECEIVED',
              supplierInvoiceReceivedAt: new Date(),
            },
          });

          // Trigger 3-way match immediately
          await runThreeWayMatch(storefrontOrder.id, suppInvoice.id).catch((err) =>
            result.errors.push(`3-way match failed for ${storefrontOrder!.id}: ${err.message}`)
          );

          // Write serial numbers to warranty records created by the match, in document order
          if (parsed.serialNumbers && parsed.serialNumbers.length > 0) {
            const warranties = await prisma.warrantyRecord.findMany({
              where: { supplierInvoiceId: suppInvoice.id },
              orderBy: { createdAt: 'asc' },
            });
            for (let i = 0; i < warranties.length; i++) {
              const sn = parsed.serialNumbers[i];
              if (sn && !warranties[i].serialNumber) {
                await prisma.warrantyRecord.update({
                  where: { id: warranties[i].id },
                  data: { serialNumber: sn },
                });
              }
            }
          }
        }

        result.invoicesCreated++;
      }
    } catch (err: any) {
      result.errors.push(`Failed processing email "${mail.subject}": ${err.message}`);
    }
  }

  return result;
}
