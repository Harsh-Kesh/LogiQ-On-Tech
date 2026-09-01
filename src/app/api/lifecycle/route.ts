import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllowedTransitions, EntityType } from '@/lib/lifecycle';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get('entity') as EntityType | null;
  const from = searchParams.get('from');

  if (!entity || !from) {
    return NextResponse.json({ error: 'Query params entity and from are required.' }, { status: 400 });
  }

  const allowed = getAllowedTransitions(entity, from);
  return NextResponse.json({ entity, from, allowed });
}
