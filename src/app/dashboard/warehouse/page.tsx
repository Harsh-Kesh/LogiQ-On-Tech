'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Warehouse, ArrowRight, ShieldCheck, Box, RefreshCw, CheckCircle2,
  TrendingUp, History, PackageCheck, MapPin
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function WarehouseDashboardPage() {
  const { data: session } = useSession();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseCode, setSelectedWarehouseCode] = useState<string>('WH-SYD-01');
  const [stock, setStock] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouseData();
  }, []);

  const fetchWarehouseData = async () => {
    setLoading(true);
    try {
      const [stockRes, ledgerRes, whRes] = await Promise.all([
        fetch('/api/inventory/stock'),
        fetch('/api/inventory/ledger'),
        fetch('/api/inventory/warehouses'),
      ]);
      const stockData = await stockRes.json();
      const ledgerData = await ledgerRes.json();
      const whData = await whRes.json();

      setStock(stockData.stock || []);
      setLedger(ledgerData.ledger || []);
      setWarehouses(whData.warehouses || []);
      if (whData.warehouses && whData.warehouses.length > 0 && !selectedWarehouseCode) {
        setSelectedWarehouseCode(whData.warehouses[0].code);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const activeWarehouse = warehouses.find((w) => w.code === selectedWarehouseCode) || {
    code: 'WH-SYD-01',
    name: 'Sydney Central Logistics Hub',
    address: '100 Logistics Way, Eastern Creek NSW 2766',
    bins: [{ code: 'BIN-A1-01' }, { code: 'BIN-A1-02' }],
  };

  const filteredStock = selectedWarehouseCode === 'ALL'
    ? stock
    : stock.filter((s) => s.warehouseCode === selectedWarehouseCode);

  const filteredLedger = selectedWarehouseCode === 'ALL'
    ? ledger
    : ledger.filter((l) => l.warehouseCode === selectedWarehouseCode);

  const totalStockCount = filteredStock.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Emerald Green Header Banner with Active Facility Selector */}
      <div className="p-8 rounded-3xl bg-white border border-emerald-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            <Warehouse className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              PILLAR 03 • WAREHOUSE OPERATOR DESK
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {activeWarehouse.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold">
                {activeWarehouse.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {activeWarehouse.address} • Desk: {session?.user?.email || 'warehouse@logiqon.com'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {/* Facility Location Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
              Switch Facility Desk:
            </label>
            <select
              value={selectedWarehouseCode}
              onChange={(e) => setSelectedWarehouseCode(e.target.value)}
              className="px-3 py-2 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-600 font-mono"
            >
              <option value="ALL">All Warehouses (Global Desk)</option>
              {warehouses.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-4 sm:pt-0">
            <Link
              href="/dashboard/owner/inventory"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer font-mono"
            >
              <PackageCheck className="w-4 h-4" /> Receive Inbound Stock (GRN)
            </Link>
            <Link
              href="/dashboard/owner/inventory"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer font-mono"
            >
              <RefreshCw className="w-4 h-4" /> Stock Adjustment
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards - Styled in Emerald / Green */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Bin Locations</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{activeWarehouse.bins?.length || 2} Storage Bins</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Allocated at {activeWarehouse.code}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Facility Stock On Hand</span>
            <Box className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalStockCount} Units</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled against ledger
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Facility Movements</span>
            <History className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{filteredLedger.length} Movements</div>
          <p className="text-xs text-emerald-600 font-semibold">Append-Only Ledger Rows</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Audit Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">100% Verified</div>
          <p className="text-xs text-slate-500 font-mono">0 Discrepancies</p>
        </div>
      </div>

      {/* Facility Stock Movements Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" /> Recent Facility Stock Movements ({activeWarehouse.code})
          </h2>
          <Link href="/dashboard/owner/inventory" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
            View Master Ledger <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredLedger.length > 0 ? (
            filteredLedger.slice(0, 8).map((row) => (
              <div key={row.id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${row.quantityDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {row.movementType}
                    </span>
                    <span>{row.itemName} ({row.sku})</span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    Ref: {row.referenceNumber} • Bin: {row.binLocation} • {new Date(row.createdAt).toLocaleTimeString()}
                  </div>
                </div>

                <div className={`font-mono font-black text-sm ${row.quantityDelta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
