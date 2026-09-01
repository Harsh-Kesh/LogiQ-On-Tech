import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyStockMovement } from '@/lib/stock-adjust';
import { isVendorApproved } from '@/lib/api-auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized: Platform Owner or Vendor access required.' }, { status: 403 });
  }
  if (!(await isVendorApproved(user))) {
    return NextResponse.json({ error: 'Your vendor registration must be approved by the Platform Owner before you can adjust stock.' }, { status: 403 });
  }

  const { itemMasterId, warehouseCode, movementType, quantity, referenceNumber, reasonCode } = await req.json();

  const result = await applyStockMovement(user, { itemMasterId, warehouseCode, movementType, quantity, referenceNumber, reasonCode });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, message: result.message, ledgerEntry: result.ledgerEntry });
}
