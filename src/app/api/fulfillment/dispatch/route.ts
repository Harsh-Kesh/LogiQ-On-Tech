import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dispatchOutboundOrder } from '@/lib/orders';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'WAREHOUSE')) {
    return NextResponse.json({ error: 'Unauthorized: Admin or Warehouse operator access required.' }, { status: 403 });
  }

  const { orderId, manifestId, driverName, vehicleReg, notes } = await req.json();

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required for carrier dispatch release.' }, { status: 400 });
  }

  const result = dispatchOutboundOrder(
    orderId,
    {
      manifestId,
      driverName,
      vehicleReg,
      notes,
    },
    user.email || 'operator@logiqon.com'
  );

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'ORDER_DISPATCH_RELEASE',
    module: 'WAREHOUSE_OPERATIONS',
    targetId: result.order?.id || orderId,
    payloadJson: {
      orderNumber: result.order?.orderNumber,
      manifestId: manifestId || 'AUTO_MANIFEST',
      driverName,
      warehouseCode: result.order?.warehouseCode,
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: result.message,
    order: result.order,
  });
}
