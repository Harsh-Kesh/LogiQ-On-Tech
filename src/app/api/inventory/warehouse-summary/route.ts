import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWarehouseStockSummary } from '@/lib/stock';

// Deliberately unfiltered by vendor: this returns aggregate totals only (no item-level
// breakdown), so it's safe to expose to any authenticated role while still giving an
// accurate, warehouse-wide "how much stock/capacity is actually here" figure — unlike
// /api/inventory/stock, which is scoped to the caller's own items.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const summary = await getWarehouseStockSummary();
  return NextResponse.json({ summary });
}
