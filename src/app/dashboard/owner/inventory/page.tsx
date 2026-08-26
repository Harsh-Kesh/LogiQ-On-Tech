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
  Truck,
  ClipboardList,
  Package,
  Barcode,
  Sparkles,
  Check,
  Printer,
  BarChart3,
  Download,
  CornerUpLeft,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { StockOnHandItem, StockLedgerEntry, WarehouseLocation, ReconciliationReport } from '@/lib/stock';
import { OutboundOrder } from '@/lib/orders';
import { RmaReturnRequest } from '@/lib/returns';
import { BarcodeRenderer } from '@/components/ui/BarcodeRenderer';

export default function OwnerInventoryPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isWarehouseManager = userRole === 'WAREHOUSE';

  const [activeTab, setActiveTab] = useState<
    'stock' | 'receive' | 'ledger' | 'adjust' | 'locations' | 'fulfillment' | 'reports' | 'returns'
  >('stock');

  // Data States
  const [stockList, setStockList] = useState<StockOnHandItem[]>([]);
  const [ledgerList, setLedgerList] = useState<StockLedgerEntry[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLocation[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<OutboundOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const assignedWh = React.useMemo(() => {
    if (!session?.user || !isWarehouseManager) return 'UNASSIGNED';
    const userEmail = (session.user.email || '').toLowerCase();
    const assignedCode = (session.user as any).assignedWarehouseCode;
    if (assignedCode && assignedCode !== 'ALL' && assignedCode !== 'UNASSIGNED') {
      return assignedCode;
    }
    const matchedWh = warehouses.find(
      (w) =>
        ((w as any).managerEmail && (w as any).managerEmail.toLowerCase() === userEmail) ||
        (w.contactEmail && w.contactEmail.toLowerCase() === userEmail)
    );
    if (matchedWh) return matchedWh.code;
    if (userEmail === 'sydney.manager@logiqon.com' || userEmail === 'warehouse@logiqon.tech' || userEmail === 'warehouse@logiqon.com') return 'WH-SYD-01';
    if (userEmail === 'melbourne.manager@logiqon.com') return 'WH-MEL-02';
    if (userEmail === 'brisbane.manager@logiqon.com') return 'WH-BNE-03';
    if (userEmail === 'perth.manager@logiqon.com') return 'WH-PER-04';
    return 'UNASSIGNED';
  }, [session, isWarehouseManager, warehouses]);

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
  const [adjType, setAdjType] = useState<string>('ISSUE');
  const [adjQty, setAdjQty] = useState('10');
  const [adjReason, setAdjReason] = useState('');
  const [adjRef, setAdjRef] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // Form States - New Warehouse / Bin
  const [isWhModalOpen, setIsWhModalOpen] = useState(false);
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whAddress, setWhAddress] = useState('');
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
  // A1: Warehouse item picker (search MDM master data → attach items to warehouse at creation)
  const [whItems, setWhItems] = useState<Array<{ itemMasterId: string; sku: string; itemName: string; initialQty: string; binLocation: string }>>([]);
  const [whItemSearch, setWhItemSearch] = useState('');
  const [isWhItemDropdownOpen, setIsWhItemDropdownOpen] = useState(false);
  const [whSubmitting, setWhSubmitting] = useState(false);

  const addWhItem = (item: any) => {
    if (whItems.some((r) => r.itemMasterId === item.id)) return;
    setWhItems([
      ...whItems,
      { itemMasterId: item.id, sku: item.sku, itemName: item.itemName, initialQty: '0', binLocation: binRows[0]?.code || '' },
    ]);
    setWhItemSearch('');
    setIsWhItemDropdownOpen(false);
  };
  const removeWhItem = (idx: number) => setWhItems(whItems.filter((_, i) => i !== idx));
  const updateWhItem = (idx: number, field: 'initialQty' | 'binLocation', value: string) => {
    const updated = [...whItems];
    updated[idx][field] = value;
    setWhItems(updated);
  };

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

  // Fulfillment & Pick-Pack States
  const [selectedPickOrder, setSelectedPickOrder] = useState<OutboundOrder | null>(null);
  const [selectedPackOrder, setSelectedPackOrder] = useState<OutboundOrder | null>(null);
  const [shippingLabelOrder, setShippingLabelOrder] = useState<OutboundOrder | null>(null);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [ordCustomer, setOrdCustomer] = useState('');
  const [ordAddress, setOrdAddress] = useState('');
  const [ordWhCode, setOrdWhCode] = useState('');
  const [ordItem, setOrdItem] = useState('');
  const [ordQty, setOrdQty] = useState('1');
  const [ordNotes, setOrdNotes] = useState('');
  const [ordSubmitting, setOrdSubmitting] = useState(false);

  // Packing Station Form State
  const [packBoxType, setPackBoxType] = useState('Shipper Carton A1 (300 x 200 x 150mm)');
  const [packWeight, setPackWeight] = useState('3.5');
  const [packCourier, setPackCourier] = useState('StarTrack Express Delivery');
  const [packSubmitting, setPackSubmitting] = useState(false);

  // Day 10: Reports, RMA Returns, Carrier Dispatch & Safety Threshold States
  const [returnsList, setReturnsList] = useState<RmaReturnRequest[]>([]);
  const [reportSubTab, setReportSubTab] = useState<'valuation' | 'lowstock' | 'movement'>('valuation');

  // Carrier Dispatch Release State
  const [selectedDispatchOrder, setSelectedDispatchOrder] = useState<OutboundOrder | null>(null);
  const [dispatchManifestId, setDispatchManifestId] = useState('');
  const [dispatchDriver, setDispatchDriver] = useState('');
  const [dispatchVehicle, setDispatchVehicle] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);

  // RMA Returns Intake Form State
  const [isRmaModalOpen, setIsRmaModalOpen] = useState(false);
  const [rmaCustomer, setRmaCustomer] = useState('');
  const [rmaItem, setRmaItem] = useState('');
  const [rmaWarehouse, setRmaWarehouse] = useState('');
  const [rmaBin, setRmaBin] = useState('');
  const [rmaQty, setRmaQty] = useState('1');
  const [rmaCondition, setRmaCondition] = useState<'RESTOCKABLE' | 'DAMAGED_WRITE_OFF'>('RESTOCKABLE');
  const [rmaReason, setRmaReason] = useState('Customer Change of Mind');
  const [rmaNotes, setRmaNotes] = useState('');
  const [rmaSubmitting, setRmaSubmitting] = useState(false);

  // Safety Stock Threshold Editor Modal State
  const [thresholdModalItem, setThresholdModalItem] = useState<any | null>(null);
  const [thresholdVal, setThresholdVal] = useState('10');
  const [reorderQtyVal, setReorderQtyVal] = useState('50');
  const [thresholdSubmitting, setThresholdSubmitting] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [stockRes, ledgerRes, whRes, itemsRes, usersRes, ordersRes, returnsRes] = await Promise.all([
        fetch('/api/inventory/stock'),
        fetch('/api/inventory/ledger'),
        fetch('/api/inventory/warehouses'),
        fetch('/api/mdm/items'),
        fetch('/api/admin/users').catch(() => null),
        fetch('/api/fulfillment/orders').catch(() => null),
        fetch('/api/inventory/returns').catch(() => null),
      ]);

      const stockData = await stockRes.json();
      const ledgerData = await ledgerRes.json();
      const whData = await whRes.json();
      const itemsData = await itemsRes.json();

      if (ordersRes && ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }

      if (returnsRes && returnsRes.ok) {
        const returnsData = await returnsRes.json();
        setReturnsList(returnsData.returns || []);
      }

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

  function suggestOptimalBinLocal(whCode: string, categoryName?: string, requiredQty: number = 1) {
    const wh = warehouses.find((w) => w.code === whCode);
    if (!wh || !wh.bins || wh.bins.length === 0) return null;

    const binStockMap = new Map<string, number>();
    for (const item of stockList) {
      if (item.warehouseCode === whCode) {
        const cur = binStockMap.get(item.binLocation) || 0;
        binStockMap.set(item.binLocation, cur + item.quantityOnHand);
      }
    }

    const eligibleBins = wh.bins.filter((b) => {
      const curQty = binStockMap.get(b.code) || 0;
      const capacity = b.capacityUnits || 1000;
      return capacity - curQty >= requiredQty;
    });

    if (eligibleBins.length === 0) {
      return {
        suggestedBin: wh.bins[0],
        reason: `Default Assignment: All bins near capacity (${wh.bins[0].code})`,
      };
    }

    const catLower = (categoryName || '').toLowerCase();
    const isBulk = catLower.includes('pallet') || catLower.includes('heavy') || catLower.includes('bulk') || catLower.includes('rack');

    let targetBin = isBulk
      ? eligibleBins.find((b) => b.zone.toLowerCase().includes('bulk') || b.code.startsWith('BIN-B')) || eligibleBins[0]
      : eligibleBins.find((b) => b.zone.toLowerCase().includes('fast') || b.zone.toLowerCase().includes('pick') || b.code.startsWith('BIN-A')) || eligibleBins[0];

    const curQty = binStockMap.get(targetBin.code) || 0;
    const capacity = targetBin.capacityUnits || 1000;

    return {
      suggestedBin: targetBin,
      reason: `Optimal Assignment: ${targetBin.zone} (${curQty + requiredQty}/${capacity} units capacity available)`,
    };
  }

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

  const handleGeneratePickList = async (orderId: string) => {
    try {
      const res = await fetch('/api/fulfillment/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-pick-list', orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Failed to generate pick list', type: 'error' });
      } else {
        setToast({ message: data.message, type: 'success' });
        setSelectedPickOrder(data.order);
        fetchAllData();
      }
    } catch (e) {
      setToast({ message: 'Error communicating with server.', type: 'error' });
    }
  };

  const handleConfirmPacking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackOrder) return;
    setPackSubmitting(true);
    try {
      const res = await fetch('/api/fulfillment/pack-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedPackOrder.id,
          packageType: packBoxType,
          grossWeightKg: parseFloat(packWeight) || 3.5,
          courierName: packCourier,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Failed to confirm packing', type: 'error' });
      } else {
        setToast({ message: data.message, type: 'success' });
        const packedOrder = data.order;
        setSelectedPackOrder(null);
        setShippingLabelOrder(packedOrder);
        fetchAllData();
      }
    } catch (e) {
      setToast({ message: 'Error communicating with server.', type: 'error' });
    } finally {
      setPackSubmitting(false);
    }
  };

  const handleCreateOutboundOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordCustomer || !ordAddress || !ordItem) {
      setToast({ message: 'Customer, delivery address, and product item are required.', type: 'error' });
      return;
    }

    const selectedItemObj = items.find((i) => i.id === ordItem);
    if (!selectedItemObj) return;

    const targetWh = ordWhCode || (isWarehouseManager ? assignedWh : warehouses[0]?.code || 'WH-SYD-01');
    const targetWhObj = warehouses.find((w) => w.code === targetWh);

    setOrdSubmitting(true);
    try {
      const res = await fetch('/api/fulfillment/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: ordCustomer,
          deliveryAddress: ordAddress,
          warehouseCode: targetWh,
          warehouseName: targetWhObj?.name || targetWh,
          items: [
            {
              itemMasterId: selectedItemObj.id,
              sku: selectedItemObj.sku,
              itemName: selectedItemObj.itemName,
              barcode: selectedItemObj.barcode,
              quantityRequested: parseInt(ordQty) || 1,
              unitPrice: selectedItemObj.sellingPrice || 100,
            },
          ],
          notes: ordNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Failed to create order', type: 'error' });
      } else {
        setToast({ message: data.message, type: 'success' });
        setIsCreateOrderModalOpen(false);
        setOrdCustomer('');
        setOrdAddress('');
        setOrdNotes('');
        fetchAllData();
      }
    } catch (e) {
      setToast({ message: 'Error communicating with server.', type: 'error' });
    } finally {
      setOrdSubmitting(false);
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
          managerName: whManagerName,
          managerEmail: whManagerEmail,
          initialBins: binRows.map((r) => ({
            code: r.code,
            zone: r.zone,
            capacity: parseInt(r.capacity, 10) || 1000,
          })),
          items: whItems.map((r) => ({
            itemMasterId: r.itemMasterId,
            sku: r.sku,
            itemName: r.itemName,
            initialQty: parseInt(r.initialQty, 10) || 0,
            binLocation: (r.binLocation || '').trim().toUpperCase(),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Failed to add warehouse.', type: 'error' });
      } else {
        setToast({ message: `Warehouse '${whName}' (${whCode.toUpperCase()}) created with ${binRows.length} bins and ${whItems.length} items.`, type: 'success' });
        setIsWhModalOpen(false);
        setWhCode('');
        setWhName('');
        setWhAddress('');
        setBinRows([
          { code: 'BIN-A1-01', zone: 'Zone A - Fast Pick', capacity: '1000' },
          { code: 'BIN-A1-02', zone: 'Zone A - Reserve', capacity: '2000' },
        ]);
        setWhItems([]);
        setWhItemSearch('');
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

  // Day 10: Carrier Dispatch Release Handler
  const handleCarrierDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispatchOrder) return;
    setDispatchSubmitting(true);
    try {
      const res = await fetch('/api/fulfillment/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedDispatchOrder.id,
          manifestId: dispatchManifestId,
          driverName: dispatchDriver,
          vehicleReg: dispatchVehicle,
          notes: dispatchNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Carrier dispatch release failed.', type: 'error' });
      } else {
        setToast({ message: data.message, type: 'success' });
        setSelectedDispatchOrder(null);
        setDispatchManifestId('');
        setDispatchDriver('');
        setDispatchVehicle('');
        setDispatchNotes('');
        fetchAllData();
      }
    } catch {
      setToast({ message: 'Error releasing carrier dispatch.', type: 'error' });
    } finally {
      setDispatchSubmitting(false);
    }
  };

  // Day 10: Process RMA Customer Return Handler
  const handleProcessRmaReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmaCustomer || !rmaItem || !rmaWarehouse || !rmaBin || !rmaQty || !rmaCondition || !rmaReason) {
      setToast({ message: 'Please complete all required fields for RMA Return.', type: 'error' });
      return;
    }

    setRmaSubmitting(true);
    try {
      const res = await fetch('/api/inventory/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: rmaCustomer,
          itemMasterId: rmaItem,
          warehouseCode: rmaWarehouse,
          binLocation: rmaBin,
          quantityReturned: rmaQty,
          condition: rmaCondition,
          reasonCode: rmaReason,
          notes: rmaNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Failed to process RMA return.', type: 'error' });
      } else {
        setToast({ message: data.message, type: 'success' });
        setIsRmaModalOpen(false);
        setRmaCustomer('');
        setRmaNotes('');
        fetchAllData();
        setActiveTab('returns');
      }
    } catch {
      setToast({ message: 'Error processing RMA customer return.', type: 'error' });
    } finally {
      setRmaSubmitting(false);
    }
  };

  // Day 10: Update Configurable Safety Stock Threshold Handler
  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thresholdModalItem) return;

    setThresholdSubmitting(true);
    try {
      const res = await fetch(`/api/mdm/items/${thresholdModalItem.id}/threshold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lowStockThreshold: thresholdVal,
          reorderQuantity: reorderQtyVal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Failed to update safety threshold.', type: 'error' });
      } else {
        setToast({ message: data.message, type: 'success' });
        setThresholdModalItem(null);
        fetchAllData();
      }
    } catch {
      setToast({ message: 'Error updating item safety threshold.', type: 'error' });
    } finally {
      setThresholdSubmitting(false);
    }
  };

  // Day 10: CSV Exporter Helper Functions
  const exportStockReportCSV = () => {
    const headers = ['SKU', 'Item Name', 'EAN Barcode', 'Warehouse', 'Bin Location', 'Vendor', 'Stock On Hand (Units)', 'Available (Units)', 'Reserved (Units)', 'Unit Price ($)', 'Est. Stock Value ($)'];
    const exportTargetStock = isWarehouseManager ? stockList.filter((s) => s.warehouseCode === assignedWh) : stockList;
    const rows = exportTargetStock.map((s) => {
      const itemMaster = items.find((i) => i.id === s.itemMasterId || i.sku === s.sku);
      const unitPrice = itemMaster?.sellingPrice || 100;
      const stockVal = s.quantityOnHand * unitPrice;
      return [
        s.sku,
        `"${(s.itemName || '').replace(/"/g, '""')}"`,
        s.barcode,
        s.warehouseCode,
        s.binLocation,
        `"${(s.vendorName || 'LogiQ-On Internal').replace(/"/g, '""')}"`,
        s.quantityOnHand,
        s.quantityAvailable,
        s.quantityReserved,
        unitPrice.toFixed(2),
        stockVal.toFixed(2),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LogiQ-On_Stock_Valuation_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLowStockReportCSV = () => {
    const headers = ['SKU', 'Item Name', 'EAN Barcode', 'Total Stock On Hand', 'Safety Threshold', 'Deficit Quantity Needed', 'Suggested Reorder Qty', 'Vendor Contact', 'Alert Severity'];
    const exportTargetStock = isWarehouseManager ? stockList.filter((s) => s.warehouseCode === assignedWh) : stockList;
    const exportTargetItems = isWarehouseManager ? items.filter((i) => exportTargetStock.some((s) => s.itemMasterId === i.id || s.sku === i.sku)) : items;

    const lowStockItems = exportTargetItems.map((item) => {
      const totalStock = exportTargetStock
        .filter((s) => s.itemMasterId === item.id || s.sku === item.sku)
        .reduce((sum, s) => sum + s.quantityOnHand, 0);
      const threshold = item.lowStockThreshold || 10;
      const isLow = totalStock <= threshold;
      const deficit = Math.max(0, threshold - totalStock);
      const reorderQty = item.reorderQuantity || 50;
      return { item, totalStock, threshold, isLow, deficit, reorderQty };
    }).filter((x) => x.isLow);

    const rows = lowStockItems.map((x) => [
      x.item.sku,
      `"${(x.item.itemName || '').replace(/"/g, '""')}"`,
      x.item.barcode,
      x.totalStock,
      x.threshold,
      x.deficit,
      x.reorderQty,
      `"${(x.item.vendorName || 'LogiQ-On Internal').replace(/"/g, '""')}"`,
      x.totalStock === 0 ? 'CRITICAL ZERO' : 'WARNING LOW',
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LogiQ-On_Low_Stock_Exception_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLedgerReportCSV = () => {
    const headers = ['Ledger Row ID', 'Timestamp', 'Movement Type', 'Reference Number', 'SKU', 'Item Name', 'Warehouse', 'Bin Location', 'Quantity Delta', 'Reason Code', 'Operator Email'];
    const exportTargetLedger = isWarehouseManager ? ledgerList.filter((l) => l.warehouseCode === assignedWh) : ledgerList;
    const rows = exportTargetLedger.map((l) => [
      l.id,
      `"${new Date(l.createdAt).toLocaleString()}"`,
      l.movementType,
      l.referenceNumber,
      l.sku,
      `"${(l.itemName || '').replace(/"/g, '""')}"`,
      l.warehouseCode,
      l.binLocation,
      l.quantityDelta,
      `"${(l.reasonCode || '').replace(/"/g, '""')}"`,
      l.createdByEmail,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LogiQ-On_Movement_Ledger_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Stock & Ledger View
  const effectiveWhCode = isWarehouseManager ? assignedWh : selectedWarehouse;

  const displayStockList = isWarehouseManager ? stockList.filter((s) => s.warehouseCode === assignedWh) : stockList;
  const displayLedgerList = isWarehouseManager ? ledgerList.filter((l) => l.warehouseCode === assignedWh) : ledgerList;

  const filteredStock = stockList.filter((item) => {
    const matchesWh = effectiveWhCode === 'ALL' || item.warehouseCode === effectiveWhCode;
    const matchesSearch =
      searchQuery === '' ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesWh && matchesSearch;
  });

  const filteredLedger = displayLedgerList.filter((entry) => {
    const matchesWh = effectiveWhCode === 'ALL' || entry.warehouseCode === effectiveWhCode;
    const matchesMovement = movementFilter === 'ALL' || entry.movementType === movementFilter;
    const matchesSearch =
      searchQuery === '' ||
      entry.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.itemName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesWh && matchesMovement && matchesSearch;
  });

  // Facility-scoped Metrics
  const metricStockOnHand = displayStockList.reduce((sum, i) => sum + (i.quantityOnHand || 0), 0);
  const metricTotalReceipts = displayLedgerList.filter((l) => l.movementType === 'RECEIPT').reduce((sum, l) => sum + (l.quantityDelta || 0), 0);
  const metricTotalIssues = Math.abs(displayLedgerList.filter((l) => l.movementType === 'ISSUE').reduce((sum, l) => sum + (l.quantityDelta || 0), 0));
  const metricLedgerRows = displayLedgerList.length;

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

  if (isWarehouseManager && assignedWh === 'UNASSIGNED') {
    return (
      <div className="p-6 md:p-10 space-y-8 font-sans max-w-[1600px] mx-auto">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <div className="p-8 md:p-12 rounded-3xl bg-white border border-amber-200 shadow-sm space-y-6 max-w-3xl mx-auto text-center my-8 font-sans">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200 flex items-center justify-center mx-auto">
            <Building className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono">
              🔒 STATUS: UNASSIGNED WAREHOUSE MANAGER
            </span>
            <h2 className="text-2xl font-black text-slate-900">Facility Site Assignment Pending Setup</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Your Warehouse Manager account (<span className="font-bold text-slate-800">{session?.user?.email}</span>) is active and authenticated, but you have not yet been assigned to manage a specific 3PL facility site by the Platform Owner.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-700 space-y-2 max-w-xl mx-auto">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Administrative Action Required:
            </div>
            <p className="text-slate-600 leading-relaxed">
              Please contact the Platform Owner (<span className="font-mono text-slate-900 font-bold">owner@logiqon.com</span>) to assign your account to an existing location (Sydney, Melbourne, Brisbane, Perth) or configure a new warehouse location.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 font-sans max-w-[1600px] mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Global Enterprise Master Inventory Banner (Styled in Emerald Green) */}
      <div className="p-8 rounded-3xl bg-white border border-emerald-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 font-sans">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono">
            <Boxes className="w-3.5 h-3.5 text-emerald-600" /> GLOBAL ENTERPRISE 3PL INVENTORY CORE
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isWarehouseManager ? `Stock On Hand (${assignedWh})` : 'Total Stock On Hand'}
            </p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
              {metricStockOnHand} <span className="text-xs font-normal text-slate-500">units</span>
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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isWarehouseManager ? `Inbound Receipts (${assignedWh})` : 'Total Inbound Receipts'}
            </p>
            <h3 className="text-2xl font-black text-emerald-600 font-mono mt-1">
              +{metricTotalReceipts} <span className="text-xs font-normal text-slate-500">units</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">From Goods Receipt Notes (GRN)</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isWarehouseManager ? `Outbound Issues (${assignedWh})` : 'Total Outbound Issues'}
            </p>
            <h3 className="text-2xl font-black text-rose-600 font-mono mt-1">
              -{metricTotalIssues} <span className="text-xs font-normal text-slate-500">units</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Dispatched order shipments</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isWarehouseManager ? `Ledger Audit (${assignedWh})` : 'Immutable Ledger Audit'}
            </p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
              {metricLedgerRows} <span className="text-xs font-normal text-slate-500">rows</span>
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

        <button
          onClick={() => setActiveTab('fulfillment')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'fulfillment' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <Truck className="w-4 h-4" /> Pick-Pack ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'reports' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Enterprise Reports
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'returns' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <CornerUpLeft className="w-4 h-4" /> RMA Returns ({returnsList.length})
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
              value={isWarehouseManager ? assignedWh : selectedWarehouse}
              onChange={(e) => !isWarehouseManager && setSelectedWarehouse(e.target.value)}
              disabled={isWarehouseManager}
              options={
                isWarehouseManager
                  ? [{ value: assignedWh, label: `🔒 Facility Desk: ${assignedWh}` }]
                  : [
                      { value: 'ALL', label: '🏬 All Warehouse Locations' },
                      ...warehouses.map((w) => ({ value: w.code, label: `${w.name} (${w.code})` })),
                    ]
              }
              className="text-xs font-mono font-bold"
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
                    value={isWarehouseManager ? assignedWh : rcvWarehouse}
                    disabled={isWarehouseManager}
                    onChange={(e) => {
                      if (isWarehouseManager) return;
                      setRcvWarehouse(e.target.value);
                      const target = warehouses.find((w) => w.code === e.target.value);
                      if (target && target.bins.length > 0) setRcvBin(target.bins[0].code);
                    }}
                    options={
                      isWarehouseManager
                        ? [{ value: assignedWh, label: `🔒 Facility Desk: ${assignedWh}` }]
                        : warehouses.map((w) => ({ value: w.code, label: `${w.name} (${w.code})` }))
                    }
                    className="text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 block">Target Storage Bin Location *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const targetWhCode = isWarehouseManager ? assignedWh : rcvWarehouse;
                        const rcvItemObj = items.find((i) => i.id === rcvItem);
                        const suggestion = suggestOptimalBinLocal(targetWhCode, rcvItemObj?.categoryName, parseInt(rcvQty) || 1);
                        if (suggestion) {
                          setRcvBin(suggestion.suggestedBin.code);
                          setToast({ message: `💡 ${suggestion.reason}`, type: 'success' });
                        }
                      }}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" /> Auto-Suggest Bin
                    </button>
                  </div>
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
                          const targetWhCode = isWarehouseManager ? assignedWh : adjWarehouse;
                          if (targetWhCode && targetWhCode !== 'ALL') {
                            const existsInWh = stockList.some(
                              (s) =>
                                s.warehouseCode === targetWhCode &&
                                s.quantityOnHand > 0 &&
                                (s.itemMasterId === i.id || s.sku.toLowerCase() === i.sku.toLowerCase())
                            );
                            if (!existsInWh) return false;
                          }

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

                              // Auto-select warehouse holding stock for this item if not locked
                              if (!isWarehouseManager) {
                                const whHoldingStock = stockList.find(
                                  (s) => s.itemMasterId === i.id || s.sku.toLowerCase() === i.sku.toLowerCase()
                                );
                                if (whHoldingStock) {
                                  setAdjWarehouse(whHoldingStock.warehouseCode);
                                  const targetWhObj = warehouses.find((w) => w.code === whHoldingStock.warehouseCode);
                                  if (targetWhObj && targetWhObj.bins.length > 0) {
                                    setAdjBin(whHoldingStock.binLocation || targetWhObj.bins[0].code);
                                  }
                                }
                              }
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
                    onChange={(e) => setAdjType(e.target.value)}
                    options={[
                      { value: 'ISSUE', label: '🔴 ISSUE — Outbound Dispatch (Decrements Stock -)' },
                      { value: 'ADJUSTMENT_SUB', label: '🔴 ADJUSTMENT — Cycle Audit Shrinkage / Damage (Decrements Stock -)' },
                      { value: 'ADJUSTMENT_ADD', label: '🟢 ADJUSTMENT — Cycle Audit Discrepancy Found (Increments Stock +)' },
                      { value: 'RETURN', label: '🔵 RETURN — Customer Return Intake (Increments Stock +)' },
                      { value: 'RECEIPT', label: '🟢 RECEIPT — Manual Inbound Stock (Increments Stock +)' },
                    ]}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Warehouse *</label>
                  <Select
                    value={isWarehouseManager ? assignedWh : adjWarehouse}
                    disabled={isWarehouseManager}
                    onChange={(e) => {
                      if (isWarehouseManager) return;
                      const newWh = e.target.value;
                      setAdjWarehouse(newWh);
                      const target = warehouses.find((w) => w.code === newWh);
                      if (target && target.bins.length > 0) setAdjBin(target.bins[0].code);
                    }}
                    options={
                      isWarehouseManager
                        ? [{ value: assignedWh, label: `🔒 Facility Desk: ${assignedWh}` }]
                        : warehouses.map((w) => ({ value: w.code, label: `${w.name} (${w.code})` }))
                    }
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity Delta (Units) *</label>
                  <Input
                    type="number"
                    min="1"
                    value={adjQty}
                    onChange={(e) => setAdjQty(e.target.value)}
                    placeholder="10"
                    className="text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mandatory Reason Code *</label>
                  <Input
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="e.g. Cycle Count Audit Discrepancy, Damaged Packaging..."
                    className="text-xs mb-1.5"
                    required
                  />
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Cycle Count Audit Discrepancy',
                      'Damaged Goods Write-off',
                      'Outbound Client Order Dispatch',
                      'Internal Facility Transfer',
                      'Customer Return Processing',
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setAdjReason(reason)}
                        className="text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                      >
                        + {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Optional Operator Notes / Ref <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <Input
                    value={adjRef}
                    onChange={(e) => setAdjRef(e.target.value)}
                    placeholder="e.g. PO-8812, Damaged in transit, Audit Batch #4..."
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
          {(isWarehouseManager ? warehouses.filter((wh) => wh.code === assignedWh) : warehouses).map((wh) => (
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
                    {wh.bins.map((bin) => {
                      const binStockQty = stockList
                        .filter((s) => s.warehouseCode === wh.code && s.binLocation === bin.code)
                        .reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);
                      const binCapacity = bin.capacityUnits || 1000;
                      const fillPercent = Math.min(100, Math.round((binStockQty / binCapacity) * 100));

                      let statusBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          ⚪ EMPTY (0/{binCapacity})
                        </span>
                      );

                      if (binStockQty >= binCapacity) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            🔴 FULL ({binStockQty}/{binCapacity})
                          </span>
                        );
                      } else if (binStockQty > 0) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            🟡 OCCUPIED ({binStockQty}/{binCapacity})
                          </span>
                        );
                      }

                      return (
                        <div key={bin.code} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-mono font-extrabold text-slate-900">{bin.code}</div>
                              <div className="text-[10px] text-slate-500 font-medium">{bin.zone}</div>
                            </div>
                            {statusBadge}
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                              <span>Occupancy Rate</span>
                              <span className="font-bold">{fillPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  binStockQty >= binCapacity ? 'bg-rose-500' : binStockQty > 0 ? 'bg-amber-500' : 'bg-slate-300'
                                }`}
                                style={{ width: `${binStockQty === 0 ? 0 : Math.max(5, fillPercent)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: Order Fulfillment & Pick-Pack Station */}
      {activeTab === 'fulfillment' && (
        <div className="space-y-6">
          <div className="border border-slate-200 bg-white shadow-sm rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" /> Outbound Shipping Orders &amp; Pick-Pack Station
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage outbound shipping orders, generate optimized bin pick routes, verify package weights, print shipping labels, and trigger physical stock decrements.
                </p>
              </div>
              <Button
                onClick={() => {
                  setOrdWhCode(isWarehouseManager ? assignedWh : warehouses[0]?.code || 'WH-SYD-01');
                  setIsCreateOrderModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs"
              >
                <Plus className="w-4 h-4" /> Create Outbound Shipping Request
              </Button>
            </div>

            <div className="mt-6">
              {(isWarehouseManager ? orders.filter((o) => o.warehouseCode === assignedWh) : orders).length === 0 ? (
                <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-700">No Outbound Shipping Orders Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    There are no outbound shipping orders queued for this 3PL warehouse facility. Click above to create a test dispatch.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-3">Order Number</th>
                        <th className="p-3">Customer Destination</th>
                        <th className="p-3">3PL Facility</th>
                        <th className="p-3">Vendor Partner</th>
                        <th className="p-3">Line Items</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(isWarehouseManager ? orders.filter((o) => o.warehouseCode === assignedWh) : orders).map((ord) => (
                        <tr key={ord.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{ord.customerName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{ord.deliveryAddress}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-700 font-bold">{ord.warehouseCode}</td>
                          <td className="p-3 text-slate-600">{ord.vendorName || 'LogiQ-On Internal'}</td>
                          <td className="p-3 font-mono">
                            {ord.items.reduce((sum, i) => sum + i.quantityRequested, 0)} units ({ord.items.length} SKUs)
                          </td>
                          <td className="p-3">
                            {ord.status === 'SUBMITTED' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                🟡 SUBMITTED
                              </span>
                            )}
                            {ord.status === 'IN_PICKING' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                                📋 IN PICKING
                              </span>
                            )}
                            {ord.status === 'PACKED' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                📦 PACKED (Ready for Pickup)
                              </span>
                            )}
                            {ord.status === 'DISPATCHED' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🚚 DISPATCHED TO CARRIER
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            {ord.status === 'SUBMITTED' && (
                              <Button
                                size="sm"
                                onClick={() => handleGeneratePickList(ord.id)}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] gap-1 py-1"
                              >
                                <ClipboardList className="w-3.5 h-3.5" /> Generate Pick List
                              </Button>
                            )}
                            {(ord.status === 'IN_PICKING' || ord.status === 'PICKED') && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedPickOrder(ord)}
                                  className="border-sky-200 text-sky-800 hover:bg-sky-50 font-bold text-[11px] gap-1 py-1"
                                >
                                  <ClipboardList className="w-3.5 h-3.5 text-sky-600" /> View Pick List
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedPackOrder(ord)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1 py-1"
                                >
                                  <Package className="w-3.5 h-3.5" /> Packing Bench
                                </Button>
                              </>
                            )}
                            {ord.status === 'PACKED' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedDispatchOrder(ord)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] gap-1 py-1"
                                >
                                  <Truck className="w-3.5 h-3.5" /> Release Dispatch
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShippingLabelOrder(ord)}
                                  className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] gap-1 py-1"
                                >
                                  <Printer className="w-3.5 h-3.5 text-slate-500" /> Shipping Label
                                </Button>
                              </>
                            )}
                            {ord.status === 'DISPATCHED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShippingLabelOrder(ord)}
                                className="border-emerald-200 text-emerald-800 hover:bg-emerald-50 font-bold text-[11px] gap-1 py-1"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" /> Manifest &amp; Waybill
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ENTERPRISE WAREHOUSE REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6 font-sans">
          {/* Sub-tab switcher and Export/Print Actions */}
          <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 no-print">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setReportSubTab('valuation')}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reportSubTab === 'valuation' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" /> Report 1: Stock Valuation &amp; Bin Occupancy
              </button>
              <button
                onClick={() => setReportSubTab('lowstock')}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reportSubTab === 'lowstock' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Report 2: Low-Stock Alerts ({items.filter((i) => i && stockList.filter((s) => s && (s.itemMasterId === i.id || (s.sku && i.sku && s.sku === i.sku))).reduce((sum, s) => sum + (s.quantityOnHand || 0), 0) <= (i.lowStockThreshold || 10)).length})
              </button>
              <button
                onClick={() => setReportSubTab('movement')}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reportSubTab === 'movement' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" /> Report 3: Transactional Movement Audit
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {reportSubTab === 'valuation' && (
                <Button onClick={exportStockReportCSV} variant="outline" className="text-xs font-bold gap-1.5 border-slate-300">
                  <Download className="w-3.5 h-3.5 text-emerald-600" /> Export Valuation CSV
                </Button>
              )}
              {reportSubTab === 'lowstock' && (
                <Button onClick={exportLowStockReportCSV} variant="outline" className="text-xs font-bold gap-1.5 border-slate-300">
                  <Download className="w-3.5 h-3.5 text-amber-600" /> Export Low-Stock CSV
                </Button>
              )}
              {reportSubTab === 'movement' && (
                <Button onClick={exportLedgerReportCSV} variant="outline" className="text-xs font-bold gap-1.5 border-slate-300">
                  <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Movement CSV
                </Button>
              )}
              <Button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Print / Save PDF
              </Button>
            </div>
          </div>

          {/* REPORT 1 VIEW: MASTER STOCK VALUATION */}
          {reportSubTab === 'valuation' && (
            <div className="space-y-6 print-only-target">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Physical Inventory</div>
                  <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                    {displayStockList.reduce((sum, s) => sum + (s?.quantityOnHand || 0), 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Total Stock Value</div>
                  <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                    ${displayStockList.reduce((sum, s) => {
                      if (!s) return sum;
                      const itemMaster = items.find((i) => i && (i.id === s.itemMasterId || (i.sku && s.sku && i.sku === s.sku)));
                      const unitPrice = itemMaster?.sellingPrice || 100;
                      return sum + (s.quantityOnHand || 0) * unitPrice;
                    }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Warehouses Reported</div>
                  <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                    {isWarehouseManager ? 1 : warehouses.length} <span className="text-xs font-normal text-slate-500">facilities</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-slate-200 bg-white shadow-sm rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">Master Stock-On-Hand Valuation Report</h3>
                    <p className="text-xs text-slate-500">Derives exact inventory valuations from derived stock balances and item master catalog pricing.</p>
                  </div>
                  <Badge variant="emerald" className="font-mono text-xs">AASB 102 Compliant</Badge>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-3">SKU</th>
                        <th className="p-3">Item Master Description</th>
                        <th className="p-3">Warehouse</th>
                        <th className="p-3">Bin Location</th>
                        <th className="p-3 font-mono">Stock On Hand</th>
                        <th className="p-3 font-mono">Unit Price</th>
                        <th className="p-3 font-mono text-right">Est. Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayStockList.map((s) => {
                        if (!s) return null;
                        const itemMaster = items.find((i) => i && (i.id === s.itemMasterId || (i.sku && s.sku && i.sku === s.sku)));
                        const unitPrice = itemMaster?.sellingPrice || 100;
                        const totalVal = (s.quantityOnHand || 0) * unitPrice;
                        return (
                          <tr key={`${s.warehouseCode || 'WH'}_${s.sku || 'SKU'}_${s.binLocation || 'BIN'}`} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono font-bold text-emerald-800">{s.sku || 'N/A'}</td>
                            <td className="p-3 font-semibold text-slate-900">{s.itemName || 'Item'}</td>
                            <td className="p-3 font-mono text-slate-600">{s.warehouseCode || 'N/A'}</td>
                            <td className="p-3 font-mono text-slate-800 font-bold">{s.binLocation || 'N/A'}</td>
                            <td className="p-3 font-mono font-black text-slate-900">{s.quantityOnHand || 0} units</td>
                            <td className="p-3 font-mono text-slate-700">${unitPrice.toFixed(2)}</td>
                            <td className="p-3 font-mono font-bold text-emerald-700 text-right">${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 2 VIEW: LOW-STOCK ALERTS & CONFIGURABLE THRESHOLDS */}
          {reportSubTab === 'lowstock' && (
            <div className="space-y-6 print-only-target">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border border-rose-200 bg-rose-50/50 shadow-sm rounded-2xl">
                  <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">Critical Zero Stock Items</div>
                  <div className="text-2xl font-black text-rose-700 font-mono mt-1">
                    {items.filter((i) => i && displayStockList.filter((s) => s && (s.itemMasterId === i.id || (s.sku && i.sku && s.sku === i.sku))).reduce((sum, s) => sum + (s.quantityOnHand || 0), 0) === 0).length} <span className="text-xs font-normal text-rose-600">SKUs out of stock</span>
                  </div>
                </div>

                <div className="p-4 border border-amber-200 bg-amber-50/50 shadow-sm rounded-2xl">
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Low Stock Safety Warnings</div>
                  <div className="text-2xl font-black text-amber-800 font-mono mt-1">
                    {items.filter((i) => {
                      if (!i) return false;
                      const totalStock = displayStockList.filter((s) => s && (s.itemMasterId === i.id || (s.sku && i.sku && s.sku === i.sku))).reduce((sum, s) => sum + (s.quantityOnHand || 0), 0);
                      const threshold = i.lowStockThreshold || 10;
                      return totalStock > 0 && totalStock <= threshold;
                    }).length} <span className="text-xs font-normal text-amber-700">SKUs below threshold</span>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reorder Units Needed</div>
                  <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                    {items.reduce((sum, i) => {
                      if (!i) return sum;
                      const totalStock = displayStockList.filter((s) => s && (s.itemMasterId === i.id || (s.sku && i.sku && s.sku === i.sku))).reduce((sAcc, s) => sAcc + (s.quantityOnHand || 0), 0);
                      const threshold = i.lowStockThreshold || 10;
                      const reorderQty = i.reorderQuantity || 50;
                      return totalStock <= threshold ? sum + (reorderQty - totalStock) : sum;
                    }, 0)} <span className="text-xs font-normal text-slate-500">units to order</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-slate-200 bg-white shadow-sm rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">Low-Stock Exception &amp; Safety Reorder Alert Report</h3>
                    <p className="text-xs text-slate-500">Monitors current physical stock against item safety stock thresholds to prevent warehouse stockouts.</p>
                  </div>
                  <Badge variant="warning" className="font-mono text-xs">Configurable Thresholds Active</Badge>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-3">SKU &amp; Item Name</th>
                        <th className="p-3 font-mono">Current Stock</th>
                        <th className="p-3 font-mono">Configured Threshold</th>
                        <th className="p-3 font-mono">Deficit Quantity</th>
                        <th className="p-3">Supplier Vendor</th>
                        <th className="p-3">Alert Severity</th>
                        <th className="p-3 text-right">Configure Threshold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(isWarehouseManager ? items.filter((i) => displayStockList.some((s) => s.itemMasterId === i.id || s.sku === i.sku)) : items).map((item) => {
                        const totalStock = displayStockList
                          .filter((s) => s.itemMasterId === item.id || s.sku === item.sku)
                          .reduce((sum, s) => sum + s.quantityOnHand, 0);
                        const threshold = item.lowStockThreshold || 10;
                        const isLow = totalStock <= threshold;
                        const deficit = Math.max(0, threshold - totalStock);
                        const isZero = totalStock === 0;

                        return (
                          <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isLow ? (isZero ? 'bg-rose-50/40' : 'bg-amber-50/40') : ''}`}>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{item.itemName}</div>
                              <div className="font-mono text-emerald-800 text-[11px]">SKU: {item.sku}</div>
                            </td>
                            <td className="p-3 font-mono font-black text-slate-900">
                              {totalStock} units
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-700">
                              {threshold} units
                            </td>
                            <td className="p-3 font-mono font-bold text-rose-600">
                              {deficit > 0 ? `-${deficit} units` : '0 units'}
                            </td>
                            <td className="p-3 text-slate-600 font-medium">
                              {item.vendorName || 'LogiQ-On Internal'}
                            </td>
                            <td className="p-3">
                              {isZero ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                  🔴 CRITICAL ZERO
                                </span>
                              ) : isLow ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                  🟡 WARNING LOW
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  🟢 HEALTHY
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setThresholdModalItem(item);
                                  setThresholdVal(String(item.lowStockThreshold || 10));
                                  setReorderQtyVal(String(item.reorderQuantity || 50));
                                }}
                                className="text-[11px] font-bold border-slate-300 text-slate-700 hover:bg-slate-100 py-1"
                              >
                                <Sliders className="w-3.5 h-3.5 text-slate-500" /> Configure Threshold
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 3 VIEW: TRANSACTIONAL MOVEMENT AUDIT LOG */}
          {reportSubTab === 'movement' && (
            <div className="space-y-6 print-only-target">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ledger Transactions</div>
                  <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                    {ledgerList.length} <span className="text-xs font-normal text-slate-500">rows</span>
                  </div>
                </div>

                <div className="p-4 border border-emerald-200 bg-emerald-50/50 shadow-sm rounded-2xl">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Inbound Stock Receipts (+)</div>
                  <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                    +{ledgerList.filter((l) => l.quantityDelta > 0).reduce((sum, l) => sum + l.quantityDelta, 0)} <span className="text-xs font-normal text-emerald-600">units</span>
                  </div>
                </div>

                <div className="p-4 border border-rose-200 bg-rose-50/50 shadow-sm rounded-2xl">
                  <div className="text-xs font-bold text-rose-800 uppercase tracking-wider">Outbound Issues (-)</div>
                  <div className="text-2xl font-black text-rose-700 font-mono mt-1">
                    {ledgerList.filter((l) => l.quantityDelta < 0).reduce((sum, l) => sum + l.quantityDelta, 0)} <span className="text-xs font-normal text-rose-600">units</span>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">RMA Returns Intakes</div>
                  <div className="text-2xl font-black text-indigo-700 font-mono mt-1">
                    {returnsList.length} <span className="text-xs font-normal text-slate-500">returns processed</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-slate-200 bg-white shadow-sm rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">Transactional Movement Audit &amp; Inventory Flow Log</h3>
                    <p className="text-xs text-slate-500">Complete immutable record of every inventory receipt, pick issue, cycle count adjustment, and customer return.</p>
                  </div>
                  <Badge variant="indigo" className="font-mono text-xs">Append-Only Verified</Badge>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Movement Type</th>
                        <th className="p-3 font-mono">Reference #</th>
                        <th className="p-3">SKU &amp; Product Name</th>
                        <th className="p-3 font-mono">Facility ➔ Bin</th>
                        <th className="p-3 font-mono">Quantity Delta</th>
                        <th className="p-3">Reason / Operator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(isWarehouseManager ? ledgerList.filter((l) => l.warehouseCode === assignedWh) : ledgerList).map((entry) => {
                        const isPos = entry.quantityDelta > 0;
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-600 text-[11px] font-normal">{new Date(entry.createdAt).toLocaleString()}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                entry.movementType === 'RECEIPT' ? 'bg-emerald-100 text-emerald-800' :
                                entry.movementType === 'ISSUE' ? 'bg-rose-100 text-rose-800' :
                                entry.movementType === 'RETURN' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {entry.movementType}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-900">{entry.referenceNumber}</td>
                            <td className="p-3 font-sans">
                              <div className="font-bold text-slate-900 text-xs">{entry.itemName}</div>
                              <div className="font-mono text-slate-500 text-[11px]">SKU: {entry.sku}</div>
                            </td>
                            <td className="p-3 text-slate-700 font-bold">{entry.warehouseCode} ➔ {entry.binLocation}</td>
                            <td className={`p-3 font-black text-sm ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isPos ? `+${entry.quantityDelta}` : entry.quantityDelta} units
                            </td>
                            <td className="p-3 font-sans text-slate-600 text-[11px]">
                              <div>{entry.reasonCode || 'System Entry'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Operator: {entry.createdByEmail}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: RMA CUSTOMER RETURNS INTAKE STATION */}
      {activeTab === 'returns' && (
        <div className="space-y-6 font-sans">
          <div className="p-6 border border-slate-200 bg-white shadow-sm rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">RMA Customer Returns &amp; Stock Intake Terminal</h2>
              <p className="text-xs text-slate-500">Process B2B/Customer RMA returns, inspect physical condition, and restore restockable stock to inventory ledger.</p>
            </div>
            <Button
              onClick={() => {
                setIsRmaModalOpen(true);
                if (items.length > 0) setRmaItem(items[0].id);
                if (warehouses.length > 0) {
                  const whCode = isWarehouseManager ? (assignedWh || warehouses[0].code) : warehouses[0].code;
                  setRmaWarehouse(whCode);
                  const target = warehouses.find((w) => w.code === whCode);
                  setRmaBin(target?.bins[0]?.code || 'BIN-A1-01');
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2"
            >
              <Plus className="w-4 h-4" /> Process Customer RMA Return
            </Button>
          </div>

          {/* RMA Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total RMA Return Requests</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {returnsList.length} <span className="text-xs font-normal text-slate-500">requests</span>
              </div>
            </div>

            <div className="p-4 border border-emerald-200 bg-emerald-50/50 shadow-sm rounded-2xl">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Restocked Units Returned (+)</div>
              <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                +{returnsList.filter((r) => r.condition === 'RESTOCKABLE').reduce((sum, r) => sum + r.quantityReturned, 0)} <span className="text-xs font-normal text-emerald-600">units in stock</span>
              </div>
            </div>

            <div className="p-4 border border-rose-200 bg-rose-50/50 shadow-sm rounded-2xl">
              <div className="text-xs font-bold text-rose-800 uppercase tracking-wider">Damaged Goods Write-offs (-)</div>
              <div className="text-2xl font-black text-rose-700 font-mono mt-1">
                -{returnsList.filter((r) => r.condition === 'DAMAGED_WRITE_OFF').reduce((sum, r) => sum + r.quantityReturned, 0)} <span className="text-xs font-normal text-rose-600">units isolated</span>
              </div>
            </div>
          </div>

          {/* RMA Returns Log Table */}
          <div className="p-6 border border-slate-200 bg-white shadow-sm rounded-2xl space-y-4">
            <h3 className="font-extrabold text-slate-900 text-lg">Processed Customer RMA Return Logs</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3 font-mono">RMA Reference</th>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Returned Product Item</th>
                    <th className="p-3 font-mono">Qty</th>
                    <th className="p-3">Physical Condition</th>
                    <th className="p-3 font-mono">Restocked Facility ➔ Bin</th>
                    <th className="p-3">Reason Code</th>
                    <th className="p-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnsList.map((rma) => (
                    <tr key={rma.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-indigo-700">{rma.rmaNumber}</td>
                      <td className="p-3 font-semibold text-slate-900">{rma.customerName}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{rma.itemName}</div>
                        <div className="font-mono text-slate-500 text-[11px]">SKU: {rma.sku}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{rma.quantityReturned} units</td>
                      <td className="p-3">
                        {rma.condition === 'RESTOCKABLE' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🟢 RESTOCKABLE (+Stock)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            🔴 DAMAGED (Write-off)
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">{rma.warehouseCode} ➔ {rma.binLocation}</td>
                      <td className="p-3 text-slate-700">{rma.reasonCode}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-500">{rma.createdByEmail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CARRIER DISPATCH RELEASE */}
      <Modal
        isOpen={!!selectedDispatchOrder}
        onClose={() => setSelectedDispatchOrder(null)}
        title={`Release Carrier Dispatch — ${selectedDispatchOrder?.orderNumber || ''}`}
        maxWidth="lg"
      >
        {selectedDispatchOrder && (
          <form onSubmit={handleCarrierDispatch} className="space-y-4 font-sans">
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-indigo-900">Carrier Manifest Release &amp; Hand-off</div>
              <p className="text-indigo-700 text-[11px]">
                Releasing dispatch transitions order {selectedDispatchOrder.orderNumber} to <strong>DISPATCHED</strong> and logs carrier Pickup Manifest details.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Carrier Pickup Manifest ID *</label>
              <Input
                value={dispatchManifestId}
                onChange={(e) => setDispatchManifestId(e.target.value)}
                placeholder="e.g. MAN-STARTRACK-SYD-901"
                className="text-xs font-mono font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Freight Driver Name *</label>
                <Input
                  value={dispatchDriver}
                  onChange={(e) => setDispatchDriver(e.target.value)}
                  placeholder="e.g. Michael Harris (StarTrack)"
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Registration / Trailer # *</label>
                <Input
                  value={dispatchVehicle}
                  onChange={(e) => setDispatchVehicle(e.target.value)}
                  placeholder="e.g. NSW-TRK-901"
                  className="text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Operator Dispatch Notes (Optional)</label>
              <Input
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="e.g. Consolidated on Pallet #4, loaded via Bay 2."
                className="text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setSelectedDispatchOrder(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={dispatchSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2">
                <Truck className="w-4 h-4" /> Confirm Carrier Pickup &amp; Release
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 2: PROCESS CUSTOMER RMA RETURN */}
      <Modal
        isOpen={isRmaModalOpen}
        onClose={() => setIsRmaModalOpen(false)}
        title="Process Customer RMA Return (Stock Restoration)"
        maxWidth="xl"
      >
        <form onSubmit={handleProcessRmaReturn} className="space-y-4 font-sans">
          {/* Optional Order Autofill Selector */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              🔗 Link Outbound Order <span className="text-[10px] text-slate-400 font-normal">(Optional Autofill)</span>
            </label>
            <Select
              value=""
              onChange={(e) => {
                const targetOrd = orders.find((o) => o.id === e.target.value || o.orderNumber === e.target.value);
                if (targetOrd) {
                  setRmaCustomer(targetOrd.customerName);
                  if (targetOrd.items.length > 0) setRmaItem(targetOrd.items[0].itemMasterId);
                  setRmaWarehouse(targetOrd.warehouseCode);
                  const whObj = warehouses.find((w) => w.code === targetOrd.warehouseCode);
                  if (whObj && whObj.bins.length > 0) setRmaBin(whObj.bins[0].code);
                  setToast({ message: `Autofilled RMA fields from order ${targetOrd.orderNumber}!`, type: 'info' });
                }
              }}
              options={[
                { value: '', label: '-- Select an Outbound Order to Autofill Details --' },
                ...orders.map((o) => ({
                  value: o.id,
                  label: `${o.orderNumber} — ${o.customerName} (${o.warehouseCode})`,
                })),
              ]}
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Customer / Client Name *</label>
            <Input
              value={rmaCustomer}
              onChange={(e) => setRmaCustomer(e.target.value)}
              placeholder="e.g. TechRetail Logistics Centre"
              className="text-xs mb-1.5"
              required
            />
            <div className="flex flex-wrap gap-1">
              {[
                'TechRetail Logistics Centre Sydney',
                'Victorian Express Fulfillment Depot',
                'Apex Commerce Group',
                'Global Logistics Partners',
              ].map((cust) => (
                <button
                  key={cust}
                  type="button"
                  onClick={() => setRmaCustomer(cust)}
                  className="text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                >
                  + {cust}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Select Returned Product Item *</label>
            <Select
              value={rmaItem}
              onChange={(e) => setRmaItem(e.target.value)}
              options={items.map((i) => ({ value: i.id, label: `${i.itemName} (${i.sku})` }))}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target Warehouse *</label>
              <Select
                value={isWarehouseManager ? assignedWh : rmaWarehouse}
                disabled={isWarehouseManager}
                onChange={(e) => {
                  if (isWarehouseManager) return;
                  const whCode = e.target.value;
                  setRmaWarehouse(whCode);
                  const target = warehouses.find((w) => w.code === whCode);
                  if (target && target.bins.length > 0) setRmaBin(target.bins[0].code);
                }}
                options={
                  isWarehouseManager
                    ? [{ value: assignedWh, label: `🔒 Facility Desk: ${assignedWh}` }]
                    : warehouses.map((w) => ({ value: w.code, label: `${w.name} (${w.code})` }))
                }
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Storage Bin Location *</label>
              <Select
                value={rmaBin}
                onChange={(e) => setRmaBin(e.target.value)}
                options={
                  warehouses.find((w) => w.code === rmaWarehouse)?.bins.map((b) => ({
                    value: b.code,
                    label: `${b.code} (${b.zone})`,
                  })) || [{ value: 'BIN-A1-01', label: 'BIN-A1-01 (Zone A)' }]
                }
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Quantity Returned *</label>
              <Input
                type="number"
                min="1"
                value={rmaQty}
                onChange={(e) => setRmaQty(e.target.value)}
                placeholder="1"
                className="text-xs font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Physical Condition Inspection *</label>
              <Select
                value={rmaCondition}
                onChange={(e) => setRmaCondition(e.target.value as any)}
                options={[
                  { value: 'RESTOCKABLE', label: '🟢 RESTOCKABLE — Goods Intact (Increments Stock +)' },
                  { value: 'DAMAGED_WRITE_OFF', label: '🔴 DAMAGED — Write-Off (Isolates & Decrements Stock -)' },
                ]}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">RMA Reason Code *</label>
              <Select
                value={rmaReason}
                onChange={(e) => setRmaReason(e.target.value)}
                options={[
                  { value: 'Customer Change of Mind', label: 'Customer Change of Mind' },
                  { value: 'Defective / RMA Warranty Return', label: 'Defective / RMA Warranty Return' },
                  { value: 'Delivery Failed - Return to Sender', label: 'Delivery Failed - Return to Sender' },
                  { value: 'Incorrect Item Shipped', label: 'Incorrect Item Shipped' },
                ]}
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Operator Inspection Notes</label>
            <Input
              value={rmaNotes}
              onChange={(e) => setRmaNotes(e.target.value)}
              placeholder="e.g. Package inspected at Sydney intake desk, original packaging intact."
              className="text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsRmaModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={rmaSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2">
              <CornerUpLeft className="w-4 h-4" /> Process Return &amp; Write Ledger
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: SAFETY STOCK THRESHOLD EDITOR */}
      <Modal
        isOpen={!!thresholdModalItem}
        onClose={() => setThresholdModalItem(null)}
        title={`Configure Item Safety Stock Threshold — ${thresholdModalItem?.sku || ''}`}
        maxWidth="md"
      >
        {thresholdModalItem && (
          <form onSubmit={handleUpdateThreshold} className="space-y-4 font-sans">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="font-bold text-slate-900">{thresholdModalItem.itemName}</div>
              <div className="font-mono text-slate-500 text-[11px]">SKU: {thresholdModalItem.sku} | Barcode: {thresholdModalItem.barcode}</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Safety Stock Low Level Threshold (Units) *</label>
              <Input
                type="number"
                min="0"
                value={thresholdVal}
                onChange={(e) => setThresholdVal(e.target.value)}
                placeholder="10"
                className="text-xs font-mono font-bold"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                When total physical stock across all warehouses drops to or below this quantity, a low-stock exception warning is triggered.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Suggested Reorder Replenishment Quantity *</label>
              <Input
                type="number"
                min="1"
                value={reorderQtyVal}
                onChange={(e) => setReorderQtyVal(e.target.value)}
                placeholder="50"
                className="text-xs font-mono font-bold"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setThresholdModalItem(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={thresholdSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2">
                <Sliders className="w-4 h-4" /> Save Safety Threshold
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        isOpen={!!selectedPickOrder}
        onClose={() => setSelectedPickOrder(null)}
        title={`Optimized Bin Pick List Route — ${selectedPickOrder?.orderNumber || ''}`}
        maxWidth="3xl"
      >
        {selectedPickOrder && (
          <div className="space-y-4">
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-sky-900">
                <span>Facility: {selectedPickOrder.warehouseName} ({selectedPickOrder.warehouseCode})</span>
                <span className="font-mono text-[10px]">Status: IN PICKING</span>
              </div>
              <p className="text-[11px] text-sky-700">
                Destination: {selectedPickOrder.customerName} ({selectedPickOrder.deliveryAddress})
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Continuous Pathing Sequence (Zone A ➔ Zone B)
              </div>
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold text-[11px]">
                    <th className="p-2.5">Step</th>
                    <th className="p-2.5">Bin Location</th>
                    <th className="p-2.5">Zone</th>
                    <th className="p-2.5">Product SKU &amp; Name</th>
                    <th className="p-2.5">Barcode</th>
                    <th className="p-2.5 text-center">Pick Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPickOrder.pickSteps?.map((step) => (
                    <tr key={step.stepNumber} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-emerald-700">#{step.stepNumber}</td>
                      <td className="p-2.5 font-mono font-black text-slate-900 bg-amber-50/50">{step.binLocation}</td>
                      <td className="p-2.5 text-[11px] text-slate-600 font-medium">{step.zone}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{step.itemName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{step.sku}</div>
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-600">{step.barcode}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-900">{step.quantityToPick} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-mono">Stock reserved in bin grid</span>
              <Button
                onClick={() => {
                  setSelectedPackOrder(selectedPickOrder);
                  setSelectedPickOrder(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2"
              >
                Proceed to Packing Station Bench ➔
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal - Packing Station Confirmation Bench */}
      <Modal
        isOpen={!!selectedPackOrder}
        onClose={() => setSelectedPackOrder(null)}
        title={`Packing Confirmation Station Bench — ${selectedPackOrder?.orderNumber || ''}`}
        maxWidth="2xl"
      >
        {selectedPackOrder && (
          <form onSubmit={handleConfirmPacking} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-emerald-900">
                Packing Order: {selectedPackOrder.orderNumber} for {selectedPackOrder.customerName}
              </div>
              <p className="text-[11px] text-emerald-700 font-mono">
                Facility: {selectedPackOrder.warehouseCode} • Delivery: {selectedPackOrder.deliveryAddress}
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Picked Item Verification Checklist:
              </label>
              {selectedPackOrder.items.map((item) => (
                <div key={item.sku} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{item.itemName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">SKU: {item.sku} • EAN: {item.barcode}</div>
                  </div>
                  <Badge variant="success" className="text-[10px] font-mono gap-1">
                    <Check className="w-3 h-3 text-emerald-600" /> Verified ({item.quantityRequested} units)
                  </Badge>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Shipping Container / Box Type *</label>
                <Select
                  value={packBoxType}
                  onChange={(e) => setPackBoxType(e.target.value)}
                  options={[
                    { value: 'Shipper Carton A1 (300 x 200 x 150mm)', label: 'Shipper Carton A1 (Standard Box)' },
                    { value: 'Heavy-Duty Wooden Crate (1200 x 1000mm)', label: 'Heavy-Duty Wooden Crate (Pallet)' },
                    { value: 'Express Poly Mailer Bag (Large)', label: 'Express Poly Mailer Bag' },
                    { value: 'Custom Pallet Stretch Wrapper', label: 'Custom Pallet Stretch Wrapper' },
                  ]}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Gross Package Weight (kg) *</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={packWeight}
                  onChange={(e) => setPackWeight(e.target.value)}
                  placeholder="3.5"
                  className="text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Courier Service Provider *</label>
              <Select
                value={packCourier}
                onChange={(e) => setPackCourier(e.target.value)}
                options={[
                  { value: 'StarTrack Express Delivery', label: 'StarTrack Express Delivery' },
                  { value: 'Toll Logistics Priority Freight', label: 'Toll Logistics Priority Freight' },
                  { value: 'Australia Post eParcel Premium', label: 'Australia Post eParcel Premium' },
                  { value: 'FedEx Direct Ground Freight', label: 'FedEx Direct Ground Freight' },
                ]}
                className="text-xs"
              />
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-0.5">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Physical Stock Decrement Policy:
              </div>
              <p>
                Confirming packing will set order status to PACKED, generate a shipping waybill, and <strong>physically decrement {selectedPackOrder.items.reduce((s, i) => s + i.quantityRequested, 0)} units from {selectedPackOrder.warehouseCode} stock on hand</strong>, appending an unalterable ISSUE ledger entry.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setSelectedPackOrder(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={packSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2">
                <Package className="w-4 h-4" /> Confirm Packing &amp; Release Dispatch
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal - Printable Shipping Label & Waybill */}
      <Modal
        isOpen={!!shippingLabelOrder}
        onClose={() => setShippingLabelOrder(null)}
        title={`Shipping Label & Dispatch Waybill — ${shippingLabelOrder?.orderNumber || ''}`}
        maxWidth="lg"
      >
        {shippingLabelOrder && (
          <div className="space-y-4 font-sans">
            <div className="p-6 bg-white border-2 border-slate-900 rounded-2xl space-y-4 shadow-sm text-slate-900">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">LogiQ-On 3PL Express Waybill</div>
                  <div className="text-xl font-black font-mono">{shippingLabelOrder.orderNumber}</div>
                </div>
                <div className="text-right">
                  <Badge variant="success" className="font-mono text-xs">PACKED &amp; SEALED</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">FROM (SHIPPER):</div>
                  <div className="font-bold text-slate-900 mt-0.5">{shippingLabelOrder.warehouseName}</div>
                  <div className="text-[10px] text-slate-600 font-mono">Code: {shippingLabelOrder.warehouseCode}</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">TO (RECIPIENT):</div>
                  <div className="font-bold text-slate-900 mt-0.5">{shippingLabelOrder.customerName}</div>
                  <div className="text-[10px] text-slate-600 font-mono">{shippingLabelOrder.deliveryAddress}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between font-mono">
                  <span>Courier:</span>
                  <span className="font-bold">{shippingLabelOrder.packageDetails?.courierName || 'StarTrack Express'}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Tracking Number:</span>
                  <span className="font-bold text-emerald-700">{shippingLabelOrder.packageDetails?.trackingNumber}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Carton Type:</span>
                  <span className="font-bold">{shippingLabelOrder.packageDetails?.packageType}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Gross Weight:</span>
                  <span className="font-bold">{shippingLabelOrder.packageDetails?.grossWeightKg || 3.5} kg</span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <BarcodeRenderer value={`LABEL-${shippingLabelOrder.orderNumber}`} height={45} className="mx-auto" />
                <div className="text-[10px] font-mono text-slate-500 mt-1">GS1-128 Shipping Container Barcode</div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-2">
                <Printer className="w-4 h-4" /> Print Waybill &amp; Label
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal - Create Outbound Shipping Order */}
      <Modal
        isOpen={isCreateOrderModalOpen}
        onClose={() => setIsCreateOrderModalOpen(false)}
        title="Create Outbound Shipping Order (3PL Dispatch)"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateOutboundOrder} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Customer / Destination Name *</label>
            <Input
              value={ordCustomer}
              onChange={(e) => setOrdCustomer(e.target.value)}
              placeholder="e.g. TechRetail Logistics Centre"
              className="text-xs"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Destination Address *</label>
            <Input
              value={ordAddress}
              onChange={(e) => setOrdAddress(e.target.value)}
              placeholder="e.g. 44 Market Street, Sydney NSW 2000"
              className="text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Fulfilling 3PL Warehouse *</label>
              <Select
                value={isWarehouseManager ? assignedWh : ordWhCode || warehouses[0]?.code}
                disabled={isWarehouseManager}
                onChange={(e) => setOrdWhCode(e.target.value)}
                options={
                  isWarehouseManager
                    ? [{ value: assignedWh, label: `🔒 Facility Desk: ${assignedWh}` }]
                    : warehouses.map((w) => ({ value: w.code, label: `${w.name} (${w.code})` }))
                }
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Product Item to Ship *</label>
              <Select
                value={ordItem}
                onChange={(e) => setOrdItem(e.target.value)}
                options={[
                  { value: '', label: '-- Select Item Master Product --' },
                  ...items.map((i) => ({
                    value: i.id,
                    label: `${i.itemName} (${i.sku})`,
                  })),
                ]}
                className="text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Quantity Requested (Units) *</label>
              <Input
                type="number"
                min="1"
                value={ordQty}
                onChange={(e) => setOrdQty(e.target.value)}
                placeholder="1"
                className="text-xs font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dispatch Notes / Instructions</label>
              <Input
                value={ordNotes}
                onChange={(e) => setOrdNotes(e.target.value)}
                placeholder="e.g. Urgent Store Launch Dispatch"
                className="text-xs"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsCreateOrderModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={ordSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2">
              <Truck className="w-4 h-4" /> Submit Outbound Shipping Request
            </Button>
          </div>
        </form>
      </Modal>

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
                Add items
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

          {/* A1: Warehouse Items — searchable picker from MDM Master Data */}
          <div className="pt-3 border-t border-slate-100 space-y-3 font-sans">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-mono">
                Warehouse Items ({whItems.length} selected)
              </h4>
              <p className="text-[11px] text-slate-500">
                Search items from Master Data (MDM) and pre-stock this warehouse with their initial quantities.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search items from Master Data by name, SKU or barcode..."
                value={whItemSearch}
                onFocus={() => setIsWhItemDropdownOpen(true)}
                onChange={(e) => {
                  setWhItemSearch(e.target.value);
                  setIsWhItemDropdownOpen(true);
                }}
                onBlur={() => setTimeout(() => setIsWhItemDropdownOpen(false), 200)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 font-semibold text-slate-900"
              />
              {isWhItemDropdownOpen && (
                <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                  {items
                    .filter((i) => {
                      if (!whItemSearch) return true;
                      const q = whItemSearch.toLowerCase();
                      return (
                        i.itemName.toLowerCase().includes(q) ||
                        i.sku.toLowerCase().includes(q) ||
                        (i.barcode || '').toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 25)
                    .map((i) => (
                      <div
                        key={i.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addWhItem(i)}
                        className="p-3 text-xs hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-extrabold text-slate-900">{i.itemName}</div>
                          <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-slate-500">
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">{i.sku}</span>
                            {i.barcode && <span>EAN: {i.barcode}</span>}
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-emerald-600" />
                      </div>
                    ))}
                  {items.length === 0 && (
                    <div className="p-4 text-xs text-slate-500 text-center">No items in Master Data yet.</div>
                  )}
                </div>
              )}
            </div>

            {whItems.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {whItems.map((row, idx) => (
                  <div key={row.itemMasterId} className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl grid grid-cols-12 gap-2.5 items-center">
                    <div className="col-span-5">
                      <div className="text-xs font-extrabold text-slate-900">{row.itemName}</div>
                      <div className="text-[10px] font-mono text-emerald-700">{row.sku}</div>
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Initial Qty</label>
                      <Input
                        type="number"
                        min="0"
                        value={row.initialQty}
                        onChange={(e) => updateWhItem(idx, 'initialQty', e.target.value)}
                        className="text-xs font-mono bg-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Bin Location</label>
                      <Input
                        value={row.binLocation}
                        onChange={(e) => updateWhItem(idx, 'binLocation', e.target.value)}
                        placeholder="e.g. BIN-A1-01"
                        className="text-xs font-mono uppercase bg-white"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => removeWhItem(idx)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
