import { prisma } from './prisma';
import { loadPersistentOrders } from './orders';
import { loadSalesOrders } from './sales-orders';

export type MovementType = 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';

// Warehouse capacity is not modeled — this app tracks vendor stock quantities per
// warehouse, not physical storage layout. Every warehouse has exactly one implicit bin.
export interface StorageBin {
  id: string;
  code: string;
  zone: string;
}

export interface WarehouseLocation {
  id: string;
  code: string; // e.g. WH-SYD-01
  name: string; // e.g. Sydney Central Logistics Hub
  address: string;
  contactPerson: string;
  contactEmail: string;
  managerEmail?: string;
  bins: StorageBin[];
  createdAt: string;
}

export interface StockLedgerEntry {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  itemMasterId: string;
  sku: string;
  barcode: string;
  itemName: string;
  vendorId?: string | null;
  vendorName?: string;
  binLocation: string;
  movementType: MovementType;
  quantityDelta: number; // Positive for RECEIPT/RETURN, negative for ISSUE/ADJUSTMENT out
  referenceNumber: string; // GRN-XXXX, ISSUE-XXXX, ADJ-XXXX
  reasonCode?: string; // e.g. Inbound Vendor PO, Order Fulfilment, Damaged Goods, Cycle Count Audit
  createdById: string;
  createdByEmail: string;
  createdAt: string;
}

export interface StockOnHandItem {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  binLocation: string;
  itemMasterId: string;
  sku: string;
  barcode: string;
  itemName: string;
  categoryName?: string;
  uomCode?: string;
  vendorId?: string | null;
  vendorName?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lastMovementAt: string;
}

export interface ReconciliationReport {
  timestamp: string;
  totalLedgerRecords: number;
  totalStockItems: number;
  reconciled: boolean;
  discrepancyCount: number;
  summary: {
    totalReceipts: number;
    totalIssues: number;
    totalAdjustments: number;
    totalReturns: number;
    netStockOnHand: number;
  };
  discrepancies: Array<{
    itemMasterId: string;
    sku: string;
    warehouseId: string;
    binLocation: string;
    derivedFromLedger: number;
    recordedStock: number;
    difference: number;
  }>;
}

const DEFAULT_BIN: StorageBin = { id: 'bin_main', code: 'MAIN', zone: 'General Storage' };

export function getSeededWarehouses(): Record<string, { code: string; name: string; address: string; contactPerson: string; contactEmail: string }> {
  return {
    'WH-SYD-01': { code: 'WH-SYD-01', name: 'Sydney Central Logistics Hub', address: '12 Logistics Way, Chullora NSW 2190', contactPerson: 'Sydney Operations Desk', contactEmail: 'warehouse.syd@logiqon.com' },
    'WH-MEL-02': { code: 'WH-MEL-02', name: 'Melbourne Fulfilment Facility', address: '88 Freight Drive, Truganina VIC 3029', contactPerson: 'Melbourne Dispatch Desk', contactEmail: 'warehouse.mel@logiqon.com' },
    'WH-BNE-03': { code: 'WH-BNE-03', name: 'Brisbane Regional Depot', address: '45 Gateway Motorway, Acacia Ridge QLD 4110', contactPerson: 'Brisbane Depot Operator', contactEmail: 'warehouse.bne@logiqon.com' },
  };
}

async function ensureWarehousesSeeded() {
  const seeds = getSeededWarehouses();
  const existing = await prisma.warehouse.findMany({ where: { code: { in: Object.keys(seeds) } }, select: { code: true } });
  const existingCodes = new Set(existing.map((w) => w.code));
  const missing = Object.values(seeds).filter((w) => !existingCodes.has(w.code));
  if (missing.length === 0) return;
  await prisma.warehouse.createMany({ data: missing });
}

