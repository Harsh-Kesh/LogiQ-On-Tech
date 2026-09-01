import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateStockOnHand, reconcileStockLedger } from '@/lib/stock';
import { resolveVendorIdForUser } from '@/lib/api-auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const warehouseCode = searchParams.get('warehouse');
  const search = searchParams.get('search')?.toLowerCase() || '';

  let stockList = await calculateStockOnHand();
  const reconciliation = await reconcileStockLedger();

  // If vendor role, filter strictly to items owned by that vendor
  if (user.role === 'VENDOR') {
    const sessionVendorId = await resolveVendorIdForUser(user);
    const userComp = (user.companyName || '').toLowerCase();
    const userName = (user.name || '').toLowerCase();
    stockList = stockList.filter((s) => {
      const vName = (s.vendorName || '').toLowerCase();
      return (
        (sessionVendorId && s.vendorId === sessionVendorId) ||
        s.vendorId === user.id ||
        (userComp && vName && (vName.includes(userComp) || userComp.includes(vName))) ||
        (userName && vName && vName.includes(userName))
      );
    });
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
