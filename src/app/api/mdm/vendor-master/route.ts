import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  loadVendorMasterData,
  createVendorMasterRecord,
  VendorMasterRecord,
} from '@/lib/vendor-master';
import { logAuditEvent } from '@/lib/audit';

// FR-MD-004 Vendor Master pricing data

function authorised(user: any) {
  return user && (user.role === 'PLATFORM_OWNER' || user.role === 'MDM');
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ records: loadVendorMasterData() });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!authorised(user)) return NextResponse.json({ error: 'Unauthorized: Owner or MDM role required.' }, { status: 403 });

  try {
    const body = await req.json();
    const required: Array<keyof VendorMasterRecord> = ['vendorName', 'itemCode', 'itemDescription', 'purchasePrice', 'currency', 'moq', 'leadTimeDays', 'paymentTerms'];
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === '') {
        return NextResponse.json({ error: `Field '${String(k)}' is required.` }, { status: 400 });
      }
    }

    const purchasePrice = Number(body.purchasePrice);
    const moq = Number(body.moq);
    const leadTimeDays = Number(body.leadTimeDays);
    if (Number.isNaN(purchasePrice) || purchasePrice < 0) return NextResponse.json({ error: 'purchasePrice must be a non-negative number.' }, { status: 400 });
    if (Number.isNaN(moq) || moq < 0) return NextResponse.json({ error: 'moq must be a non-negative number.' }, { status: 400 });
    if (Number.isNaN(leadTimeDays) || leadTimeDays < 0) return NextResponse.json({ error: 'leadTimeDays must be a non-negative number.' }, { status: 400 });

    const rec = createVendorMasterRecord({
      vendorName: String(body.vendorName).trim(),
      itemCode: String(body.itemCode).trim(),
      itemDescription: String(body.itemDescription).trim(),
      purchasePrice,
      currency: String(body.currency).trim().toUpperCase(),
      moq,
      leadTimeDays,
      paymentTerms: String(body.paymentTerms).trim(),
    });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'VENDOR_MASTER_CREATED',
      module: 'MASTER_DATA_MDM',
      targetId: rec.id,
      payloadJson: rec,
    }).catch(() => {});

    return NextResponse.json({ success: true, record: rec });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create vendor master record.' }, { status: 500 });
  }
}
