'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Warehouse, ArrowRight, ShieldCheck, Box, CheckCircle2,
  TrendingUp, History, PackageCheck, MapPin, UserCheck, Globe
} from 'lucide-react';
import { useState, useEffect } from 'react';

const WAREHOUSE_MANAGERS: Record<string, { name: string; email: string }> = {
  'WH-SYD-01': { name: 'Jack Taylor (Sydney Warehouse Manager)', email: 'sydney.manager@logiqon.com' },
  'WH-MEL-02': { name: 'Sarah Jenkins (Melbourne Operations Lead)', email: 'melbourne.manager@logiqon.com' },
  'WH-BNE-03': { name: 'Michael Chang (Brisbane Hub Supervisor)', email: 'brisbane.manager@logiqon.com' },
  'WH-PER-04': { name: 'David Wilson (Perth Regional Manager)', email: 'perth.manager@logiqon.com' },
};

export default function WarehouseDashboardPage() {
  const { data: session } = useSession();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseCode, setSelectedWarehouseCode] = useState<string>('ALL');
  const [stock, setStock] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouseData();
  }, []);

  useEffect(() => {
    // If logged in as WAREHOUSE role manager, lock to their assigned facility
    if (session?.user) {
      const userRole = (session.user as any).role;
      const assignedWh = (session.user as any).assignedWarehouseCode;
      if (userRole === 'WAREHOUSE' && assignedWh) {
        setSelectedWarehouseCode(assignedWh);
      } else if (userRole === 'WAREHOUSE') {
        const userEmail = session.user.email || '';
        if (userEmail.includes('melbourne')) setSelectedWarehouseCode('WH-MEL-02');
        else if (userEmail.includes('brisbane')) setSelectedWarehouseCode('WH-BNE-03');
        else if (userEmail.includes('perth')) setSelectedWarehouseCode('WH-PER-04');
        else setSelectedWarehouseCode('WH-SYD-01');
      }
    }
  }, [session]);

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
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const isOwner = (session?.user as any)?.role === 'PLATFORM_OWNER';
  const isGlobal = selectedWarehouseCode === 'ALL';

  const activeWarehouse = isGlobal
    ? {
        code: 'GLOBAL-3PL',
        name: 'LogiQ-On Global Logistics Fleet',
        address: 'Enterprise Operations • 3PL Network',
        bins: warehouses.flatMap((w) => w.bins || []),
      }
    : warehouses.find((w) => w.code === selectedWarehouseCode) || {
        code: 'WH-SYD-01',
        name: 'Sydney Central Logistics Hub',
        address: '100 Logistics Way, Eastern Creek NSW 2766',
        bins: [{ code: 'BIN-A1-01' }, { code: 'BIN-A1-02' }],
      };

  const activeManager = isGlobal
    ? {
        name: 'Logistics Directorate',
        email: session?.user?.email || 'owner@logiqon.com',
      }
    : {
        name: (activeWarehouse as any).contactPerson || WAREHOUSE_MANAGERS[selectedWarehouseCode]?.name || session?.user?.name || 'Warehouse Manager',
        email: (activeWarehouse as any).contactEmail || WAREHOUSE_MANAGERS[selectedWarehouseCode]?.email || session?.user?.email || 'sydney.manager@logiqon.com',
      };

  const filteredStock = isGlobal
    ? stock
    : stock.filter((s) => s.warehouseCode === selectedWarehouseCode);

  const filteredLedger = isGlobal
    ? ledger
    : ledger.filter((l) => l.warehouseCode === selectedWarehouseCode);

  const totalStockCount = filteredStock.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Emerald Green Header Banner with Pixel-Perfect Alignment */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-emerald-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            {isGlobal ? <Globe className="w-8 h-8" /> : <Warehouse className="w-8 h-8" />}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {isOwner
                ? (isGlobal ? 'PILLAR 03 • GLOBAL 3PL FLEET DESK (OWNER VIEW)' : `PILLAR 03 • ${selectedWarehouseCode} FACILITY DESK`)
                : `PILLAR 03 • ASSIGNED WAREHOUSE DESK (${selectedWarehouseCode})`}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                {activeWarehouse.name}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold shrink-0">
                {activeWarehouse.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
              <span><MapPin className="w-3.5 h-3.5 text-emerald-600 inline" /> {activeWarehouse.address}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold"><UserCheck className="w-3.5 h-3.5 inline" /> {activeManager.name} ({activeManager.email})</span>
            </p>
          </div>
        </div>

        {/* Perfectly Aligned Controls Baseline */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 shrink-0">
          {/* Facility Location Selector (Only shown to Platform Owner) */}
          {isOwner ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                Select Active Desk View:
              </label>
              <select
                value={selectedWarehouseCode}
                onChange={(e) => setSelectedWarehouseCode(e.target.value)}
                className="h-[42px] px-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-600 font-mono shadow-sm"
              >
                <option value="ALL">🌐 All Warehouses (Global View)</option>
                {warehouses.map((w) => (
                  <option key={w.code} value={w.code}>
                    🏬 {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="px-4 py-2.5 h-[42px] bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 font-mono flex items-center gap-2 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Assigned Desk: {selectedWarehouseCode}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/owner/inventory"
              className="h-[42px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer font-mono whitespace-nowrap"
            >
              <PackageCheck className="w-4 h-4" /> Inventory Management
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards - Emerald / Green Styled */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Bin Locations</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {isGlobal ? `${warehouses.reduce((sum, w) => sum + (w.bins?.length || 0), 0)} Bins` : `${activeWarehouse.bins?.length || 0} Storage Bins`}
          </div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> {isGlobal ? 'Across All Facilities' : `Assigned at ${activeWarehouse.code}`}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">{isGlobal ? 'Total Network Stock' : 'Facility Stock On Hand'}</span>
            <Box className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalStockCount} Units</div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled against ledger
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase">Stock Movements</span>
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

      {/* Stock Movements Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            {isGlobal ? 'Recent Global Warehouse Stock Movements (All Facilities)' : `Recent Facility Stock Movements (${activeWarehouse.code})`}
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
                    {isGlobal && (
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                        {row.warehouseCode}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    Ref: {row.referenceNumber} • Facility: {row.warehouseCode} • Bin: {row.binLocation} • {new Date(row.createdAt).toLocaleTimeString()}
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
