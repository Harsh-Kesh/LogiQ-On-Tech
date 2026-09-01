import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadCustomerMasterData, createCustomerMasterBatch } from '@/lib/customer-master';
import { logAuditEvent } from '@/lib/audit';

import { MDM_ROLES, isRoleIn } from '@/lib/api-auth';
function authorised(user: any) {
  return isRoleIn(user, MDM_ROLES);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ records: await loadCustomerMasterData() });
}

function parseLine(body: any) {
  const required = ['itemCode', 'itemDescription', 'sellingPrice', 'moq', 'incoterms'];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === '') {
      throw new Error(`Field '${k}' is required for item '${body.itemCode || '(unnamed)'}'.`);
    }
  }
  const sellingPrice = Number(body.sellingPrice);
  const moq = Number(body.moq);
  if (Number.isNaN(sellingPrice) || sellingPrice < 0) throw new Error(`sellingPrice must be a non-negative number for item '${body.itemCode}'.`);
  if (Number.isNaN(moq) || moq < 0) throw new Error(`moq must be a non-negative number for item '${body.itemCode}'.`);

  return {
    itemCode: String(body.itemCode).trim(),
    customerItemCode: body.customerItemCode ? String(body.customerItemCode).trim() : undefined,
    itemDescription: String(body.itemDescription).trim(),
    sellingPrice,
    moq,
    incoterms: String(body.incoterms).trim(),
  };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!authorised(user)) return NextResponse.json({ error: 'Unauthorized: Owner or MDM role required.' }, { status: 403 });

  try {
    const body = await req.json();
    if (!body.customerName) return NextResponse.json({ error: `Field 'customerName' is required.` }, { status: 400 });
    if (!body.currency) return NextResponse.json({ error: `Field 'currency' is required.` }, { status: 400 });
    if (!body.paymentTerms) return NextResponse.json({ error: `Field 'paymentTerms' is required.` }, { status: 400 });
    if (body.leadTimeDays === undefined || body.leadTimeDays === null || body.leadTimeDays === '') {
      return NextResponse.json({ error: `Field 'leadTimeDays' is required.` }, { status: 400 });
    }
    const leadTimeDaysNum = Number(body.leadTimeDays);
    if (Number.isNaN(leadTimeDaysNum) || leadTimeDaysNum < 0) {
      return NextResponse.json({ error: `leadTimeDays must be a non-negative number.` }, { status: 400 });
    }

    // A customer can be added with any number of item price agreements in one go —
    // the customer identity/terms are entered once and shared across every line, so
    // the same customer can never end up fragmented across mismatched records.
    const lineInputs: any[] = Array.isArray(body.lines) && body.lines.length > 0 ? body.lines : [body];
    const parsedLines = lineInputs.map(parseLine);

    const { records, matchedExistingCustomer } = await createCustomerMasterBatch({
      customerName: body.customerName,
      currency: body.currency,
      paymentTerms: body.paymentTerms,
      leadTimeDays: leadTimeDaysNum,
      lines: parsedLines,
    });

    await logAuditEvent({
      userId: user.id,
      role: user.role,
      action: 'CUSTOMER_MASTER_CREATED',
      module: 'MASTER_DATA_MDM',
      targetId: records[0].id,
      payloadJson: { customerName: records[0].customerName, itemCount: records.length, itemCodes: records.map((r) => r.itemCode), matchedExistingCustomer },
    }).catch(() => {});

    return NextResponse.json({ success: true, record: records[0], records, matchedExistingCustomer });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create customer master record.' }, { status: 500 });
  }
}