function toWarehouseLocation(row: { id: string; code: string; name: string; address: string; contactPerson: string | null; contactEmail: string | null; managerEmail: string | null; createdAt: Date }): WarehouseLocation {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address,
    contactPerson: row.contactPerson || '',
    contactEmail: row.contactEmail || '',
    managerEmail: row.managerEmail ?? undefined,
    bins: [DEFAULT_BIN],
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadPersistentWarehouses(): Promise<Record<string, WarehouseLocation>> {
  await ensureWarehousesSeeded();
  const rows = await prisma.warehouse.findMany({ orderBy: { code: 'asc' } });
  const result: Record<string, WarehouseLocation> = {};
  for (const row of rows) result[row.code] = toWarehouseLocation(row);
  return result;
}

export async function createWarehouse(input: { code: string; name: string; address: string; contactPerson?: string; contactEmail?: string; managerEmail?: string }): Promise<WarehouseLocation> {
  const row = await prisma.warehouse.create({
    data: {
      code: input.code,
      name: input.name,
      address: input.address,
      contactPerson: input.contactPerson,
      contactEmail: input.contactEmail,
      managerEmail: input.managerEmail,
    },
  });
  return toWarehouseLocation(row);
}

function toLedgerEntry(row: any): StockLedgerEntry {
  return {
    id: row.id,
    warehouseId: row.warehouse?.code || row.warehouseId,
    warehouseCode: row.warehouse?.code || row.warehouseId,
    warehouseName: row.warehouse?.name || '',
    itemMasterId: row.itemMasterId,
    sku: row.sku || row.itemMaster?.sku || '',
    barcode: row.barcode || row.itemMaster?.barcode || '',
    itemName: row.itemName || row.itemMaster?.itemName || '',
    vendorId: row.vendorId,
    vendorName: row.vendorName ?? undefined,
    binLocation: row.binLocation,
    movementType: row.movementType as MovementType,
    quantityDelta: row.quantityDelta,
    referenceNumber: row.referenceNumber,
    reasonCode: row.reasonCode ?? undefined,
    createdById: row.createdById || '',
    createdByEmail: row.createdByEmail || row.createdBy?.email || '',
    createdAt: row.createdAt.toISOString(),
  };
}

const LEDGER_INCLUDE = { warehouse: true, itemMaster: true, createdBy: true } as const;

export async function loadPersistentStockLedger(): Promise<StockLedgerEntry[]> {
  const rows = await prisma.stockLedger.findMany({ include: LEDGER_INCLUDE, orderBy: { createdAt: 'asc' } });
  return rows.map(toLedgerEntry);
}

/**
 * IMMUTABLE LEDGER APPEND WRITER
 * Appends a new movement row to the ledger. Rows can NEVER be edited or deleted.
 */
export async function addStockLedgerEntry(entry: Omit<StockLedgerEntry, 'id' | 'createdAt'>): Promise<StockLedgerEntry> {
  // Resolve the warehouse by code (creating it isn't this function's job — every caller
  // works off an already-registered warehouse). Falls back gracefully if not found so a
  // stock movement is never silently lost over a warehouse lookup mismatch.
  const warehouse = await prisma.warehouse.findFirst({ where: { code: entry.warehouseCode } });

  // createdById must reference a real User row if set at all — several call sites still
  // pass placeholder ids ('usr_wh_operator', 'system') from before every actor was a
  // real Prisma user; verify first rather than letting the FK constraint reject the
  // whole stock movement over an unresolvable audit-trail id.
  let createdById: string | null = null;
  if (entry.createdById) {
    const user = await prisma.user.findUnique({ where: { id: entry.createdById } });
    if (user) createdById = user.id;
  }

  const row = await prisma.stockLedger.create({
    data: {
      warehouseId: warehouse?.id || entry.warehouseId,
      itemMasterId: entry.itemMasterId,
      sku: entry.sku,
      barcode: entry.barcode,
      itemName: entry.itemName,
      vendorId: entry.vendorId || null,
      vendorName: entry.vendorName,
      binLocation: entry.binLocation,
      movementType: entry.movementType,
      quantityDelta: entry.quantityDelta,
      referenceNumber: entry.referenceNumber,
      reasonCode: entry.reasonCode,
      createdById,
      createdByEmail: entry.createdByEmail,
    },
    include: LEDGER_INCLUDE,
  });
  return toLedgerEntry(row);
}

/**
 * DERIVED STOCK ON HAND CALCULATOR
 * Evaluates sum(quantityDelta) for every item, warehouse, and bin location.
 */
export async function calculateStockOnHand(): Promise<StockOnHandItem[]> {
  const ledger = await loadPersistentStockLedger();
  const stockMap = new Map<string, StockOnHandItem>();
  const orders = await loadPersistentOrders();
  const reservedMap = new Map<string, number>();

  for (const order of orders) {
    if (order.status === 'IN_PICKING' || order.status === 'PICKED') {
      if (order.pickSteps) {
        for (const step of order.pickSteps) {
          const key = `${order.warehouseCode}___${step.binLocation}___${step.itemMasterId}`;
          reservedMap.set(key, (reservedMap.get(key) || 0) + step.quantityToPick);
        }
      }
    }
  }

  // Also reserve from ALLOCATED or PARTIALLY_ALLOCATED Sales Orders at the warehouse level.
  // PARTIALLY_DISPATCHED belongs here too — a line's allocation can span multiple
  // warehouses on separate dispatch notes, so an order sitting there still has at least
  // one warehouse's undispatched share that must stay reserved (not up for grabs by
  // another order's allocation) until every warehouse has actually shipped.
  const soReservations = new Map<string, number>(); // key: warehouseCode___sku
  const salesOrders = await loadSalesOrders();
  for (const so of salesOrders) {
    if (['PARTIALLY_ALLOCATED', 'ALLOCATED', 'PARTIALLY_DISPATCHED', 'READY_FOR_DISPATCH'].includes(so.status)) {
      for (const line of so.lines) {
        if (line.allocatedWarehouses) {
          for (const aw of line.allocatedWarehouses) {
            const k = `${aw.warehouseCode}___${line.itemCode}`;
            soReservations.set(k, (soReservations.get(k) || 0) + aw.qty);
          }
        }
      }
    }
  }

  for (const row of ledger) {
    const key = `${row.warehouseCode}___${row.binLocation}___${row.itemMasterId}`;
    let existing = stockMap.get(key);

    if (!existing) {
      existing = {
        warehouseId: row.warehouseId,
        warehouseCode: row.warehouseCode,
        warehouseName: row.warehouseName,
        binLocation: row.binLocation,
        itemMasterId: row.itemMasterId,
        sku: row.sku,
        barcode: row.barcode,
        itemName: row.itemName,
        vendorId: row.vendorId || null,
        vendorName: row.vendorName || (row.vendorId ? 'Vendor Partner' : 'LogiQ-On Internal Stock'),
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
        lastMovementAt: row.createdAt,
      };
    }

    existing.quantityOnHand += row.quantityDelta;
    if (new Date(row.createdAt) > new Date(existing.lastMovementAt)) {
      existing.lastMovementAt = row.createdAt;
    }

    // Keep non-negative (guard against software glitches)
    if (existing.quantityOnHand < 0) existing.quantityOnHand = 0;
    existing.quantityReserved = reservedMap.get(key) || 0;
    existing.quantityAvailable = Math.max(0, existing.quantityOnHand - existing.quantityReserved);

    stockMap.set(key, existing);
  }

  // Deduct warehouse-level Sales Order reservations dynamically from the bins
  const stockItems = Array.from(stockMap.values());
  for (const [key, reservedQty] of soReservations.entries()) {
    const [whCode, sku] = key.split('___');
    let remainingToReserve = reservedQty;

    const matchingBins = stockItems.filter(s => s.warehouseCode === whCode && s.sku === sku);

    // Pass 1: Try to deduct from bins with available qty
    for (const bin of matchingBins) {
      if (remainingToReserve <= 0) break;
      const canTake = Math.min(bin.quantityAvailable, remainingToReserve);
      if (canTake > 0) {
        bin.quantityReserved += canTake;
        bin.quantityAvailable -= canTake;
        remainingToReserve -= canTake;
      }
    }

    // Pass 2: If somehow we oversold (ATP negative), force deduct from the first bin to keep math honest
    if (remainingToReserve > 0 && matchingBins.length > 0) {
      matchingBins[0].quantityReserved += remainingToReserve;
      matchingBins[0].quantityAvailable -= remainingToReserve;
    }
  }

  return stockItems;
}

/**
 * MATHEMATICAL AUDIT RECONCILIATION SOLVER
 * Compares current stock on hand against sum of ledger movements.
 */
export async function reconcileStockLedger(): Promise<ReconciliationReport> {
  const ledger = await loadPersistentStockLedger();
  const calculatedStock = await calculateStockOnHand();

  let totalReceipts = 0;
  let totalIssues = 0;
  let totalAdjustments = 0;
  let totalReturns = 0;
  let netStockOnHand = 0;

  // Compute ledger-derived stock per warehouse+bin+item
  const ledgerStockMap = new Map<string, number>();
  for (const row of ledger) {
    netStockOnHand += row.quantityDelta;
    if (row.movementType === 'RECEIPT') totalReceipts += row.quantityDelta;
    else if (row.movementType === 'ISSUE') totalIssues += Math.abs(row.quantityDelta);
    else if (row.movementType === 'ADJUSTMENT') totalAdjustments += row.quantityDelta;
    else if (row.movementType === 'RETURN') totalReturns += row.quantityDelta;
    else if (row.movementType === 'TRANSFER') totalAdjustments += row.quantityDelta;

    const key = `${row.warehouseCode}___${row.binLocation}___${row.itemMasterId}`;
    ledgerStockMap.set(key, (ledgerStockMap.get(key) || 0) + row.quantityDelta);
  }

  // Compare against calculated stock on hand and detect discrepancies
  const discrepancies: Array<{ itemMasterId: string; sku: string; warehouseId: string; binLocation: string; derivedFromLedger: number; recordedStock: number; difference: number }> = [];
  for (const stockItem of calculatedStock) {
    const key = `${stockItem.warehouseCode}___${stockItem.binLocation}___${stockItem.itemMasterId}`;
    const ledgerQty = ledgerStockMap.get(key) || 0;
    const actualQty = stockItem.quantityOnHand;
    // Note: quantityOnHand is clamped to 0, so discrepancy is when ledger shows negative but display shows 0
    if (Math.abs(ledgerQty - actualQty) > 0.001) {
      discrepancies.push({
        itemMasterId: stockItem.itemMasterId,
        sku: stockItem.sku,
        warehouseId: stockItem.warehouseCode,
        binLocation: stockItem.binLocation,
        derivedFromLedger: ledgerQty,
        recordedStock: actualQty,
        difference: actualQty - ledgerQty,
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalLedgerRecords: ledger.length,
    totalStockItems: calculatedStock.length,
    reconciled: discrepancies.length === 0,
    discrepancyCount: discrepancies.length,
    summary: {
      totalReceipts,
      totalIssues,
      totalAdjustments,
      totalReturns,
      netStockOnHand,
    },
    discrepancies,
  };
}

/**
 * Per-warehouse totals computed from the FULL, unfiltered ledger — used anywhere a
 * warehouse's overall stock/capacity needs to be shown correctly regardless of which
 * vendor is viewing. Item-level views are vendor-scoped (see /api/inventory/stock), but
 * "how much stock is physically in this warehouse" is a shared, warehouse-wide fact and
 * must not be understated by only counting one vendor's slice of it.
 */
export async function getWarehouseStockSummary(): Promise<Record<string, { totalQty: number; itemCount: number }>> {
  const stock = await calculateStockOnHand();
  const summary: Record<string, { totalQty: number; itemCount: number }> = {};
  const itemSets: Record<string, Set<string>> = {};

  for (const row of stock) {
    if (!summary[row.warehouseCode]) {
      summary[row.warehouseCode] = { totalQty: 0, itemCount: 0 };
      itemSets[row.warehouseCode] = new Set();
    }
    summary[row.warehouseCode].totalQty += row.quantityOnHand;
    itemSets[row.warehouseCode].add(row.itemMasterId);
  }

  for (const code of Object.keys(summary)) {
    summary[code].itemCount = itemSets[code].size;
  }

  return summary;
}

/**
 * Returns the single implicit storage bin for a warehouse. Warehouse capacity is not
 * modeled in this app, so there is nothing to optimize against — every warehouse has
 * exactly one bin that all of its stock lives in.
 */
export async function getDefaultBinForWarehouse(warehouseCode: string): Promise<StorageBin | null> {
  const warehouse = await prisma.warehouse.findFirst({ where: { code: warehouseCode } });
  if (!warehouse) return null;
  return DEFAULT_BIN;
}
