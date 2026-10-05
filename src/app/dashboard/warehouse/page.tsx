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
      <div className="p-6 md:p-8 rounded-3xl bg-white border shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-3.5 rounded-2xl border shrink-0" style={{ background: '#eff6ff', color: '#1e3a8a', borderColor: '#bfdbfe' }}>
            {isGlobal ? <Globe className="w-8 h-8" /> : <Warehouse className="w-8 h-8" />}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full border text-[11px] font-bold font-mono" style={{ background: '#eff6ff', color: '#1e3a8a', borderColor: '#bfdbfe' }}>
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#1e3a8a' }} />
              {isGlobal ? 'ALL WAREHOUSES' : `WAREHOUSE: ${selectedWarehouseCode}`}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight" style={{ color: '#0f172a' }}>
                {activeWarehouse.name}
              </h1>
              {!isGlobal && (
                <span className="px-2 py-0.5 rounded-md border text-xs font-mono font-bold shrink-0" style={{ background: '#eff6ff', color: '#1e3a8a', borderColor: '#bfdbfe' }}>
                  {activeWarehouse.code}
                </span>
              )}
            </div>
            <p className="text-xs font-mono flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: '#64748b' }}>
              <span><MapPin className="w-3.5 h-3.5 inline" style={{ color: '#1e3a8a' }} /> {activeWarehouse.address}</span>
              <span>•</span>
              <span className="font-bold" style={{ color: '#1e3a8a' }}><UserCheck className="w-3.5 h-3.5 inline" /> {activeManager.name}{activeManager.email ? ` (${activeManager.email})` : ''}</span>
            </p>
          </div>
        </div>

        <div className="space-y-1 shrink-0">
          <label className="text-[10px] font-bold uppercase tracking-wider block font-mono" style={{ color: '#64748b' }}>
            View Warehouse:
          </label>
          <select
            value={selectedWarehouseCode}
            onChange={(e) => setSelectedWarehouseCode(e.target.value)}
            className="h-[42px] px-3.5 border rounded-xl text-xs font-bold focus:outline-none focus:border-[#1e3a8a] font-mono shadow-sm w-full sm:w-auto"
            style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e3a8a' }}
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
        <div className="p-6 rounded-2xl bg-white border shadow-sm space-y-2" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase" style={{ color: '#94a3b8' }}>SKUs Tracked</span>
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#1e3a8a' }} />
          </div>
          <div className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>
            {new Set(filteredLedger.map((l) => l.sku)).size} SKUs
          </div>
          <p className="text-xs font-semibold flex items-center gap-1" style={{ color: '#1e3a8a' }}>
            <TrendingUp className="w-3.5 h-3.5" /> {isGlobal ? 'Across All Facilities' : `Active at ${activeWarehouse.code}`}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border shadow-sm space-y-2" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase" style={{ color: '#94a3b8' }}>{isGlobal ? 'Total Network Stock' : 'Facility Stock On Hand'}</span>
            <Box className="w-4 h-4" style={{ color: '#1e3a8a' }} />
          </div>
          <div className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>{totalStockCount} Units</div>
          <p className="text-xs font-semibold flex items-center gap-1" style={{ color: '#1e3a8a' }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled against ledger
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border shadow-sm space-y-2" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase" style={{ color: '#94a3b8' }}>Stock Movements</span>
            <History className="w-4 h-4" style={{ color: '#1e3a8a' }} />
          </div>
          <div className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>{filteredLedger.length} Movements</div>
          <p className="text-xs font-semibold" style={{ color: '#1e3a8a' }}>Append-Only Ledger Rows</p>
        </div>
      </div>

      {/* Stock Movements Table */}
      <div className="p-6 rounded-3xl bg-white border shadow-sm space-y-4" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <History className="w-5 h-5" style={{ color: '#1e3a8a' }} />
            {isGlobal ? 'Recent Global Warehouse Stock Movements (All Facilities)' : `Recent Facility Stock Movements (${activeWarehouse.code})`}
          </h2>
          <Link href="/dashboard/owner/inventory" className="text-xs font-bold hover:underline flex items-center gap-1" style={{ color: '#1e3a8a' }}>
            View Master Ledger <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-[#f1f5f9]">
          {filteredLedger.length > 0 ? (
            filteredLedger.slice(0, 8).map((row) => (
              <div key={row.id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
                    <span
                      className="px-2 py-0.5 rounded font-mono text-[10px]"
                      style={row.quantityDelta > 0 ? { background: '#f0fdf4', color: '#166534' } : { background: '#fef2f2', color: '#991b1b' }}
                    >
                      {row.movementType}
                    </span>
                    <span>{row.itemName} ({row.sku})</span>
                    {isGlobal && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border" style={{ color: '#64748b', background: '#f8fafc', borderColor: '#e2e8f0' }}>
                        {row.warehouseCode}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px]" style={{ color: '#94a3b8' }}>
                    Ref: {row.referenceNumber} • Facility: {row.warehouseCode} • {new Date(row.createdAt).toLocaleTimeString()}
                  </div>
                </div>

                <div
                  className="font-mono font-black text-sm"
                  style={{ color: row.quantityDelta > 0 ? '#166534' : '#991b1b' }}
                >
                  {row.quantityDelta > 0 ? `+${row.quantityDelta}` : row.quantityDelta} units
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs font-mono" style={{ color: '#94a3b8' }}>
              No stock movements logged for {activeWarehouse.name} ({activeWarehouse.code}) yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
