import { NextResponse } from 'next/server';
import { checkDispatchedShipments } from '@/lib/tracking';

// Daily: ask each dispatched order's courier whether it has been delivered.
// Vercel cron invokes GET with the Authorization header set to CRON_SECRET.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await checkDispatchedShipments());
}
