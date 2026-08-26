import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  loadCustomerMasterData,
  createCustomerMasterRecord,
  CustomerMasterRecord,
} from '@/lib/customer-master';
import { logAuditEvent } from '@/lib/audit';

import { MDM_ROLES, isRoleIn } from '@/lib/api-auth';
const AUTH_ROLES = [...MDM_ROLES, 'SALES_OPS' as const, 'FINANCE' as const];
function authorised(user: any) {
  return isRoleIn(user, AUTH_ROLES);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ records: loadCustomerMasterData() });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!authorised(user)) return NextResponse.json({ error: 'Unauthorized: Owner or MDM role required.' }, { status: 403 });

  try {
    const body = await req.json();
    const required: Array<keyof CustomerMasterRecord> = ['customerName', 'itemCode', 'itemDescription', 'sellingPrice', 'currency', 'moq', 'paymentTerms'];
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === '') {
        return NextResponse.json({ error: `Field '${String(k)}' is required.` }, { status: 400 });
      }
    }

    const sellingPrice = Number(body.sellingPrice);
    const moq = Number(body.moq);
    if (Number.isNaN(sellingPrice) || sellingPrice < 0) return NextResponse.json({ error: 'sellingPrice must be a non-negative number.' }, { status: 400 });
    if (Number.isNaN(moq) || moq < 0) return NextResponse.json({ error: 'moq must be a non-negative number.' }, { status: 400 });

    const rec = createCustomerMasterRecord({
      customerName: String(body.customerName).trim(),
      itemCode: String(body.itemCode).trim(),
      itemDescription: String(body.itemDescription).trim(),
      sellingPrice,
      currency: String(body.currency).trim().toUpperCase(),
      moq,
      paymentTerms: String(body.paymentTerms).trim(),
    });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'CUSTOMER_MASTER_CREATED',
      module: 'MASTER_DATA_MDM',
      targetId: rec.id,
      payloadJson: rec,
    }).catch(() => {});

    return NextResponse.json({ success: true, record: rec });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create customer master record.' }, { status: 500 });
  }
}
