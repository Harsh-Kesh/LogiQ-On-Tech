'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Warehouse, ArrowRight, ShieldCheck, Box, CheckCircle2,
  TrendingUp, History, MapPin, UserCheck, Globe,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import WarehouseOpsTabs from '@/components/warehouse/WarehouseOpsTabs';

export default function WarehouseDashboardPage() {
  const { data: session } = useSession();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseCode, setSelectedWarehouseCode] = useState<string>('ALL');
  const [ledger, setLedger] = useState<any[]>([]);
  const [whSummary, setWhSummary] = useState<Record<string, { totalQty: number; itemCount: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouseData();
  }, []);

  useEffect(() => {
    // Default to ALL facilities
    setSelectedWarehouseCode('ALL');
  }, [session]);

  const fetchWarehouseData = async () => {
    setLoading(true);
    try {
      const [ledgerRes, whRes, summaryRes] = await Promise.all([
        fetch('/api/inventory/ledger'),
        fetch('/api/inventory/warehouses'),
        fetch('/api/inventory/warehouse-summary'),
      ]);
      const ledgerData = ledgerRes.ok ? await ledgerRes.json() : { ledger: [] };
      const whData = whRes.ok ? await whRes.json() : { warehouses: [] };
      const summaryData = summaryRes.ok ? await summaryRes.json() : { summary: {} };

      setLedger(ledgerData.ledger || []);
      setWarehouses(whData.warehouses || []);
      setWhSummary(summaryData.summary || {});
    } catch (e) {
      console.error('Failed to load warehouse data:', e);
    } finally {
      setLoading(false);
    }
  };

  const isGlobal = selectedWarehouseCode === 'ALL';

  const activeWarehouse = isGlobal
    ? {
        code: 'ALL',
        name: 'All Warehouses',
        address: 'All facility locations',
        bins: warehouses.flatMap((w) => w.bins || []),
      }
    : warehouses.find((w) => w.code === selectedWarehouseCode) || {
        code: 'WH-SYD-01',
        name: 'Sydney Central Logistics Hub',
        address: '100 Logistics Way, Eastern Creek NSW 2766',
        bins: [{ code: 'BIN-A1-01' }, { code: 'BIN-A1-02' }],
      };

  // Always reflects the logged-in user viewing this page — it shouldn't change
  // just because a different warehouse is selected in the dropdown above.
  const activeManager = {
    name: session?.user?.name || 'You',
    email: session?.user?.email || '',
  };

  const filteredLedger = isGlobal
    ? ledger
    : ledger.filter((l) => l.warehouseCode === selectedWarehouseCode);

  // Total stock/capacity numbers always reflect ALL products in the warehouse(s), not just
  // the caller's own — a vendor's slice of the stock would understate real utilization.
  const totalStockCount = isGlobal
    ? Object.values(whSummary).reduce((sum, w) => sum + w.totalQty, 0)
    : whSummary[selectedWarehouseCode]?.totalQty || 0;

  return (
    <div className="space-y-6 font-sans">
      <WarehouseOpsTabs />

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-indigo-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
            {isGlobal ? <Globe className="w-8 h-8" /> : <Warehouse className="w-8 h-8" />}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              {isGlobal ? 'ALL WAREHOUSES' : `WAREHOUSE: ${selectedWarehouseCode}`}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                {activeWarehouse.name}
              </h1>
              {!isGlobal && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs font-mono font-bold shrink-0">
                  {activeWarehouse.code}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
              <span><MapPin className="w-3.5 h-3.5 text-indigo-600 inline" /> {activeWarehouse.address}</span>
              <span>•</span>
              <span className="text-indigo-700 font-bold"><UserCheck className="w-3.5 h-3.5 inline" /> {activeManager.name}{activeManager.email ? ` (${activeManager.email})` : ''}</span>
            </p>
          </div>
        </div>

        <div className="space-y-1 shrink-0">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
            View Warehouse:
          </label>
          <select
            value={selectedWarehouseCode}
            onChange={(e) => setSelectedWarehouseCode(e.target.value)}
            className="h-[42px] px-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-600 font-mono shadow-sm w-full sm:w-auto"
          >
            <option value="ALL">🌐 All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.code} value={w.code}>
                🏬 {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">SKUs Tracked</span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {new Set(filteredLedger.map((l) => l.sku)).size} SKUs
          </div>
          <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> {isGlobal ? 'Across All Facilities' : `Active at ${activeWarehouse.code}`}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">{isGlobal ? 'Total Network Stock' : 'Facility Stock On Hand'}</span>
            <Box className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalStockCount} Units</div>
          <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled against ledger
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Stock Movements</span>
            <History className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{filteredLedger.length} Movements</div>
          <p className="text-xs text-indigo-600 font-semibold">Append-Only Ledger Rows</p>
        </div>
      </div>

      {/* Stock Movements Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            {isGlobal ? 'Recent Global Warehouse Stock Movements (All Facilities)' : `Recent Facility Stock Movements (${activeWarehouse.code})`}
          </h2>
          <Link href="/dashboard/owner/inventory" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
            View Master Ledger <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredLedger.length > 0 ? (
            filteredLedger.slice(0, 8).map((row) => (
              <div key={row.id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${row.quantityDelta > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'}`}>
                      {row.movementType}
                    </span>
                    <span>{row.itemName} ({row.sku})</span>
                    {isGlobal && (
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                        {row.warehouseCode}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    Ref: {row.referenceNumber} • Facility: {row.warehouseCode} • {new Date(row.createdAt).toLocaleTimeString()}
                  </div>
                </div>

                <div className={`font-mono font-black text-sm ${row.quantityDelta > 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  {row.quantityDelta > 0 ? `+${row.quantityDelta}` : row.quantityDelta} units
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs font-mono">
              No stock movements logged for {activeWarehouse.name} ({activeWarehouse.code}) yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
