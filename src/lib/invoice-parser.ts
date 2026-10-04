// Phase 4 — PDF invoice parser.
// Extracts structured invoice data from supplier PDF invoices using regex patterns.
// Handles common Australian invoice formats.

// pdf-parse ships CJS only; require() avoids the default-export TS error.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

export interface ParsedInvoice {
  invoiceNumber?: string;
  invoiceDate?: string;   // ISO date string
  dueDate?: string;       // ISO date string
  supplierName?: string;
  poNumber?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  lines?: ParsedInvoiceLine[];
  serialNumbers?: string[];  // one per line item, in order of appearance
  batchNumbers?: string[];   // one per line item, in order of appearance
}

export interface ParsedInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

function parseAuDate(raw: string): string | undefined {
  // Handles DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, D Month YYYY
  const patterns = [
    { re: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, fn: (m: RegExpMatchArray) => `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` },
    { re: /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, fn: (m: RegExpMatchArray) => `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` },
    { re: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i, fn: (m: RegExpMatchArray) => {
      const months: Record<string,string> = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
      return `${m[3]}-${months[m[2].toLowerCase().slice(0,3)]}-${m[1].padStart(2,'0')}`;
    }},
  ];
  for (const { re, fn } of patterns) {
    const m = raw.match(re);
    if (m) return fn(m);
  }
  return undefined;
}

function extractAmount(text: string, label: string): number | undefined {
  const re = new RegExp(`${label}[\\s\\S]{0,30}?\\$?([\\d,]+\\.\\d{2})`, 'i');
  const m = text.match(re);
  return m ? parseFloat(m[1].replace(/,/g, '')) : undefined;
}

export async function parseInvoicePdf(buffer: Buffer): Promise<ParsedInvoice> {
  const data = await pdfParse(buffer);
  const text = data.text;

  // Invoice number
  const invMatch = text.match(/invoice\s*(?:no|number|#)[:\s]*([A-Z0-9\-]{3,20})/i);
  const invoiceNumber = invMatch?.[1];

  // Supplier name — first non-blank line is usually the company name
  const firstLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const supplierName = firstLines[0];

  // PO reference number
  const poMatch = text.match(/(?:PO|purchase\s*order)\s*(?:no|number|#|ref)?[:\s]*([A-Z0-9\-]{5,20})/i);
  const poNumber = poMatch?.[1];

  // Dates
  const invDateMatch = text.match(/invoice\s*date[:\s]*([^\n]{6,20})/i);
  const invoiceDate = invDateMatch ? parseAuDate(invDateMatch[1]) : undefined;

  const dueDateMatch = text.match(/(?:due|payment)\s*date[:\s]*([^\n]{6,20})/i);
  const dueDate = dueDateMatch ? parseAuDate(dueDateMatch[1]) : undefined;

  // Amounts
  const subtotal = extractAmount(text, 'subtotal') || extractAmount(text, 'sub\\s*total') || extractAmount(text, 'net\\s*amount');
  const taxAmount = extractAmount(text, 'gst') || extractAmount(text, 'tax');
  const totalAmount = extractAmount(text, 'total\\s*(?:amount|due|inc)') || extractAmount(text, 'amount\\s*due');

  // Line items — look for rows matching: description qty unitprice linetotal
  const lines: ParsedInvoiceLine[] = [];
  const lineRe = /^(.+?)\s+(\d+(?:\.\d+)?)\s+\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})/gm;
  let lm;
  while ((lm = lineRe.exec(text)) !== null) {
    const qty = parseFloat(lm[2]);
    const unitPrice = parseFloat(lm[3].replace(/,/g, ''));
    const lineTotal = parseFloat(lm[4].replace(/,/g, ''));
    if (qty > 0 && unitPrice > 0) {
      lines.push({ description: lm[1].trim(), quantity: qty, unitPrice, lineTotal });
    }
  }

  // Serial numbers — match common patterns: S/N, SN:, Serial No:, Serial:
  const serialNumbers: string[] = [];
  const snRe = /(?:s\/n|sn|serial\s*(?:no|number|#)?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{3,29})/gi;
  let snMatch;
  while ((snMatch = snRe.exec(text)) !== null) {
    const sn = snMatch[1].trim();
    if (!serialNumbers.includes(sn)) serialNumbers.push(sn);
  }

  // Batch / lot numbers — match common patterns: Batch No:, Batch:, Lot No:, Lot:, B/N:
  const batchNumbers: string[] = [];
  const batchRe = /(?:b\/n|batch|lot)\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{2,29})/gi;
  let batchMatch;
  while ((batchMatch = batchRe.exec(text)) !== null) {
    const bn = batchMatch[1].trim();
    if (!batchNumbers.includes(bn)) batchNumbers.push(bn);
  }

  return { invoiceNumber, invoiceDate, dueDate, supplierName, poNumber, subtotal, taxAmount, totalAmount, lines, serialNumbers, batchNumbers };
}
