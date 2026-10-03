import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { WarrantyStatus } from '@prisma/client';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'PLATFORM_OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { action, reason, startDate } = await req.json();
  const actorEmail = (session?.user as any)?.email || 'owner';

  const record = await prisma.warrantyRecord.findUnique({ where: { id: params.id } });
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'close') {
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A reason is required to close a warranty' }, { status: 400 });
    }
    const updated = await prisma.warrantyRecord.update({
      where: { id: params.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: actorEmail,
        overrideReason: reason.trim(),
        overriddenBy: actorEmail,
      },
    });
    return NextResponse.json({ success: true, status: updated.status });
  }

  if (action === 'set_start_date') {
    if (!startDate) {
      return NextResponse.json({ error: 'startDate is required' }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A reason is required to override the start date' }, { status: 400 });
    }

    const newStart = new Date(startDate);
    if (isNaN(newStart.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const newExpiry = new Date(newStart);
    newExpiry.setMonth(newExpiry.getMonth() + record.warrantyPeriodMonths);
    const remainingDays = Math.ceil((newExpiry.getTime() - Date.now()) / 86_400_000);

    let newStatus: WarrantyStatus = 'ACTIVE';
    if (remainingDays < 0) newStatus = 'EXPIRED';
    else if (remainingDays <= 30) newStatus = 'EXPIRING_SOON';
    else if (remainingDays <= 180) newStatus = 'FINAL_SIX_MONTHS';

    const updated = await prisma.warrantyRecord.update({
      where: { id: params.id },
      data: {
        warrantyStartDate: newStart,
        warrantyStartRule: 'INSTALLATION_DATE',
        warrantyExpiryDate: newExpiry,
        remainingDays,
        status: newStatus,
        overrideReason: reason.trim(),
        overriddenBy: actorEmail,
      },
    });

    return NextResponse.json({
      success: true,
      warrantyStartDate: updated.warrantyStartDate,
      warrantyExpiryDate: updated.warrantyExpiryDate,
      remainingDays: updated.remainingDays,
      status: updated.status,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
