import { NextResponse } from 'next/server';
import { getPublishedProductBySku } from '@/lib/store-catalog';
import { createSalesOrder } from '@/lib/sales-orders';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/audit';
import { loadCustomerMasterData, createCustomerMasterRecord } from '@/lib/customer-master';

const PAYMENT_TERMS = ['Net 7', 'Net 14', 'Net 30', 'Net 45', 'Net 60', 'Prepaid', 'CIA (Cash in Advance)', 'COD'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public, unauthenticated storefront checkout (FR-STORE). A guest visitor places an
// order directly — no account, no login. Prices are always re-resolved server-side
// from the published catalogue; a client-submitted price is never trusted.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const customerName = String(body.customerName || '').trim();
  const customerEmail = String(body.customerEmail || '').trim();
  const customerPhone = body.customerPhone ? String(body.customerPhone).trim() : undefined;
  const deliveryLocation = String(body.deliveryLocation || '').trim();
  const paymentTerms = String(body.paymentTerms || '').trim();

  if (!customerName) return NextResponse.json({ error: 'Your name is required.' }, { status: 400 });
  if (!customerEmail || !EMAIL_RE.test(customerEmail)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }
  if (!deliveryLocation) return NextResponse.json({ error: 'A delivery address is required.' }, { status: 400 });
  if (!PAYMENT_TERMS.includes(paymentTerms)) {
    return NextResponse.json({ error: 'Please select a valid payment terms option.' }, { status: 400 });
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
  }

  const lines = [];
  for (let i = 0; i < body.lines.length; i++) {
    const raw = body.lines[i];
    const sku = String(raw?.sku || '').trim();
    const quantity = Number(raw?.quantity);
    if (!sku || !Number.isFinite(quantity) || quantity < 1 || !Number.isInteger(quantity)) {
      return NextResponse.json({ error: 'Each cart line needs a valid item and a quantity of at least 1.' }, { status: 400 });
    }
    // Always re-resolve from the live published catalogue — this is the only place
    // price, name, and availability are trusted from.
    const product = await getPublishedProductBySku(sku);
    if (!product) {
      return NextResponse.json({ error: `"${sku}" is no longer available in the store. Please remove it from your cart.` }, { status: 400 });
    }
    const taxPercent = 10;
    const subtotal = quantity * product.sellingPrice;
    const lineTotal = Math.round(subtotal * (1 + taxPercent / 100) * 100) / 100;
    lines.push({
      id: `sol_${Date.now()}_${i}`,
      itemCode: product.sku,
      itemName: product.itemName,
      description: product.storeDescription,
      quantity,
      sellingPrice: product.sellingPrice,
      taxPercent,
      lineTotal,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.sellingPrice, 0);
  const taxTotal = Math.round(lines.reduce((s, l) => s + l.quantity * l.sellingPrice * (l.taxPercent / 100), 0) * 100) / 100;
  const totalValue = Math.round((subtotal + taxTotal) * 100) / 100;

  const rec = await createSalesOrder({
    customerName,
    customerEmail,
    customerPhone,
    deliveryLocation,
    paymentTerms,
    currency: 'AUD',
    lines,
    subtotal,
    taxTotal,
    totalValue,
    source: 'ONLINE_STORE',
    createdBy: customerEmail,
    status: 'DRAFT',
  });

  // FR-STORE — record each purchased item against this customer in Customer Master so
  // the owner has a searchable record of what online-store customers have ordered.
  // Only fills in a record where one doesn't already exist for this customer+item — an
  // existing row may hold a real negotiated rate, and a one-off retail price must never
  // silently overwrite that.
  try {
    const existing = await loadCustomerMasterData();
    const existingKey = (name: string, itemCode: string) => `${name.trim().toLowerCase()}::${itemCode.trim().toLowerCase()}`;
    const existingKeys = new Set(existing.map((r) => existingKey(r.customerName, r.itemCode)));
    for (const line of rec.lines) {
      if (existingKeys.has(existingKey(customerName, line.itemCode))) continue;
      await createCustomerMasterRecord({
        customerName,
        itemCode: line.itemCode,
        itemDescription: line.itemName,
        sellingPrice: line.sellingPrice,
        currency: rec.currency,
        moq: 1,
        paymentTerms,
        incoterms: 'EXW',
        leadTimeDays: 7,
      });
      existingKeys.add(existingKey(customerName, line.itemCode));
    }
  } catch (e) {
    console.warn('Customer Master record creation warning (order still succeeded):', e);
  }

  await logAuditEvent({
    action: 'SALES_ORDER_CREATED_ONLINE_STORE',
    module: 'GOVERNANCE',
    targetId: rec.id,
    payloadJson: {
      salesOrderNumber: rec.salesOrderNumber,
      customerName: rec.customerName,
      customerEmail: rec.customerEmail,
      totalValue: rec.totalValue,
      lineCount: rec.lines.length,
    },
  }).catch(() => {});

  await sendOrderConfirmationEmail(customerEmail, customerName, rec.salesOrderNumber, rec.lines, rec.totalValue, rec.currency).catch(() => {});

  return NextResponse.json({ success: true, salesOrderNumber: rec.salesOrderNumber, totalValue: rec.totalValue, currency: rec.currency });
}
