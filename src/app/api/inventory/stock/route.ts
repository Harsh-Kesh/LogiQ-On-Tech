import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateStockOnHand, reconcileStockLedger } from '@/lib/stock';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const warehouseCode = searchParams.get('warehouse');
  const search = searchParams.get('search')?.toLowerCase() || '';

  let stockList = calculateStockOnHand();
  const reconciliation = reconcileStockLedger();

  // If vendor role, filter strictly to items owned by that vendor
  if (user.role === 'VENDOR') {
    stockList = stockList.filter((s) => s.vendorId === user.id || (s.vendorName && s.vendorName.toLowerCase().includes(user.name?.toLowerCase() || '')));
  }

  if (warehouseCode && warehouseCode !== 'ALL') {
    stockList = stockList.filter((s) => s.warehouseCode === warehouseCode);
  }

  if (search) {
    stockList = stockList.filter(
      (s) =>
        s.itemName.toLowerCase().includes(search) ||
        s.sku.toLowerCase().includes(search) ||
        s.barcode.toLowerCase().includes(search) ||
        s.binLocation.toLowerCase().includes(search) ||
        (s.vendorName && s.vendorName.toLowerCase().includes(search))
    );
  }

  return NextResponse.json({
    stock: stockList,
    reconciliation,
    totalRecords: stockList.length,
  });
}
