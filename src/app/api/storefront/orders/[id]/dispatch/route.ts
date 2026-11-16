// Owner action for a BILL_CREATED order whose supplier invoice had no (readable) tracking
// number: enter it here to email the customer and mark the order dispatched.
// POST { trackingNumber, carrier?, dispatchDate? (YYYY-MM-DD) }

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { dispatchOrder } from '@/lib/dispatch';

const Body = z.object({
  trackingNumber: z.string().trim().min(3).max(60),
  carrier: z.string().trim().max(60).optional(),
  dispatchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (user?.role !== 'PLATFORM_OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A tracking number is required.' }, { status: 400 });
  const { trackingNumber, carrier, dispatchDate } = parsed.data;

  try {
    const result = await dispatchOrder(params.id, {
      trackingNumber,
      carrier,
      dispatchDate: dispatchDate ? new Date(dispatchDate) : undefined,
      actor: { userId: user.id, role: user.role },
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Dispatch failed' }, { status: 422 });
  }
}
