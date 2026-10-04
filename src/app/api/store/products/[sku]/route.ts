export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPublishedProductBySku } from '@/lib/store-catalog';

export async function GET(_req: Request, { params }: { params: { sku: string } }) {
  try {
    const product = await getPublishedProductBySku(params.sku);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product });
  } catch (err) {
    console.error('[store/products/[sku]]', err);
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 });
  }
}
