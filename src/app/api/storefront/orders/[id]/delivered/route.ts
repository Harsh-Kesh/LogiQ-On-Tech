// Owner action for a DISPATCHED order: confirm delivery (courier not tracked automatically,
// or the customer confirmed). Marks it FULFILLED, starts the warranty, emails the customer.
// POST { deliveredDate?: YYYY-MM-DD }

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { markDelivered } from '@/lib/dispatch';

const Body = z.object({ deliveredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (user?.role !== 'PLATFORM_OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid delivery date.' }, { status: 400 });

  try {
    const result = await markDelivered(params.id, {
      deliveredAt: parsed.data.deliveredDate ? new Date(`${parsed.data.deliveredDate}T00:00:00`) : undefined,
      source: 'owner',
      actor: { userId: user.id, role: user.role },
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not mark delivered' }, { status: 422 });
  }
}
