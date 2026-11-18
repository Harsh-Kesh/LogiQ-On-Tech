// TNT Australia (FedEx) public Track & Trace — no API key needed.
// TNT's result page link carries an encrypted consignment id that only its search form produces,
// so we submit that form like a browser does, follow the redirect to get the customer link, then
// read the result page for the delivered time and estimated delivery.
// ponytail: screen-reads tntexpress.com.au — if TNT changes the page, parseTntResult stops matching
// (orders then simply stay Dispatched until "Mark Delivered"). Upgrade path: FedEx Track API.

const SEARCH_URL = 'https://www.tntexpress.com.au/interaction/trackntrace.aspx';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/** Plain consignment number → TNT's own result page URL (the link customers can open). */
export async function tntResultUrl(consignment: string): Promise<string> {
  const page = await fetch(SEARCH_URL, { headers: { 'user-agent': UA }, cache: 'no-store' });
  const html = await page.text();
  const cookie = (page.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  const hidden = (name: string) => html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`))?.[1] ?? '';

  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    redirect: 'manual',
    cache: 'no-store',
    headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded', cookie, referer: SEARCH_URL },
    body: new URLSearchParams({
      __EVENTTARGET: 'ctl00$bodycontent$btnSubmit',
      __EVENTARGUMENT: '',
      __VIEWSTATE: hidden('__VIEWSTATE'),
      __VIEWSTATEGENERATOR: hidden('__VIEWSTATEGENERATOR'),
      __EVENTVALIDATION: hidden('__EVENTVALIDATION'),
      method: 'CON',
      TextArea: consignment.trim(), // TNT's page script renames the textarea to its id before posting
      'ctl00$bodycontent$hdninpTextArea': consignment.trim(),
      txtProcessingMode: '1',
      Navigation: '1',
    }),
  });
  const location = res.headers.get('location');
  if (!location || !location.includes('trackntraceResult.aspx')) {
    throw new Error(`TNT search did not return a result page for ${consignment} (HTTP ${res.status})`);
  }
  return new URL(location, SEARCH_URL).toString();
}

/** "18/09/2026" + "12:10" (TNT shows Australian local time) → Date. */
function auDateTime(dmy: string, hm?: string): Date {
  const [d, m, y] = dmy.split('/');
  // ponytail: assumes AEST (+10:00); off by an hour in daylight saving — only the date matters here.
  return new Date(`${y}-${m}-${d}T${hm ?? '12:00'}:00+10:00`);
}

/** Reads TNT result page text. The progress bar always lists "DELIVERED"; only the status line has a date. */
export function parseTntResult(text: string): { deliveredAt?: Date; estimatedDelivery?: Date } {
  const flat = text.replace(/\s+/g, ' ');
  const delivered = flat.match(/\bDELIVERED (\d{2}\/\d{2}\/\d{4})(?: (\d{2}:\d{2}))?/);
  const eta = flat.match(/ESTIMATED DELIVERY BY (\d{2}\/\d{2}\/\d{4})(?: (\d{2}:\d{2}))?/);
  return {
    deliveredAt: delivered ? auDateTime(delivered[1], delivered[2]) : undefined,
    estimatedDelivery: eta ? auDateTime(eta[1], eta[2]) : undefined,
  };
}

/** Current status of a TNT consignment, in the shape the tracking cron expects. */
export async function tntStatus(consignment: string) {
  const url = await tntResultUrl(consignment);
  const html = await (await fetch(url, { headers: { 'user-agent': UA }, cache: 'no-store' })).text();
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const { deliveredAt, estimatedDelivery } = parseTntResult(text);
  return deliveredAt
    ? { status: 'delivered' as const, deliveredAt, estimatedDelivery }
    : { status: 'in_transit' as const, estimatedDelivery };
}
