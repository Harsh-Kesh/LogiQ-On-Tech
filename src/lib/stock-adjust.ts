import { loadPersistentProducts } from './products';
import { addStockLedgerEntry, loadPersistentWarehouses, MovementType, calculateStockOnHand } from './stock';
import { logAuditEvent } from './audit';
import { resolveVendorIdForUser } from './api-auth';

export interface StockMovementInput {
  itemMasterId: string; // item id, or SKU — resolved against Item Master either way
  warehouseCode: string;
  movementType: string;
  quantity: number | string;
  referenceNumber?: string;
  reasonCode?: string;
}

export interface StockMovementResult {
  success: boolean;
  status: number;
  error?: string;
  message?: string;
  ledgerEntry?: Awaited<ReturnType<typeof addStockLedgerEntry>>;
}

// Shared by the single-row adjust endpoint and the GRN bulk-import endpoint so both
// enforce identical vendor ownership, warehouse resolution, and negative-stock guards —
// a bulk import is just N of these applied in a loop, not a separate code path.
export async function applyStockMovement(
  user: any,
  input: StockMovementInput
): Promise<StockMovementResult> {
  const qty = parseInt(String(input.quantity), 10);
  const rawType = (input.movementType || '').toString().trim().toUpperCase();

  if (isNaN(qty) || qty <= 0) {
    return { success: false, status: 400, error: 'Valid positive Quantity is required.' };
  }

  if (!input.itemMasterId || !input.warehouseCode || !rawType) {
    return { success: false, status: 400, error: 'Item Master, Warehouse, and Valid Movement Type are required.' };
  }

  if (!['ISSUE', 'ADJUSTMENT', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB', 'RETURN', 'RECEIPT'].includes(rawType)) {
    return { success: false, status: 400, error: 'Invalid Movement Type provided.' };
  }

  const persistentProducts = await loadPersistentProducts();
  const item = persistentProducts[input.itemMasterId] || Object.values(persistentProducts).find((p) => p.id === input.itemMasterId || p.sku === input.itemMasterId);

  if (!item) {
    return { success: false, status: 404, error: `Item Master record '${input.itemMasterId}' not found.` };
  }

  // Vendor ownership guard: Vendors can ONLY adjust stock for items they own
  if (user.role === 'VENDOR') {
    const sessionVendorId = await resolveVendorIdForUser(user);
    const isOwnItem =
      (sessionVendorId && item.vendorId === sessionVendorId) ||
      item.vendorId === user.id ||
      item.vendorEmail === user.email ||
      (user.companyName && item.vendorName && item.vendorName.toLowerCase() === user.companyName.toLowerCase());

    if (!isOwnItem) {
      return {
        success: false,
        status: 403,
        error: `Forbidden: You can only manage and adjust stock for your own assigned products (${item.vendorName || 'Other Vendor'}).`,
      };
    }
  }

  const persistentWarehouses = await loadPersistentWarehouses();
  const wh = persistentWarehouses[input.warehouseCode.trim().toUpperCase()] || Object.values(persistentWarehouses).find((w) => w.code === input.warehouseCode || w.id === input.warehouseCode);

  if (!wh) {
    return { success: false, status: 404, error: `Warehouse Location '${input.warehouseCode}' not found.` };
  }

  // Warehouse capacity/layout is not modeled — every warehouse has exactly one implicit bin.
  const binLocation = wh.bins[0]?.code || 'MAIN';

  let finalType: MovementType = 'ADJUSTMENT';
  let delta = 0;

  if (rawType === 'ISSUE') {
    finalType = 'ISSUE';
    delta = -Math.abs(qty);
  } else if (rawType === 'ADJUSTMENT_SUB') {
    finalType = 'ADJUSTMENT';
    delta = -Math.abs(qty);
  } else if (rawType === 'ADJUSTMENT_ADD') {
    finalType = 'ADJUSTMENT';
    delta = Math.abs(qty);
  } else if (rawType === 'RETURN') {
    finalType = 'RETURN';
    delta = Math.abs(qty);
  } else if (rawType === 'RECEIPT') {
    finalType = 'RECEIPT';
    delta = Math.abs(qty);
  } else {
    finalType = 'ADJUSTMENT';
    delta = qty;
  }

  // M-10: Negative stock guard for downward movements
  if (delta < 0) {
    const stockOnHand = await calculateStockOnHand();
    const binStock = stockOnHand.find(
      (s) => s.warehouseCode === wh.code && s.binLocation === binLocation && (s.itemMasterId === item.id || s.sku === item.sku)
    );
    const currentQty = binStock?.quantityOnHand || 0;
    if (currentQty + delta < 0) {
      return {
        success: false,
        status: 400,
        error: `Insufficient stock: ${item.sku} has ${currentQty} units in ${wh.code}. Cannot deduct ${Math.abs(delta)} units.`,
      };
    }
  }

  const ref = input.referenceNumber && input.referenceNumber.trim() !== ''
    ? input.referenceNumber.trim().toUpperCase()
    : `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const ledgerRow = await addStockLedgerEntry({
    warehouseId: wh.id,
    warehouseCode: wh.code,
    warehouseName: wh.name,
    itemMasterId: item.id,
    sku: item.sku,
    barcode: item.barcode,
    itemName: item.itemName,
    vendorId: item.vendorId || null,
    vendorName: item.vendorName || (item.vendorId ? 'Vendor Partner' : 'LogiQ-On Internal Stock'),
    binLocation,
    movementType: finalType,
    quantityDelta: delta,
    referenceNumber: ref,
    reasonCode: input.reasonCode || `Manual Stock Adjustment (${finalType})`,
    createdById: user.id,
    createdByEmail: user.email,
  });

  await logAuditEvent({
    userId: user.id,
    role: user.role,
    action: `STOCK_${finalType}`,
    module: 'WAREHOUSE_OPERATIONS',
    targetId: ledgerRow.id,
    payloadJson: {
      ref,
      type: rawType,
      delta,
      sku: item.sku,
      warehouseCode: wh.code,
      binLocation: ledgerRow.binLocation,
      reasonCode: ledgerRow.reasonCode,
    },
  }).catch(() => {});

  return {
    success: true,
    status: 200,
    message: `Stock movement '${rawType}' logged. Ledger row created with delta ${delta > 0 ? '+' : ''}${delta}. Reference: ${ref}`,
    ledgerEntry: ledgerRow,
  };
}
