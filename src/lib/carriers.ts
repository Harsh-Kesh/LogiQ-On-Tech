// Courier tracking links + serial-number mapping. Pure functions (no DB) so the
// self-check in scripts/check-carriers.ts can run them directly.

// ponytail: fixed carrier list — add a row here when the client uses another courier.
// {n} is replaced with the URL-encoded tracking number.
export const CARRIERS: Record<string, { label: string; match: RegExp; url: string }> = {
  // StarTrack before Australia Post: invoices often print "StarTrack (Australia Post)".
  // StarTrack Courier search link (per the client). ponytail: state fixed to NSW (Sektor's dispatch
  // state, unconfirmed) — make it per-order if consignments come from other states.
  startrack: { label: 'StarTrack', match: /star\s*track/i, url: 'https://my.startrackcourier.com.au/?Type.TypeName=Connote&Type.JobTypeNumber={n}&Type.State=NSW' },
  auspost: { label: 'Australia Post', match: /australia\s*post|auspost|aus\s*post/i, url: 'https://auspost.com.au/mypost/track/details/{n}' },
  // TNT Australia (FedEx). The real per-consignment page needs an encrypted link that only TNT's
  // search form produces — src/lib/couriers/tnt.ts resolves it at dispatch; this is the fallback.
  tnt: { label: 'TNT (FedEx)', match: /\btnt\b|fedex/i, url: 'https://www.tntexpress.com.au/interaction/trackntrace.aspx' },
  couriersplease: { label: 'CouriersPlease', match: /couriers?\s*please/i, url: 'https://www.couriersplease.com.au/tools-track/no/{n}' },
  aramex: { label: 'Aramex', match: /aramex|fastway/i, url: 'https://www.aramex.com.au/tools/track?l={n}' },
  dhl: { label: 'DHL Express', match: /\bdhl\b/i, url: 'https://www.dhl.com/au-en/home/tracking/tracking-express.html?submit=1&tracking-id={n}' },
};

/** Carrier text from an invoice or the owner → our key ("auspost"), or the trimmed text if unknown. */
export function normalizeCarrier(raw?: string | null): string | null {
  const text = raw?.trim();
  if (!text) return null;
  if (CARRIERS[text]) return text;
  for (const [key, c] of Object.entries(CARRIERS)) if (c.match.test(text)) return key;
  return text;
}

export function carrierLabel(carrier?: string | null): string {
  return (carrier && CARRIERS[carrier]?.label) || carrier || 'Courier';
}

/** Public tracking page for a known carrier, or null (email then shows the plain number). */
export function trackingUrl(carrier: string | null | undefined, trackingNumber: string): string | null {
  const c = carrier ? CARRIERS[carrier] : undefined;
  return c ? c.url.replace('{n}', encodeURIComponent(trackingNumber.trim())) : null;
}

/**
 * Pair invoice serial numbers with warranty records (one record per order line).
 * Matches on item code first; lines without a code match fill the remaining records in order.
 */
export function assignSerials(
  records: { id: string; partNumber: string | null }[],
  lines: { itemCode?: string | null; serialNumbers?: string[] }[]
): { id: string; serialNumber: string }[] {
  const withSerials = lines.filter((l) => l.serialNumbers && l.serialNumbers.length > 0);
  const used = new Set<number>();
  const out: { id: string; serialNumber: string }[] = [];
  const unmatched: typeof records = [];

  for (const r of records) {
    const i = withSerials.findIndex((l, idx) => !used.has(idx) && !!l.itemCode && !!r.partNumber
      && l.itemCode.trim().toLowerCase() === r.partNumber.trim().toLowerCase());
    if (i === -1) { unmatched.push(r); continue; }
    used.add(i);
    out.push({ id: r.id, serialNumber: withSerials[i].serialNumbers!.join(', ') });
  }
  const leftover = withSerials.filter((_, idx) => !used.has(idx));
  unmatched.forEach((r, i) => {
    if (leftover[i]) out.push({ id: r.id, serialNumber: leftover[i].serialNumbers!.join(', ') });
  });
  return out;
}
