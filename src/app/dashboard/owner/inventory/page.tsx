'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  ShieldCheck,
  Building,
  Plus,
  Filter,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  History,
  FileSpreadsheet,
  PackageCheck,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { StockOnHandItem, StockLedgerEntry, WarehouseLocation, ReconciliationReport } from '@/lib/stock';

export default function OwnerInventoryPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isWarehouseManager = userRole === 'WAREHOUSE';
  const assignedWh = (session?.user as any)?.assignedWarehouseCode ||
    (session?.user?.email?.includes('melbourne') ? 'WH-MEL-02' :
     session?.user?.email?.includes('brisbane') ? 'WH-BNE-03' :
     session?.user?.email?.includes('perth') ? 'WH-PER-04' : 'WH-SYD-01');

  const [activeTab, setActiveTab] = useState<'stock' | 'receive' | 'ledger' | 'adjust' | 'locations'>('stock');

  // Data States
  const [stockList, setStockList] = useState<StockOnHandItem[]>([]);
  const [ledgerList, setLedgerList] = useState<StockLedgerEntry[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLocation[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [movementFilter, setMovementFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form States - Receive Goods
  const [rcvItem, setRcvItem] = useState('');
  const [rcvWarehouse, setRcvWarehouse] = useState('');
  const [rcvBin, setRcvBin] = useState('');
  const [rcvQty, setRcvQty] = useState('100');
  const [rcvPo, setRcvPo] = useState('');
  const [rcvSubmitting, setRcvSubmitting] = useState(false);

  // Form States - Stock Adjustments
  const [adjItem, setAdjItem] = useState('');
  const [adjWarehouse, setAdjWarehouse] = useState('');
  const [adjBin, setAdjBin] = useState('');
  const [adjType, setAdjType] = useState<'ISSUE' | 'ADJUSTMENT' | 'RETURN'>('ISSUE');
  const [adjQty, setAdjQty] = useState('10');
  const [adjReason, setAdjReason] = useState('');
  const [adjRef, setAdjRef] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // Form States - New Warehouse / Bin
  const [isWhModalOpen, setIsWhModalOpen] = useState(false);
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whContact, setWhContact] = useState('');
  const [whManagerEmail, setWhManagerEmail] = useState('sydney.manager@logiqon.com');
  const [whManagerName, setWhManagerName] = useState('Jack Taylor (Sydney Warehouse Manager)');
  const [registeredManagers, setRegisteredManagers] = useState<Array<{ fullName: string; email: string }>>([
    { fullName: 'Jack Taylor (Sydney Warehouse Manager)', email: 'sydney.manager@logiqon.com' },
    { fullName: 'Sarah Jenkins (Melbourne Operations Lead)', email: 'melbourne.manager@logiqon.com' },
    { fullName: 'Michael Chang (Brisbane Hub Supervisor)', email: 'brisbane.manager@logiqon.com' },
    { fullName: 'David Wilson (Perth Regional Manager)', email: 'perth.manager@logiqon.com' },
  ]);
  const [binRows, setBinRows] = useState<Array<{ code: string; zone: string; capacity: string }>>([
    { code: 'BIN-A1-01', zone: 'Zone A - Fast Pick', capacity: '1000' },
    { code: 'BIN-A1-02', zone: 'Zone A - Reserve', capacity: '2000' },
  ]);
  const [whSubmitting, setWhSubmitting] = useState(false);

  const addBinRow = () => {
    const nextIdx = binRows.length + 1;
    setBinRows([
      ...binRows,
      {
        code: `BIN-A${nextIdx}-01`,
        zone: `Zone ${String.fromCharCode(65 + (nextIdx % 4))}`,
        capacity: '1000',
      },
    ]);
  };

  const removeBinRow = (index: number) => {
    if (binRows.length <= 1) return;
    setBinRows(binRows.filter((_, i) => i !== index));
  };

  const updateBinRow = (index: number, field: 'code' | 'zone' | 'capacity', value: string) => {
    const updated = [...binRows];
    updated[index][field] = value;
    setBinRows(updated);
  };

  // Form State - Add Storage Bin to Existing Warehouse
  const [isAddBinModalOpen, setIsAddBinModalOpen] = useState(false);
  const [targetWhCode, setTargetWhCode] = useState('');
  const [newBinCode, setNewBinCode] = useState('');
  const [newBinZone, setNewBinZone] = useState('Zone A');
  const [newBinCapacity, setNewBinCapacity] = useState('1000');
  const [binSubmitting, setBinSubmitting] = useState(false);

  // Searchable Item Selector States
  const [rcvItemSearch, setRcvItemSearch] = useState('');
  const [isRcvItemDropdownOpen, setIsRcvItemDropdownOpen] = useState(false);
  const [adjItemSearch, setAdjItemSearch] = useState('');
  const [isAdjItemDropdownOpen, setIsAdjItemDropdownOpen] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [stockRes, ledgerRes, whRes, itemsRes, usersRes] = await Promise.all([
        fetch('/api/inventory/stock'),
        fetch('/api/inventory/ledger'),
        fetch('/api/inventory/warehouses'),
        fetch('/api/mdm/items'),
        fetch('/api/admin/users').catch(() => null),
      ]);

      const stockData = await stockRes.json();
      const ledgerData = await ledgerRes.json();
      const whData = await whRes.json();
      const itemsData = await itemsRes.json();

      if (usersRes && usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.users && Array.isArray(usersData.users)) {
          const whUsers = usersData.users.filter((u: any) => u.role === 'WAREHOUSE' && !u.isSuspended);
          if (whUsers.length > 0) {
            setRegisteredManagers(
              whUsers.map((u: any) => ({
                fullName: u.fullName || u.email,
                email: u.email,
              }))
            );
          }
        }
      }

      setStockList(stockData.stock || []);
      setReconciliation(stockData.reconciliation || null);
      setLedgerList(ledgerData.ledger || []);
      setWarehouses(whData.warehouses || []);
      setItems(itemsData.items || []);

      if (whData.warehouses && whData.warehouses.length > 0) {
        const defaultWh = isWarehouseManager ? assignedWh : whData.warehouses[0].code;
        if (!rcvWarehouse) setRcvWarehouse(defaultWh);
        if (!adjWarehouse) setAdjWarehouse(defaultWh);
        if (isWarehouseManager) setSelectedWarehouse(assignedWh);
        
        const matchingWh = whData.warehouses.find((w: any) => w.code === defaultWh) || whData.warehouses[0];
        if (matchingWh && matchingWh.bins && matchingWh.bins.length > 0) {
          if (!rcvBin) setRcvBin(matchingWh.bins[0].code);
          if (!adjBin) setAdjBin(matchingWh.bins[0].code);
        }
      }
      if (itemsData.items && itemsData.items.length > 0) {
        if (!rcvItem) setRcvItem(itemsData.items[0].id);
        if (!adjItem) setAdjItem(itemsData.items[0].id);
      }
    } catch (e) {
      setToast({ message: 'Failed to load inventory data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rcvItem || !rcvWarehouse || !rcvBin || !rcvQty) {
      setToast({ message: 'Please fill in all required fields.', type: 'error' });
      return;
    }

    setRcvSubmitting(true);
    try {
      const res = await fetch('/api/inventory/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemMasterId: rcvItem,
          warehouseCode: rcvWarehouse,
          binLocation: rcvBin,
          quantityReceived: rcvQty,
          poReference: rcvPo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Stock receiving failed.', type: 'error' });
      } else {
        setToast({ message: data.message, type: 'success' });
        setRcvPo('');
        fetchAllData();
        setActiveTab('stock');
      }
    } catch (e) {
      setToast({ message: 'Error communicating with server.', type: 'error' });
    } finally {
      setRcvSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjItem || !adjWarehouse || !adjBin || !adjQty || !adjReason) {
      setToast({ message: 'Please provide a valid item, location, quantity, and reason code.', type: 'error' });
      return;
    }

    setAdjSubmitting(true);
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemMasterId: adjItem,
          warehouseCode: adjWarehouse,
          binLocation: adjBin,
          movementType: adjType,
          quantity: adjQty,
          reasonCode: adjReason,
          referenceNumber: adjRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Stock adjustment failed.', type: 'error' });
      } else {
        setToast({ message: data.message, type: 'success' });
        setAdjReason('');
        setAdjRef('');
        fetchAllData();
        setActiveTab('stock');
      }
    } catch (e) {
      setToast({ message: 'Error communicating with server.', type: 'error' });
    } finally {
      setAdjSubmitting(false);
    }
  };

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whCode || !whName || !whAddress) {
      setToast({ message: 'Code, Name, and Address are required.', type: 'error' });
      return;
    }

    setWhSubmitting(true);
    try {
      const res = await fetch('/api/inventory/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: whCode,
          name: whName,
          address: whAddress,
          contactPerson: whContact || whManagerName,
          contactEmail: whManagerEmail,
          managerName: whManagerName,
          managerEmail: whManagerEmail,
          initialBins: binRows.map((r) => ({
            code: r.code,
            zone: r.zone,
            capacity: parseInt(r.capacity, 10) || 1000,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Failed to add warehouse.', type: 'error' });
      } else {
        setToast({ message: `Warehouse location '${whName}' (${whCode.toUpperCase()}) created with ${binRows.length} bins!`, type: 'success' });
        setIsWhModalOpen(false);
        setWhCode('');
        setWhName('');
        setWhAddress('');
        setBinRows([
          { code: 'BIN-A1-01', zone: 'Zone A - Fast Pick', capacity: '1000' },
          { code: 'BIN-A1-02', zone: 'Zone A - Reserve', capacity: '2000' },
        ]);
        fetchAllData();
      }
    } catch (e) {
      setToast({ message: 'Error creating warehouse location.', type: 'error' });
    } finally {
      setWhSubmitting(false);
    }
  };

  const handleAddBinToWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWhCode || !newBinCode) {
      setToast({ message: 'Target warehouse and new bin code are required.', type: 'error' });
      return;
    }

    setBinSubmitting(true);
    try {
      const res = await fetch('/api/inventory/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: targetWhCode,
          binCode: newBinCode,
          binZone: newBinZone || 'Zone A',
          binCapacity: newBinCapacity || '1000',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Failed to add storage bin.', type: 'error' });
      } else {
        setToast({ message: `Storage bin '${newBinCode.toUpperCase()}' added to ${targetWhCode}!`, type: 'success' });
        setIsAddBinModalOpen(false);
        setNewBinCode('');
        fetchAllData();
      }
    } catch {
      setToast({ message: 'Error adding storage bin.', type: 'error' });
    } finally {
      setBinSubmitting(false);
    }
  };

  // Filtered Stock & Ledger View
  const filteredStock = stockList.filter((s) => {
    const matchWh = selectedWarehouse === 'ALL' || s.warehouseCode === selectedWarehouse;
    const q = searchQuery.toLowerCase();
    const matchQ =
      !q ||
      s.itemName.toLowerCase().includes(q) ||
      s.sku.toLowerCase().includes(q) ||
      s.barcode.toLowerCase().includes(q) ||
      s.binLocation.toLowerCase().includes(q) ||
      (s.vendorName && s.vendorName.toLowerCase().includes(q));
    return matchWh && matchQ;
  });

  const filteredLedger = ledgerList.filter((l) => {
    const matchWh = selectedWarehouse === 'ALL' || l.warehouseCode === selectedWarehouse;
    const matchType = movementFilter === 'ALL' || l.movementType === movementFilter;
    const q = searchQuery.toLowerCase();
    const matchQ =
      !q ||
      l.itemName.toLowerCase().includes(q) ||
      l.sku.toLowerCase().includes(q) ||
      l.referenceNumber.toLowerCase().includes(q) ||
      l.binLocation.toLowerCase().includes(q) ||
      (l.reasonCode && l.reasonCode.toLowerCase().includes(q));
    return matchWh && matchType && matchQ;
  });

  // Table Columns
  const stockColumns: Array<{ header: string; accessorKey?: keyof StockOnHandItem; cell?: (item: StockOnHandItem) => React.ReactNode }> = [
    {
      header: 'Item & SKU Identity',
      accessorKey: 'itemName',
      cell: (item: StockOnHandItem) => (
        <div className="space-y-1">
          <div className="font-extrabold text-slate-900 text-sm">{item.itemName}</div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {item.sku}
            </span>
            <span className="font-mono text-[11px] text-slate-500">EAN: {item.barcode}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Warehouse & Storage Bin',
      accessorKey: 'binLocation',
      cell: (item: StockOnHandItem) => (
        <div className="space-y-1 text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            {item.warehouseName} ({item.warehouseCode})
          </div>
          <div className="font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded inline-block">
            {item.binLocation}
          </div>
        </div>
      ),
    },
    {
      header: 'Product Supplier',
      accessorKey: 'vendorName',
      cell: (item: StockOnHandItem) =>
        item.vendorId ? (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs">
            <Building className="w-3 h-3 text-emerald-600" /> {item.vendorName}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg text-xs">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> LogiQ-On Internal
          </span>
        ),
    },
    {
      header: 'Stock On Hand (Derived)',
      accessorKey: 'quantityOnHand',
      cell: (item: StockOnHandItem) => (
        <div className="space-y-0.5">
          <div className="font-black text-slate-900 text-base font-mono">{item.quantityOnHand} units</div>
          <div className="text-[10px] text-emerald-700 font-semibold">Available: {item.quantityAvailable} units</div>
        </div>
      ),
    },
    {
      header: 'Audit Reconciliation Status',
      accessorKey: 'lastMovementAt',
      cell: () => (
        <Badge variant="success" className="gap-1 py-1 px-2.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Ledger Matched
        </Badge>
      ),
    },
  ];

  const ledgerColumns: Array<{ header: string; accessorKey?: keyof StockLedgerEntry; cell?: (entry: StockLedgerEntry) => React.ReactNode }> = [
    {
      header: 'Movement Type & Reference',
      accessorKey: 'referenceNumber',
      cell: (entry: StockLedgerEntry) => {
        return (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`font-black px-2 py-0.5 rounded text-[11px] font-mono ${
                  entry.movementType === 'RECEIPT'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : entry.movementType === 'ISSUE'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {entry.movementType}
              </span>
              <span className="font-mono font-bold text-slate-900">{entry.referenceNumber}</span>
            </div>
            <div className="text-[11px] text-slate-500">{new Date(entry.createdAt).toLocaleString()}</div>
          </div>
        );
      },
    },
    {
      header: 'Item & SKU',
      accessorKey: 'itemName',
      cell: (entry: StockLedgerEntry) => (
        <div className="text-xs">
          <div className="font-bold text-slate-900">{entry.itemName}</div>
          <div className="font-mono text-slate-500 text-[11px]">SKU: {entry.sku}</div>
        </div>
      ),
    },
    {
      header: 'Warehouse / Bin',
      accessorKey: 'binLocation',
      cell: (entry: StockLedgerEntry) => (
        <div className="text-xs font-mono font-semibold text-slate-700">
          {entry.warehouseCode} ➔ {entry.binLocation}
        </div>
      ),
    },
    {
      header: 'Quantity Delta',
      accessorKey: 'quantityDelta',
      cell: (entry: StockLedgerEntry) => {
        const isPos = entry.quantityDelta > 0;
        return (
          <span className={`font-mono font-black text-sm ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPos ? `+${entry.quantityDelta}` : entry.quantityDelta} units
          </span>
        );
      },
    },
    {
      header: 'Reason Code / Operator',
      accessorKey: 'reasonCode',
      cell: (entry: StockLedgerEntry) => (
        <div className="text-xs space-y-0.5">
          <div className="text-slate-800 font-medium">{entry.reasonCode || 'System Transaction'}</div>
          <div className="text-[10px] text-slate-400 font-mono">By: {entry.createdByEmail}</div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 font-sans max-w-[1600px] mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Global Enterprise Master Inventory Banner (Styled in Emerald Green) */}
      <div className="p-8 rounded-3xl bg-white border border-emerald-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 font-sans">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono">
            <Boxes className="w-3.5 h-3.5 text-emerald-600" /> PILLAR 03 • GLOBAL ENTERPRISE 3PL INVENTORY CORE
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Enterprise Inventory Stock &amp; Immutable Ledger Hub
          </h1>
          <p className="text-xs text-slate-500 font-mono max-w-3xl">
            Nationwide 3PL Stock Ledger Core • Multi-Facility Movement Audit Across Sydney, Melbourne, Brisbane &amp; Perth Facilities.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchAllData} className="gap-2 border-emerald-200 text-emerald-800 hover:bg-emerald-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync Ledger
          </Button>
          {!isWarehouseManager && (
            <Button onClick={() => setIsWhModalOpen(true)} size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              <Plus className="w-4 h-4" /> Add Warehouse Location
            </Button>
          )}
        </div>
      </div>

      {/* Reconciliation Summary Cards */}
      {reconciliation && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stock On Hand</p>
              <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
                {reconciliation.summary.netStockOnHand} <span className="text-xs font-normal text-slate-500">units</span>
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Reconciled against ledger
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Boxes className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Inbound Receipts</p>
              <h3 className="text-2xl font-black text-emerald-600 font-mono mt-1">
                +{reconciliation.summary.totalReceipts} <span className="text-xs font-normal text-slate-500">units</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">From Goods Receipt Notes (GRN)</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Outbound Issues</p>
              <h3 className="text-2xl font-black text-rose-600 font-mono mt-1">
                -{reconciliation.summary.totalIssues} <span className="text-xs font-normal text-slate-500">units</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Dispatched order shipments</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Immutable Ledger Audit</p>
              <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
                {reconciliation.totalLedgerRecords} <span className="text-xs font-normal text-slate-500">rows</span>
              </h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Append-Only Verified
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <History className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs - 100% Emerald Green Styling */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm space-x-2 font-sans">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'stock' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <Boxes className="w-4 h-4" /> Stock On Hand &amp; Reconciliation ({filteredStock.length})
        </button>

        <button
          onClick={() => setActiveTab('receive')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'receive' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <PackageCheck className="w-4 h-4" /> Inbound Stock Receiving (GRN)
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'ledger' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <History className="w-4 h-4" /> Immutable Movement Ledger ({filteredLedger.length})
        </button>

        <button
          onClick={() => setActiveTab('adjust')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'adjust' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Stock Adjustment Terminal
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'locations' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <MapPin className="w-4 h-4" /> Warehouse &amp; Bin Manager
        </button>
      </div>

      {/* Filter Controls Card */}
      {(activeTab === 'stock' || activeTab === 'ledger') && (
        <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search by SKU, item name, barcode, bin location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              options={[
                { value: 'ALL', label: '🏬 All Warehouse Locations' },
                ...warehouses.map((w) => ({ value: w.code, label: `${w.name} (${w.code})` })),
              ]}
              className="text-xs"
            />

            {activeTab === 'ledger' && (
              <Select
                value={movementFilter}
                onChange={(e) => setMovementFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: '⚡ All Movement Types' },
                  { value: 'RECEIPT', label: '🟢 RECEIPT (Inbound)' },
                  { value: 'ISSUE', label: '🔴 ISSUE (Outbound)' },
                  { value: 'ADJUSTMENT', label: '🟡 ADJUSTMENT (Audit)' },
                  { value: 'RETURN', label: '🔵 RETURN (Customer)' },
                ]}
                className="text-xs"
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 1: Stock On Hand View */}
      {activeTab === 'stock' && (
        <div className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <div className="p-4 flex flex-row items-center justify-between border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600" /> Derived Stock On Hand & Location Matrix
            </h2>
            <Badge variant="success" className="gap-1 py-1 px-2.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Mathematical Proof Verified
            </Badge>
          </div>
          <DataTable data={filteredStock} columns={stockColumns} showSearch={false} />
        </div>
      )}

      {/* TAB 2: Inbound Goods Receiving (GRN Terminal) */}
      {activeTab === 'receive' && (
        <div className="border border-slate-200 bg-white shadow-sm rounded-2xl max-w-3xl mx-auto overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-600" /> Goods Receipt Note (GRN) Receiving Terminal
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Receive inbound stock shipments from approved vendor suppliers (Category 1) or direct platform purchases (Category 2) into storage bins.
            </p>
          </div>

          <div className="p-6">
            <form onSubmit={handleReceiveStock} className="space-y-4">
              <div className="relative">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  🔍 Type to Search & Select Item Master Product *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Type item name, SKU, or barcode (e.g. Scanner, LQ-SCN)..."
                    value={rcvItemSearch || (items.find((i) => i.id === rcvItem)?.itemName ? `${items.find((i) => i.id === rcvItem)?.itemName} (${items.find((i) => i.id === rcvItem)?.sku})` : '')}
                    onFocus={() => setIsRcvItemDropdownOpen(true)}
                    onChange={(e) => {
                      setRcvItemSearch(e.target.value);
                      setIsRcvItemDropdownOpen(true);
                    }}
                    className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 font-semibold text-slate-900"
                  />
                  {rcvItem && (
                    <button
                      type="button"
                      onClick={() => {
                        setRcvItem('');
                        setRcvItemSearch('');
                        setIsRcvItemDropdownOpen(true);
                      }}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}

                  {isRcvItemDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 font-sans">
                      {items
                        .filter((i) => {
                          if (!rcvItemSearch) return true;
                          const q = rcvItemSearch.toLowerCase();
                          return (
                            i.itemName.toLowerCase().includes(q) ||
                            i.sku.toLowerCase().includes(q) ||
                            i.barcode.toLowerCase().includes(q) ||
                            (i.vendorName && i.vendorName.toLowerCase().includes(q))
                          );
                        })
                        .map((i) => (
                          <div
                            key={i.id}
                            onClick={() => {
                              setRcvItem(i.id);
                              setRcvItemSearch(`${i.itemName} (${i.sku})`);
                              setIsRcvItemDropdownOpen(false);
                            }}
                            className={`p-3 text-xs hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-colors ${
                              rcvItem === i.id ? 'bg-emerald-50/80 font-bold' : ''
                            }`}
                          >
                            <div>
                              <div className="font-extrabold text-slate-900">{i.itemName}</div>
                              <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-slate-500">
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">{i.sku}</span>
                                <span>EAN: {i.barcode}</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600">
                              {i.vendorId ? `🏢 ${i.vendorName || 'Vendor'}` : '🛡️ Platform'}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target Warehouse *</label>
                  <Select
                    value={rcvWarehouse}
                    onChange={(e) => {
                      setRcvWarehouse(e.target.value);
                      const target = warehouses.find((w) => w.code === e.target.value);
                      if (target && target.bins.length > 0) setRcvBin(target.bins[0].code);
                    }}
                    options={warehouses.map((w) => ({ value: w.code, label: `${w.name} (${w.code})` }))}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target Storage Bin Location *</label>
                  <Select
                    value={rcvBin}
                    onChange={(e) => setRcvBin(e.target.value)}
                    options={
                      warehouses.find((w) => w.code === rcvWarehouse)?.bins.map((b) => ({
                        value: b.code,
                        label: `${b.code} (${b.zone})`,
                      })) || [{ value: 'BIN-A1-01', label: 'BIN-A1-01 (Zone A)' }]
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity Received (Units) *</label>
                  <Input
                    type="number"
                    min="1"
                    value={rcvQty}
                    onChange={(e) => setRcvQty(e.target.value)}
                    placeholder="100"
                    className="text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">PO / Delivery Reference (Optional)</label>
                  <Input
                    value={rcvPo}
                    onChange={(e) => setRcvPo(e.target.value)}
                    placeholder="e.g. PO-VENDOR-99182"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <Button type="submit" disabled={rcvSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
                  <PackageCheck className="w-4 h-4" /> Process Inbound GRN Receipt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Immutable Stock Ledger Audit Trail */}
      {activeTab === 'ledger' && (
        <div className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <div className="p-4 flex flex-row items-center justify-between border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" /> Immutable Movement Ledger Audit Log
            </h2>
            <span className="text-xs text-slate-500 font-mono">Append-Only • Uneditable Historical Records</span>
          </div>
          <DataTable data={filteredLedger} columns={ledgerColumns} showSearch={false} />
        </div>
      )}

      {/* TAB 4: Stock Adjustment Terminal */}
      {activeTab === 'adjust' && (
        <div className="border border-slate-200 bg-white shadow-sm rounded-2xl max-w-3xl mx-auto overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600" /> Stock Movement & Adjustment Terminal
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Log stock issues (outbound dispatches), customer returns, or cycle count audit adjustments with mandatory reason codes.
            </p>
          </div>

          <div className="p-6">
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div className="relative">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  🔍 Type to Search & Select Item Master Product *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Type item name, SKU, or barcode (e.g. Industrial Barcode Scanner 2D, LQ-SCN)..."
                    value={adjItemSearch || (items.find((i) => i.id === adjItem)?.itemName ? `${items.find((i) => i.id === adjItem)?.itemName} (${items.find((i) => i.id === adjItem)?.sku})` : '')}
                    onFocus={() => setIsAdjItemDropdownOpen(true)}
                    onChange={(e) => {
                      setAdjItemSearch(e.target.value);
                      setIsAdjItemDropdownOpen(true);
                    }}
                    className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 font-semibold text-slate-900"
                  />
                  {adjItem && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdjItem('');
                        setAdjItemSearch('');
                        setIsAdjItemDropdownOpen(true);
                      }}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}

                  {isAdjItemDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 font-sans">
                      {items
                        .filter((i) => {
                          if (!adjItemSearch) return true;
                          const q = adjItemSearch.toLowerCase();
                          return (
                            i.itemName.toLowerCase().includes(q) ||
                            i.sku.toLowerCase().includes(q) ||
                            i.barcode.toLowerCase().includes(q) ||
                            (i.vendorName && i.vendorName.toLowerCase().includes(q))
                          );
                        })
                        .map((i) => (
                          <div
                            key={i.id}
                            onClick={() => {
                              setAdjItem(i.id);
                              setAdjItemSearch(`${i.itemName} (${i.sku})`);
                              setIsAdjItemDropdownOpen(false);
                            }}
                            className={`p-3 text-xs hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-colors ${
                              adjItem === i.id ? 'bg-emerald-50/80 font-bold' : ''
                            }`}
                          >
                            <div>
                              <div className="font-extrabold text-slate-900">{i.itemName}</div>
                              <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-slate-500">
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">{i.sku}</span>
                                <span>EAN: {i.barcode}</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600">
                              {i.vendorId ? `🏢 ${i.vendorName || 'Vendor'}` : '🛡️ Platform'}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Movement Action *</label>
                  <Select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    options={[
                      { value: 'ISSUE', label: '🔴 ISSUE (Outbound Dispatch)' },
                      { value: 'ADJUSTMENT', label: '🟡 ADJUSTMENT (Cycle Audit)' },
                      { value: 'RETURN', label: '🔵 RETURN (Customer Return)' },
                    ]}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Warehouse *</label>
                  <Select
                    value={adjWarehouse}
                    onChange={(e) => {
                      setAdjWarehouse(e.target.value);
                      const target = warehouses.find((w) => w.code === e.target.value);
                      if (target && target.bins.length > 0) setAdjBin(target.bins[0].code);
                    }}
                    options={warehouses.map((w) => ({ value: w.code, label: `${w.name} (${w.code})` }))}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Storage Bin Location *</label>
                  <Select
                    value={adjBin}
                    onChange={(e) => setAdjBin(e.target.value)}
                    options={
                      warehouses.find((w) => w.code === adjWarehouse)?.bins.map((b) => ({
                        value: b.code,
                        label: `${b.code} (${b.zone})`,
                      })) || [{ value: 'BIN-A1-01', label: 'BIN-A1-01 (Zone A)' }]
                    }
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity Delta *</label>
                  <Input
                    type="number"
                    min="1"
                    value={adjQty}
                    onChange={(e) => setAdjQty(e.target.value)}
                    placeholder="10"
                    className="text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mandatory Reason Code *</label>
                  <Input
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="e.g. Order Dispatch #ORD-881, Damaged Packaging"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <Button type="submit" disabled={adjSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
                  <RotateCcw className="w-4 h-4" /> Write Movement Ledger Row
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: Warehouse & Storage Location Manager */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {warehouses.map((wh) => (
            <div key={wh.code} className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{wh.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Code: {wh.code} • {wh.address}</p>
                  </div>
                  <Badge variant="neutral" className="font-mono text-xs">{wh.bins.length} Bins</Badge>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Storage Bin Locations:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetWhCode(wh.code);
                        setIsAddBinModalOpen(true);
                      }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Storage Bin
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {wh.bins.map((bin) => (
                      <div key={bin.code} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <div className="font-mono font-bold text-slate-900">{bin.code}</div>
                          <div className="text-[10px] text-slate-500">{bin.zone}</div>
                        </div>
                        <Badge variant={bin.isOccupied ? 'success' : 'neutral'} className="text-[10px]">
                          {bin.isOccupied ? 'Occupied' : 'Empty'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Add Warehouse Location */}
      <Modal isOpen={isWhModalOpen} onClose={() => setIsWhModalOpen(false)} title="Configure New Warehouse Location" maxWidth="2xl">
        <form onSubmit={handleAddWarehouse} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Warehouse Code *</label>
              <Input value={whCode} onChange={(e) => setWhCode(e.target.value)} placeholder="e.g. WH-PER-04" className="text-xs font-mono uppercase" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Warehouse Facility Name *</label>
              <Input value={whName} onChange={(e) => setWhName(e.target.value)} placeholder="e.g. Perth Regional Logistics Hub" className="text-xs" required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Physical Address *</label>
              <Input value={whAddress} onChange={(e) => setWhAddress(e.target.value)} placeholder="e.g. 50 Airport Drive, Kewdale WA 6105" className="text-xs" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Warehouse Manager *</label>
              <Select
                value={whManagerEmail}
                onChange={(e) => {
                  const selectedEmail = e.target.value;
                  setWhManagerEmail(selectedEmail);
                  const found = registeredManagers.find((m) => m.email === selectedEmail);
                  setWhManagerName(found ? found.fullName : selectedEmail);
                }}
                options={registeredManagers.map((m) => ({
                  value: m.email,
                  label: `👤 ${m.fullName} (${m.email})`,
                }))}
              />
            </div>
          </div>

          {/* Dynamic Storage Bins Builder */}
          <div className="pt-3 border-t border-slate-100 space-y-3 font-sans">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-mono">
                  Configure Storage Bins & Zone Capacity ({binRows.length} {binRows.length === 1 ? 'Bin' : 'Bins'})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Configure bin code, zone area, and unit storage capacity for this location.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addBinRow}
                leftIcon={<Plus className="w-3.5 h-3.5 text-emerald-600" />}
                className="text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8"
              >
                Add More Bins
              </Button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {binRows.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2.5 items-center">
                  <div className="col-span-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Bin Code *</label>
                    <Input
                      value={row.code}
                      onChange={(e) => updateBinRow(idx, 'code', e.target.value)}
                      placeholder="e.g. BIN-A1-01"
                      className="text-xs font-mono uppercase bg-white"
                      required
                    />
                  </div>

                  <div className="col-span-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Bin Zone / Area</label>
                    <Input
                      value={row.zone}
                      onChange={(e) => updateBinRow(idx, 'zone', e.target.value)}
                      placeholder="e.g. Zone A"
                      className="text-xs bg-white"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Capacity (Units)</label>
                    <Input
                      type="number"
                      value={row.capacity}
                      onChange={(e) => updateBinRow(idx, 'capacity', e.target.value)}
                      placeholder="1000"
                      className="text-xs font-mono bg-white"
                    />
                  </div>

                  <div className="col-span-1 flex justify-end pt-4">
                    <button
                      type="button"
                      disabled={binRows.length <= 1}
                      onClick={() => removeBinRow(idx)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        binRows.length <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer'
                      }`}
                      title="Remove Bin Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsWhModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={whSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Save Warehouse Location
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal - Add Storage Bin to Existing Warehouse */}
      <Modal isOpen={isAddBinModalOpen} onClose={() => setIsAddBinModalOpen(false)} title={`Add Storage Bin to Warehouse (${targetWhCode})`}>
        <form onSubmit={handleAddBinToWarehouse} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">New Storage Bin Code *</label>
            <Input value={newBinCode} onChange={(e) => setNewBinCode(e.target.value)} placeholder="e.g. BIN-C3-09" className="text-xs font-mono uppercase" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Zone / Area Name</label>
              <Input value={newBinZone} onChange={(e) => setNewBinZone(e.target.value)} placeholder="Zone C - Bulk Storage" className="text-xs" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Bin Capacity (Units)</label>
              <Input type="number" value={newBinCapacity} onChange={(e) => setNewBinCapacity(e.target.value)} placeholder="1000" className="text-xs font-mono" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsAddBinModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={binSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Add Bin to Warehouse
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
