import { NextResponse } from 'next/server';
import { getPublishedProducts } from '@/lib/store-catalog';

// Public, unauthenticated — lists published products, optionally filtered by category
// slug. Response fields are already sanitised in store-catalog.ts (no cost price, no
// vendor identity, no internal notes).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const products = await getPublishedProducts(category);
  return NextResponse.json({ products });
}
