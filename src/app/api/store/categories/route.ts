import { NextResponse } from 'next/server';
import { getPublishedCategories } from '@/lib/store-catalog';

// Public, unauthenticated — powers the storefront category cards. Never touched by
// the /dashboard auth middleware (matcher only covers /dashboard/:path*).
export async function GET() {
  const categories = await getPublishedCategories();
  return NextResponse.json({ categories });
}
