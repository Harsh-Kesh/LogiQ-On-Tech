import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { confirmOrderPacking } from '@/lib/orders';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, packageType, grossWeightKg, courierName } = body;

    if (!orderId || !packageType || typeof grossWeightKg !== 'number') {
      return NextResponse.json({ error: 'Order ID, package type, and valid gross weight in kg are required' }, { status: 400 });
    }

    const operatorEmail = session.user.email || 'warehouse.operator@logiqon.com';

    const result = confirmOrderPacking(
      orderId,
      {
        packageType,
        grossWeightKg,
        courierName,
      },
      operatorEmail
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      order: result.order,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to confirm order packing' }, { status: 500 });
  }
}
