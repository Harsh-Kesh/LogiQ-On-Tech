import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPersistentOrders, createOutboundOrder, generatePickListForOrder } from '@/lib/orders';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const warehouseCode = searchParams.get('warehouseCode');
    const paramVendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');

    let orders = loadPersistentOrders();

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const userEmail = session.user.email?.toLowerCase().trim() || '';

    // Multi-tenant Scoping: If user is a VENDOR, restrict strictly to orders belonging to this vendor
    if (userRole === 'VENDOR') {
      const vendorId = `vnd_${userId}`;
      orders = orders.filter((o) => {
        const matchesId = o.vendorId && (o.vendorId === vendorId || o.vendorId === userId);
        const matchesEmail = o.vendorEmail && o.vendorEmail.toLowerCase().trim() === userEmail;
        return Boolean(matchesId || matchesEmail);
      });
    } else if (paramVendorId) {
      orders = orders.filter((o) => o.vendorId === paramVendorId);
    }

    if (warehouseCode && warehouseCode !== 'ALL' && warehouseCode !== 'UNASSIGNED') {
      orders = orders.filter((o) => o.warehouseCode === warehouseCode);
    }

    if (status && status !== 'ALL') {
      orders = orders.filter((o) => o.status === status);
    }

    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, orderId, customerName, deliveryAddress, warehouseCode, warehouseName, vendorId, vendorName, items, notes } = body;

    if (action === 'generate-pick-list') {
      if (!orderId) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      const updatedOrder = generatePickListForOrder(orderId);
      if (!updatedOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      return NextResponse.json({ success: true, message: `Pick list generated for ${updatedOrder.orderNumber}`, order: updatedOrder });
    }

    // Default: Create Outbound Order
    if (!customerName || !deliveryAddress || !warehouseCode || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required order parameters' }, { status: 400 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const resolvedVendorId = userRole === 'VENDOR' ? `vnd_${userId}` : (vendorId || userId);
    const resolvedVendorName = vendorName || (session.user as any).companyName || session.user.name || 'Vendor Partner';

    const order = createOutboundOrder({
      customerName,
      deliveryAddress,
      warehouseCode,
      warehouseName: warehouseName || warehouseCode,
      vendorId: resolvedVendorId,
      vendorName: resolvedVendorName,
      items,
      notes,
    });

    return NextResponse.json({ success: true, message: `Created Outbound Order ${order.orderNumber}`, order }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process order request' }, { status: 500 });
  }
}
