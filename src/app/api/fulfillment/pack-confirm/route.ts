import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { confirmOrderPacking } from '@/lib/orders';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'PLATFORM_OWNER' && userRole !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized: Warehouse or Platform Owner access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, packageType, grossWeightKg, courierName } = body;

    if (!orderId || !packageType || typeof grossWeightKg !== 'number') {
      return NextResponse.json({ error: 'Order ID, package type, and valid gross weight in kg are required' }, { status: 400 });
    }

    const operatorEmail = session.user.email || 'warehouse.operator@logiqon.com';

    const result = await confirmOrderPacking(
      orderId,
      {
        packageType,
        grossWeightKg,
        courierName,
      },
      operatorEmail
    );

    if (!result.success || !result.order) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    logAuditEvent({
      userId: (session.user as any).id || 'usr_wh_operator',
      role: ((session.user as any).role as any) || 'VENDOR',
      action: 'ORDER_PACK_CONFIRM',
      module: 'WAREHOUSE_OPERATIONS',
      targetId: result.order.id,
      payloadJson: {
        orderNumber: result.order.orderNumber,
        packageType,
        grossWeightKg,
        trackingNumber: result.order.packageDetails?.trackingNumber,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: result.message,
      order: result.order,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to confirm order packing' }, { status: 500 });
  }
}
