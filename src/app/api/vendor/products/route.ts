import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loadPersistentProducts } from '@/lib/products';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'VENDOR' && user.role !== 'PLATFORM_OWNER')) {
    return NextResponse.json({ error: 'Unauthorized: Vendor or Admin access required.' }, { status: 403 });
  }

  let vendorId: string | null = null;
  if (user.role === 'VENDOR') {
    const dbUser = await prisma.user.findUnique({ where: { email: (user.email || '').toLowerCase().trim() }, include: { vendor: true } });
    vendorId = dbUser?.vendor?.id || null;
  }

  const allProducts = await loadPersistentProducts();
  const productList = Object.values(allProducts).filter((p) => user.role === 'PLATFORM_OWNER' || p.vendorId === vendorId);

  return NextResponse.json({ products: productList });
}
