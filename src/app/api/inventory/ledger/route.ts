import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentStockLedger } from '@/lib/stock';
import { resolveVendorIdForUser } from '@/lib/api-auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const warehouse = searchParams.get('warehouse');
  const type = searchParams.get('type');
  const search = searchParams.get('search')?.toLowerCase() || '';

  let ledger = await loadPersistentStockLedger();

  // If vendor role, filter strictly to items owned by that vendor
  if (user.role === 'VENDOR') {
    const sessionVendorId = await resolveVendorIdForUser(user);
    const userComp = (user.companyName || '').toLowerCase();
    const userName = (user.name || '').toLowerCase();
    ledger = ledger.filter((l) => {
      const vName = (l.vendorName || '').toLowerCase();
      return (
        (sessionVendorId && l.vendorId === sessionVendorId) ||
        l.vendorId === user.id ||
        (userComp && vName && (vName.includes(userComp) || userComp.includes(vName))) ||
        (userName && vName && vName.includes(userName))
      );
    });
  }

  if (warehouse && warehouse !== 'ALL') {
    ledger = ledger.filter((l) => l.warehouseCode === warehouse);
  }

  if (type && type !== 'ALL') {
    ledger = ledger.filter((l) => l.movementType === type);
  }

  if (search) {
    ledger = ledger.filter(
      (l) =>
        l.itemName.toLowerCase().includes(search) ||
        l.sku.toLowerCase().includes(search) ||
        l.referenceNumber.toLowerCase().includes(search) ||
        l.binLocation.toLowerCase().includes(search) ||
        (l.reasonCode && l.reasonCode.toLowerCase().includes(search)) ||
        (l.vendorName && l.vendorName.toLowerCase().includes(search))
    );
  }

  // Sort newest first
  ledger.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    ledger,
    totalRecords: ledger.length,
  });
}
