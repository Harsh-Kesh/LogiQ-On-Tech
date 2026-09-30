import { NextResponse } from 'next/server';
import { runWarrantyCheck } from '@/lib/warranty';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runWarrantyCheck();
  return NextResponse.json(result);
}
