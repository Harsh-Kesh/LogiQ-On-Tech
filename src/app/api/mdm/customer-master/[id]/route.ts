import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateCustomerMasterRecord, deleteCustomerMasterRecord } from '@/lib/customer-master';
import { logAuditEvent } from '@/lib/audit';

function authorised(user: any) {
  return user && (user.role === 'PLATFORM_OWNER' || user.role === 'MDM');
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!authorised(user)) return NextResponse.json({ error: 'Unauthorized: Owner or MDM role required.' }, { status: 403 });

  try {
    const body = await req.json();
    const patch: any = {};
    ['customerName', 'itemCode', 'itemDescription', 'currency', 'paymentTerms'].forEach((k) => {
      if (body[k] !== undefined) patch[k] = String(body[k]).trim();
    });
    ['sellingPrice', 'moq'].forEach((k) => {
      if (body[k] !== undefined) {
        const n = Number(body[k]);
        if (Number.isNaN(n) || n < 0) throw new Error(`${k} must be a non-negative number.`);
        patch[k] = n;
      }
    });
    if (patch.currency) patch.currency = patch.currency.toUpperCase();

    const rec = updateCustomerMasterRecord(params.id, patch);
    if (!rec) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'CUSTOMER_MASTER_UPDATED',
      module: 'MASTER_DATA_MDM',
      targetId: params.id,
      payloadJson: patch,
    }).catch(() => {});

    return NextResponse.json({ success: true, record: rec });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update record.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!authorised(user)) return NextResponse.json({ error: 'Unauthorized: Owner or MDM role required.' }, { status: 403 });

  const ok = deleteCustomerMasterRecord(params.id);
  if (!ok) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'CUSTOMER_MASTER_DELETED',
    module: 'MASTER_DATA_MDM',
    targetId: params.id,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
