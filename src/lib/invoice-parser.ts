// Phase 4 — PDF invoice parser.
// With ANTHROPIC_API_KEY set, Claude reads the PDF (layout-independent, also finds
// the courier tracking number and per-line serial numbers). Without it, falls back
// to the original regex patterns for common Australian invoice formats.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod/v4';

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
  trackingNumber?: string;   // courier consignment / tracking number (Claude only)
  carrier?: string;          // courier name as printed, e.g. "Australia Post" (Claude only)
  estimatedDeliveryDate?: string; // YYYY-MM-DD if the invoice states one (Claude only)
  parsedBy: 'claude' | 'regex';
}

export interface ParsedInvoiceLine {
  itemCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  serialNumbers?: string[];
}

export const INVOICE_MODEL = 'claude-opus-5-5';

const ClaudeInvoice = z.object({
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable().describe('YYYY-MM-DD'),
  dueDate: z.string().nullable().describe('YYYY-MM-DD'),
  supplierName: z.string().nullable(),
  poNumber: z.string().nullable().describe('Our purchase order reference, e.g. PO-2026-00012'),
  subtotal: z.number().nullable().describe('Ex GST'),
  taxAmount: z.number().nullable().describe('GST'),
  totalAmount: z.number().nullable().describe('Total payable inc GST'),
  trackingNumber: z.string().nullable().describe('Courier consignment / tracking / connote number for the shipment'),
  carrier: z.string().nullable().describe('Courier company name exactly as printed, e.g. Australia Post, StarTrack, TNT'),
  estimatedDeliveryDate: z.string().nullable().describe('YYYY-MM-DD. Estimated / expected delivery or ETA date if the invoice states one'),
  lines: z.array(z.object({
    itemCode: z.string().nullable().describe('SKU / part number / item code'),
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number().describe('Ex GST'),
    lineTotal: z.number(),
    serialNumbers: z.array(z.string()).describe('Every serial number listed for this line, empty if none'),
    batchNumbers: z.array(z.string()).describe('Batch / lot numbers for this line, empty if none'),
  })),
});

const INSTRUCTIONS = `This PDF is a supplier tax invoice sent to LogiQ-On Technology (an Australian reseller).
Extract the fields in the schema. Rules:
- Copy invoice numbers, PO numbers, item codes, serial numbers and tracking numbers exactly as printed (no added spaces, no guessed characters).
- poNumber is OUR purchase order number quoted on the invoice (often labelled "Your Ref", "Customer PO" or "PO"), not the supplier's own order number.
- trackingNumber is the courier consignment / connote / tracking number for this shipment. Use null if the invoice does not show one — never invent it.
- estimatedDeliveryDate only if the invoice explicitly states an estimated/expected delivery or ETA date; otherwise null.
- Amounts are plain numbers (no currency symbols). Dates as YYYY-MM-DD; Australian invoices write dates day-first.
- Use null for anything not on the invoice.`;

async function parseWithClaude(buffer: Buffer): Promise<ParsedInvoice> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: INVOICE_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // re-run on a fallback model if a safety classifier declines
    output_config: { effort: 'medium', format: betaZodOutputFormat(ClaudeInvoice) },
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') } },
        { type: 'text', text: INSTRUCTIONS },
      ],
    }],
  });

  if (response.stop_reason === 'refusal') throw new Error('Claude declined to read this invoice');
  if (response.stop_reason === 'max_tokens') throw new Error('Claude ran out of output tokens reading this invoice');
  const inv = response.parsed_output;
  if (!inv) throw new Error('Claude returned no structured invoice data');

  const opt = <T>(v: T | null) => (v === null ? undefined : v);
  return {
    invoiceNumber: opt(inv.invoiceNumber),
    invoiceDate: opt(inv.invoiceDate),
    dueDate: opt(inv.dueDate),
    supplierName: opt(inv.supplierName),
    poNumber: opt(inv.poNumber),
    subtotal: opt(inv.subtotal),
    taxAmount: opt(inv.taxAmount),
    totalAmount: opt(inv.totalAmount),
    trackingNumber: opt(inv.trackingNumber),
    carrier: opt(inv.carrier),
    estimatedDeliveryDate: opt(inv.estimatedDeliveryDate),
    lines: inv.lines.map((l) => ({
      itemCode: opt(l.itemCode),
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      serialNumbers: l.serialNumbers,
    })),
    serialNumbers: inv.lines.flatMap((l) => l.serialNumbers),
    batchNumbers: inv.lines.flatMap((l) => l.batchNumbers),
    parsedBy: 'claude',
  };
}

export async function parseInvoicePdf(buffer: Buffer): Promise<ParsedInvoice> {
  return process.env.ANTHROPIC_API_KEY ? parseWithClaude(buffer) : parseInvoicePdfRegex(buffer);
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

async function parseInvoicePdfRegex(buffer: Buffer): Promise<ParsedInvoice> {
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

  return { invoiceNumber, invoiceDate, dueDate, supplierName, poNumber, subtotal, taxAmount, totalAmount, lines, serialNumbers, batchNumbers, parsedBy: 'regex' };
}
