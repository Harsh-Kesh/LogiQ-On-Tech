import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentReturns, processRmaReturn } from '@/lib/returns';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const returns = loadPersistentReturns();
  return NextResponse.json({ success: true, returns });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'WAREHOUSE')) {
    return NextResponse.json({ error: 'Unauthorized: Admin or Warehouse operator access required.' }, { status: 403 });
  }

  const { rmaNumber, orderId, orderNumber, customerName, itemMasterId, warehouseCode, binLocation, quantityReturned, condition, reasonCode, notes } = await req.json();

  const qty = parseInt(quantityReturned, 10);

  if (!customerName || !itemMasterId || !warehouseCode || !binLocation || isNaN(qty) || qty <= 0 || !condition || !reasonCode) {
    return NextResponse.json({ error: 'Customer, Product Item, Warehouse, Bin, Quantity (>0), Condition, and Reason Code are required.' }, { status: 400 });
  }

  const newReturn = processRmaReturn({
    rmaNumber,
    orderId,
    orderNumber,
    customerName,
    itemMasterId,
    warehouseCode,
    binLocation,
    quantityReturned: qty,
    condition,
    reasonCode,
    notes,
    operatorEmail: user.email,
    operatorId: user.id,
  });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: `RMA_RETURN_${condition}`,
    module: 'WAREHOUSE_OPERATIONS',
    targetId: newReturn.id,
    payloadJson: {
      rmaNumber: newReturn.rmaNumber,
      sku: newReturn.sku,
      condition,
      quantityReturned: qty,
      warehouseCode: newReturn.warehouseCode,
      binLocation: newReturn.binLocation,
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `RMA Return '${newReturn.rmaNumber}' processed successfully! ${condition === 'RESTOCKABLE' ? `+${qty} units restored to pickable stock.` : `-${qty} units isolated for damaged write-off.`}`,
    rmaReturn: newReturn,
  });
}
