import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getPublishedProductBySku } from '@/lib/store-catalog';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const customerName = String(body.customerName || '').trim();
  const customerEmail = String(body.customerEmail || '').trim();
  const customerPhone = body.customerPhone ? String(body.customerPhone).trim() : '';
  const deliveryAddress = String(body.deliveryAddress || '').trim();

  if (!customerName) return NextResponse.json({ error: 'Your name is required.' }, { status: 400 });
  if (!customerEmail || !EMAIL_RE.test(customerEmail)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }
  if (!deliveryAddress) return NextResponse.json({ error: 'A delivery address is required.' }, { status: 400 });
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
  }

  // Re-resolve every price server-side — never trust client-submitted amounts.
  const lineItems: { price_data: any; quantity: number }[] = [];
  const resolvedLines: { sku: string; itemName: string; manufacturerCode?: string; supplierItemCode?: string; quantity: number; unitPrice: number; taxPercent: number }[] = [];

  for (const raw of body.lines) {
    const sku = String(raw?.sku || '').trim();
    const quantity = Number(raw?.quantity);
    if (!sku || !Number.isFinite(quantity) || quantity < 1 || !Number.isInteger(quantity)) {
      return NextResponse.json({ error: 'Each cart line needs a valid item and quantity of at least 1.' }, { status: 400 });
    }

    const product = await getPublishedProductBySku(sku);
    if (!product) {
      return NextResponse.json({ error: `"${sku}" is no longer available in the store.` }, { status: 400 });
    }

    // Price in Stripe is in cents (integer). Include GST (10%) in the unit amount.
    const unitPriceExGst = product.sellingPrice;
    const unitPriceIncGst = Math.round(unitPriceExGst * 1.1 * 100); // cents

    lineItems.push({
      price_data: {
        currency: 'aud',
        product_data: {
          name: product.itemName,
          description: product.storeDescription?.slice(0, 500) || undefined,
          images: product.storeImages?.slice(0, 1) || [],
          metadata: { sku },
        },
        unit_amount: unitPriceIncGst,
      },
      quantity,
    });

    resolvedLines.push({
      sku,
      itemName: product.itemName,
      quantity,
      unitPrice: unitPriceExGst,
      taxPercent: 10,
    });
  }

  // Pass customer info as metadata so the webhook can reconstruct the order
  // without a round-trip to our DB (keeps the webhook handler simple + idempotent).
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer_email: customerEmail,
    metadata: {
      customerName,
      customerPhone,
      deliveryAddress,
      // Compact line data: sku|qty|unitPrice|taxPct joined by newlines
      linesJson: JSON.stringify(
        resolvedLines.map((l) => ({
          sku: l.sku,
          itemName: l.itemName,
          qty: l.quantity,
          unitPrice: l.unitPrice,
          taxPercent: l.taxPercent,
        }))
      ),
    },
    payment_intent_data: {
      metadata: { customerName, customerEmail },
    },
    billing_address_collection: 'auto',
    success_url: `${APP_URL}/products/shop/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/products/shop/checkout`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
  });

  return NextResponse.json({ url: session.url });
}
