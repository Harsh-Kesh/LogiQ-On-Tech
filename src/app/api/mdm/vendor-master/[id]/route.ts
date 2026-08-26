import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateVendorMasterRecord, deleteVendorMasterRecord } from '@/lib/vendor-master';
import { logAuditEvent } from '@/lib/audit';

import { MDM_ROLES, isRoleIn } from '@/lib/api-auth';
const AUTH_ROLES = [...MDM_ROLES, 'SALES_OPS' as const, 'FINANCE' as const];
function authorised(user: any) {
  return isRoleIn(user, AUTH_ROLES);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!authorised(user)) return NextResponse.json({ error: 'Unauthorized: Owner or MDM role required.' }, { status: 403 });

  try {
    const body = await req.json();
    const patch: any = {};
    ['vendorName', 'itemCode', 'itemDescription', 'currency', 'paymentTerms'].forEach((k) => {
      if (body[k] !== undefined) patch[k] = String(body[k]).trim();
    });
    ['purchasePrice', 'moq', 'leadTimeDays'].forEach((k) => {
      if (body[k] !== undefined) {
        const n = Number(body[k]);
        if (Number.isNaN(n) || n < 0) throw new Error(`${k} must be a non-negative number.`);
        patch[k] = n;
      }
    });
    if (patch.currency) patch.currency = patch.currency.toUpperCase();

    const rec = updateVendorMasterRecord(params.id, patch);
    if (!rec) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'VENDOR_MASTER_UPDATED',
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

  const ok = deleteVendorMasterRecord(params.id);
  if (!ok) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'VENDOR_MASTER_DELETED',
    module: 'MASTER_DATA_MDM',
    targetId: params.id,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
