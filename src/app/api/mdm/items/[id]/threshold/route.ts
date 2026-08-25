import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateItemThreshold } from '@/lib/products';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'WAREHOUSE' && user.role !== 'MDM')) {
    return NextResponse.json({ error: 'Unauthorized: Admin, Warehouse, or MDM role required.' }, { status: 403 });
  }

  const productId = params.id;
  const { lowStockThreshold, reorderQuantity } = await req.json();

  const threshold = parseInt(lowStockThreshold, 10);
  const reorderQty = parseInt(reorderQuantity, 10) || 50;

  if (isNaN(threshold) || threshold < 0) {
    return NextResponse.json({ error: 'Valid non-negative low stock threshold number is required.' }, { status: 400 });
  }

  const updatedProduct = updateItemThreshold(productId, threshold, reorderQty);

  if (!updatedProduct) {
    return NextResponse.json({ error: `Product item '${productId}' not found.` }, { status: 404 });
  }

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'UPDATE_ITEM_SAFETY_THRESHOLD',
    module: 'MASTER_DATA_MDM',
    targetId: updatedProduct.id,
    payloadJson: {
      sku: updatedProduct.sku,
      lowStockThreshold: threshold,
      reorderQuantity: reorderQty,
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `Safety stock threshold for '${updatedProduct.itemName}' (${updatedProduct.sku}) updated to ${threshold} units!`,
    product: updatedProduct,
  });
}
