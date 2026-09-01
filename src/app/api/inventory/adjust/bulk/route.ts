import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyStockMovement } from '@/lib/stock-adjust';
import { logAuditEvent } from '@/lib/audit';
import { isVendorApproved } from '@/lib/api-auth';

// GRN bulk import: every row in the uploaded spreadsheet is a RECEIPT — bulk import is
// only ever used to bring in inbound stock in bulk, never deductions. Rows are applied
// sequentially (not in parallel) so ledger ordering and the negative-stock guard on any
// row stay correct relative to rows already committed earlier in the same batch.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== 'PLATFORM_OWNER' && user.role !== 'VENDOR')) {
    return NextResponse.json({ error: 'Unauthorized: Platform Owner or Vendor access required.' }, { status: 403 });
  }
  if (!(await isVendorApproved(user))) {
    return NextResponse.json({ error: 'Your vendor registration must be approved by the Platform Owner before you can import stock.' }, { status: 403 });
  }

  const { rows } = await req.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided for import.' }, { status: 400 });
  }

  if (rows.length > 500) {
    return NextResponse.json({ error: 'A single import is capped at 500 rows. Split the file and import in batches.' }, { status: 400 });
  }

  const results: Array<{ row: number; sku: string; success: boolean; error?: string }> = [];
  let succeeded = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = await applyStockMovement(user, {
      itemMasterId: row.sku,
      warehouseCode: row.warehouseCode,
      movementType: 'RECEIPT',
      quantity: row.quantity,
      referenceNumber: row.referenceNumber,
      reasonCode: row.reasonCode || 'Bulk GRN import',
    });

    if (result.success) {
      succeeded++;
      results.push({ row: i + 1, sku: row.sku, success: true });
    } else {
      results.push({ row: i + 1, sku: row.sku, success: false, error: result.error });
    }
  }

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: 'STOCK_GRN_BULK_IMPORT',
    module: 'WAREHOUSE_OPERATIONS',
    targetId: `bulk_${Date.now()}`,
    payloadJson: { totalRows: rows.length, succeeded, failed: rows.length - succeeded },
  }).catch(() => {});

  return NextResponse.json({
    success: succeeded > 0,
    message: `${succeeded} of ${rows.length} rows imported successfully.`,
    results,
  });
}
