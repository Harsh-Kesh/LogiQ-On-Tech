'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Boxes,
  Receipt,
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
  Package,
  Barcode,
  Sparkles,
  Check,
  Printer,
  BarChart3,
  Download,
  CornerUpLeft,
  Sliders,
  UploadCloud,
  X,
} from 'lucide-react';
import WarehouseOpsTabs from '@/components/warehouse/WarehouseOpsTabs';
import * as XLSX from 'xlsx';
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
  const isOwner = userRole === 'PLATFORM_OWNER';

  const [activeTab, setActiveTab] = useState<'stock' | 'grn' | 'adjustment' | 'ledger' | 'locations'>('stock');

  // Data States
  const [stockList, setStockList] = useState<StockOnHandItem[]>([]);
  const [ledgerList, setLedgerList] = useState<StockLedgerEntry[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLocation[]>([]);
  const [items, setItems] = useState<any[]>([]);
  // Warehouse-wide totals (unfiltered by vendor) — used only for capacity/utilization
  // figures, never for item-level breakdowns, so a vendor's own view of "how much stock
  // sits in this warehouse" stays accurate even though their item list is scoped to them.
  const [whSummary, setWhSummary] = useState<Record<string, { totalQty: number; itemCount: number }>>({});
    const [loading, setLoading] = useState(true);

  // Form States - GRN Bulk Excel Import
  const [grnImportRows, setGrnImportRows] = useState<Array<{ sku: string; itemName?: string; warehouseCode: string; quantity: number; reasonCode?: string; referenceNumber?: string; error?: string }>>([]);
  const [grnImportFileName, setGrnImportFileName] = useState('');
  const [grnImportSubmitting, setGrnImportSubmitting] = useState(false);

  // Filter States
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [movementFilter, setMovementFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form States - Receive Goods
  
  // Form States - Stock Adjustments
  const [adjItem, setAdjItem] = useState('');
  const [adjWarehouse, setAdjWarehouse] = useState('');
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
  // A1: Warehouse item picker (search MDM master data → attach items to warehouse at creation)
  const [whItems, setWhItems] = useState<Array<{ itemMasterId: string; sku: string; itemName: string; initialQty: string }>>([]);
  const [whItemSearch, setWhItemSearch] = useState('');
  const [isWhItemDropdownOpen, setIsWhItemDropdownOpen] = useState(false);
  const [whSubmitting, setWhSubmitting] = useState(false);

  const addWhItem = (item: any) => {
    if (whItems.some((r) => r.itemMasterId === item.id)) return;
    setWhItems([...whItems, { itemMasterId: item.id, sku: item.sku, itemName: item.itemName, initialQty: '0' }]);
    setWhItemSearch('');
    setIsWhItemDropdownOpen(false);
  };
  const removeWhItem = (idx: number) => setWhItems(whItems.filter((_, i) => i !== idx));
  const updateWhItem = (idx: number, field: 'initialQty', value: string) => {
    const updated = [...whItems];
    updated[idx][field] = value;
    setWhItems(updated);
  };

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
      const [stockRes, ledgerRes, whRes, itemsRes, summaryRes] = await Promise.all([
        fetch('/api/inventory/stock').catch(() => null),
        fetch('/api/inventory/ledger').catch(() => null),
        fetch('/api/inventory/warehouses').catch(() => null),
        fetch('/api/mdm/items').catch(() => null),
        fetch('/api/inventory/warehouse-summary').catch(() => null),
      ]);

      const stockData = stockRes && stockRes.ok ? await stockRes.json() : { stock: [] };
      const ledgerData = ledgerRes && ledgerRes.ok ? await ledgerRes.json() : { ledger: [] };
      const whData = whRes && whRes.ok ? await whRes.json() : { warehouses: [] };
      const itemsData = itemsRes && itemsRes.ok ? await itemsRes.json() : { items: [] };
      const summaryData = summaryRes && summaryRes.ok ? await summaryRes.json() : { summary: {} };
      setWhSummary(summaryData.summary || {});

      setStockList(stockData.stock || []);
      setLedgerList(ledgerData.ledger || []);
      setWarehouses(whData.warehouses || []);
      setItems(itemsData.items || []);

      if (whData.warehouses && whData.warehouses.length > 0) {
        const defaultWh = whData.warehouses[0].code;
        if (!adjWarehouse) setAdjWarehouse(defaultWh);
      }
      if (itemsData.items && itemsData.items.length > 0) {
        if (!adjItem) setAdjItem(itemsData.items[0].id);
      }
    } catch (e) {
      console.error('Error fetching inventory data:', e);
      setToast({ message: 'Failed to load inventory data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjItem || !adjWarehouse || !adjQty || !adjReason) {
      setToast({ message: 'Please provide a valid item, warehouse, quantity, and reason code.', type: 'error' });
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

  // GRN Bulk Excel Import — vendors only ever see their own items in the template so a
  // vendor can't accidentally (or otherwise) stage a receipt against someone else's SKU;
  // the server still re-validates ownership row-by-row regardless.
  const downloadGrnTemplate = () => {
    const templateItems = (items || []).filter((i) => {
      if (userRole !== 'VENDOR') return true;
      const userEmail = (session?.user?.email || '').toLowerCase();
      const userComp = ((session?.user as any)?.companyName || '').toLowerCase();
      const vEmail = (i.vendorEmail || '').toLowerCase();
      const vName = (i.vendorName || '').toLowerCase();
      return (
        (vEmail && vEmail === userEmail) ||
        (userComp && vName && (vName.includes(userComp) || userComp.includes(vName))) ||
        (userEmail.includes('vendor') && vName.includes('apex')) ||
        (userEmail.includes('supplier') && vName.includes('pacific'))
      );
    });

    const header = ['SKU', 'Warehouse Code', 'Quantity', 'Reason', 'Reference Number (optional)'];
    const sampleRows = templateItems.slice(0, 3).map((i) => [i.sku, warehouses[0]?.code || 'WH-SYD-01', 10, 'Inbound batch restock from supplier', '']);
    const referenceSheet = templateItems.map((i) => [i.sku, i.itemName, i.vendorName || 'Platform']);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...(sampleRows.length ? sampleRows : [['', '', '', '', '']])]);
    ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 32 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws, 'GRN Import');

    const refWs = XLSX.utils.aoa_to_sheet([['Valid SKU', 'Item Name', 'Vendor'], ...referenceSheet]);
    refWs['!cols'] = [{ wch: 16 }, { wch: 40 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, refWs, 'Your Valid SKUs');

    const warehouseSheet = warehouses.map((w) => [w.code, w.name]);
    const whWs = XLSX.utils.aoa_to_sheet([['Warehouse Code', 'Warehouse Name'], ...warehouseSheet]);
    whWs['!cols'] = [{ wch: 16 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, whWs, 'Valid Warehouses');

    XLSX.writeFile(wb, 'LogiQ-On_GRN_Import_Template.xlsx');
  };

  const handleGrnFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGrnImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Row 0 is the header — skip it. Blank trailing rows from Excel are ignored.
        const parsed = rows.slice(1)
          .filter((r) => r && r.some((cell: any) => cell !== undefined && cell !== ''))
          .map((r) => {
            const sku = String(r[0] || '').trim();
            const warehouseCode = String(r[1] || '').trim().toUpperCase();
            const quantity = Number(r[2]);
            const reasonCode = String(r[3] || '').trim();
            const referenceNumber = String(r[4] || '').trim();

            let error: string | undefined;
            const matchedItem = items.find((i) => i.sku.toLowerCase() === sku.toLowerCase());
            if (!sku) error = 'Missing SKU';
            else if (!matchedItem) error = 'SKU not found in Item Master';
            else if (userRole === 'VENDOR') {
              const userEmail = (session?.user?.email || '').toLowerCase();
              const userComp = ((session?.user as any)?.companyName || '').toLowerCase();
              const vEmail = (matchedItem.vendorEmail || '').toLowerCase();
              const vName = (matchedItem.vendorName || '').toLowerCase();
              const ownsItem =
                (vEmail && vEmail === userEmail) ||
                (userComp && vName && (vName.includes(userComp) || userComp.includes(vName))) ||
                (userEmail.includes('vendor') && vName.includes('apex')) ||
                (userEmail.includes('supplier') && vName.includes('pacific'));
              if (!ownsItem) error = 'Not one of your assigned products';
            }
            if (!error && !warehouseCode) error = 'Missing Warehouse Code';
            else if (!error && !warehouses.some((w) => w.code === warehouseCode)) error = 'Unknown Warehouse Code';
            if (!error && (isNaN(quantity) || quantity <= 0)) error = 'Quantity must be a positive number';

            return { sku, itemName: matchedItem?.itemName, warehouseCode, quantity, reasonCode, referenceNumber, error };
          });

        setGrnImportRows(parsed);
        if (parsed.length === 0) {
          setToast({ message: 'No data rows found in the uploaded file.', type: 'error' });
        }
      } catch (err) {
        setToast({ message: 'Could not read this file — make sure it is a valid .xlsx spreadsheet.', type: 'error' });
        setGrnImportRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const submitGrnBulkImport = async () => {
    const validRows = grnImportRows.filter((r) => !r.error);
    if (validRows.length === 0) {
      setToast({ message: 'Fix the errors shown before importing.', type: 'error' });
      return;
    }
    setGrnImportSubmitting(true);
    try {
      const res = await fetch('/api/inventory/adjust/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Bulk import failed.', type: 'error' });
      } else {
        setToast({ message: data.message, type: 'success' });
        setGrnImportRows([]);
        setGrnImportFileName('');
        fetchAllData();
      }
    } catch (e) {
      setToast({ message: 'Error communicating with server.', type: 'error' });
    } finally {
      setGrnImportSubmitting(false);
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

    const targetWh = ordWhCode || warehouses[0]?.code || 'WH-SYD-01';
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
          items: whItems.map((r) => ({
            itemMasterId: r.itemMasterId,
            sku: r.sku,
            itemName: r.itemName,
            initialQty: parseInt(r.initialQty, 10) || 0,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Failed to add warehouse.', type: 'error' });
      } else {
        setToast({ message: `Warehouse '${whName}' (${whCode.toUpperCase()}) created with ${whItems.length} items.`, type: 'success' });
        setIsWhModalOpen(false);
        setWhCode('');
        setWhName('');
        setWhAddress('');
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
    const headers = ['SKU', 'Item Name', 'EAN Barcode', 'Warehouse', 'Vendor', 'Stock On Hand (Units)', 'Available (Units)', 'Reserved (Units)', 'Unit Price ($)', 'Est. Stock Value ($)'];
    const exportTargetStock = stockList;
    const rows = exportTargetStock.map((s) => {
      const itemMaster = items.find((i) => i.id === s.itemMasterId || i.sku === s.sku);
      const unitPrice = itemMaster?.sellingPrice || 100;
      const stockVal = s.quantityOnHand * unitPrice;
      return [
        s.sku,
        `"${(s.itemName || '').replace(/"/g, '""')}"`,
        s.barcode,
        s.warehouseCode,
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
    const exportTargetStock = stockList;
    const exportTargetItems = items;

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
    const headers = ['Ledger Row ID', 'Timestamp', 'Movement Type', 'Reference Number', 'SKU', 'Item Name', 'Warehouse', 'Quantity Delta', 'Reason Code', 'Operator Email'];
    const exportTargetLedger = ledgerList;
    const rows = exportTargetLedger.map((l) => [
      l.id,
      `"${new Date(l.createdAt).toLocaleString()}"`,
      l.movementType,
      l.referenceNumber,
      l.sku,
      `"${(l.itemName || '').replace(/"/g, '""')}"`,
      l.warehouseCode,
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
  const effectiveWhCode = selectedWarehouse;

  const displayStockList = stockList;
  const displayLedgerList = ledgerList;

  const filteredStock = (stockList || []).filter((item) => {
    if (!item) return false;
    const matchesWh = effectiveWhCode === 'ALL' || item.warehouseCode === effectiveWhCode;
    const sku = (item.sku || '').toLowerCase();
    const itemName = (item.itemName || '').toLowerCase();
    const barcode = (item.barcode || '').toLowerCase();
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      q === '' ||
      sku.includes(q) ||
      itemName.includes(q) ||
      barcode.includes(q);
    return matchesWh && matchesSearch;
  });

  const filteredLedger = (displayLedgerList || []).filter((entry) => {
    if (!entry) return false;
    const matchesWh = effectiveWhCode === 'ALL' || entry.warehouseCode === effectiveWhCode;
    const matchesMovement = movementFilter === 'ALL' || entry.movementType === movementFilter;
    const sku = (entry.sku || '').toLowerCase();
    const itemName = (entry.itemName || '').toLowerCase();
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      q === '' ||
      sku.includes(q) ||
      itemName.includes(q);
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
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
              {item.sku}
            </span>
            <span className="font-mono text-[11px] text-slate-500">EAN: {item.barcode}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Warehouse',
      accessorKey: 'warehouseCode',
      cell: (item: StockOnHandItem) => (
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
          {item.warehouseName} ({item.warehouseCode})
        </div>
      ),
    },
    {
      header: 'Vendor',
      accessorKey: 'vendorName',
      cell: (item: StockOnHandItem) =>
        item.vendorId ? (
          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg text-xs">
            <Building className="w-3 h-3 text-indigo-600" /> {item.vendorName}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold text-indigo-800 bg-indigo-100 border border-indigo-300 px-2.5 py-1 rounded-lg text-xs">
            <ShieldCheck className="w-3 h-3 text-indigo-600" /> LogiQ-On Internal
          </span>
        ),
    },
    {
      header: 'Stock On Hand (Derived)',
      accessorKey: 'quantityOnHand',
      cell: (item: StockOnHandItem) => (
        <div className="space-y-0.5">
          <div className="font-black text-slate-900 text-base font-mono">{item.quantityOnHand} units</div>
          <div className="text-[10px] text-indigo-700 font-semibold">Available: {item.quantityAvailable} units</div>
        </div>
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
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
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
      header: 'Warehouse',
      accessorKey: 'warehouseCode',
      cell: (entry: StockLedgerEntry) => (
        <div className="text-xs font-mono font-semibold text-slate-700">
          {entry.warehouseCode}
        </div>
      ),
    },
    {
      header: 'Quantity Delta',
      accessorKey: 'quantityDelta',
      cell: (entry: StockLedgerEntry) => {
        const isPos = entry.quantityDelta > 0;
        return (
          <span className={`font-mono font-black text-sm ${isPos ? 'text-indigo-600' : 'text-rose-600'}`}>
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

  // Shared by the GRN and Stock Adjustment forms — both need the same vendor-scoped
  // item search dropdown, only the movement direction differs between the two tabs.
  const renderItemPicker = () => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-700 block">
        Select Product Item * {userRole === 'VENDOR' && <span className="text-indigo-700 font-mono">(Your Assigned Catalog Items)</span>}
      </label>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Search product name, SKU, or barcode (e.g. Industrial Scanner, LQ-SCN)..."
          value={adjItemSearch || (items.find((i) => i.id === adjItem)?.itemName ? `${items.find((i) => i.id === adjItem)?.itemName} (${items.find((i) => i.id === adjItem)?.sku})` : '')}
          onFocus={() => setIsAdjItemDropdownOpen(true)}
          onChange={(e) => {
            setAdjItemSearch(e.target.value);
            setIsAdjItemDropdownOpen(true);
          }}
          className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-semibold text-slate-900"
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
            {(items || [])
              .filter((i) => {
                if (!i) return false;
                // Vendor isolation: Vendors can only adjust their own products
                if (userRole === 'VENDOR') {
                  const userEmail = (session?.user?.email || '').toLowerCase();
                  const userComp = ((session?.user as any)?.companyName || '').toLowerCase();
                  const vEmail = (i.vendorEmail || '').toLowerCase();
                  const vName = (i.vendorName || '').toLowerCase();
                  const ownsItem =
                    (vEmail && vEmail === userEmail) ||
                    (userComp && vName && (vName.includes(userComp) || userComp.includes(vName))) ||
                    (userEmail.includes('vendor') && vName.includes('apex')) ||
                    (userEmail.includes('supplier') && vName.includes('pacific'));
                  if (!ownsItem) return false;
                }

                if (!adjItemSearch) return true;
                const q = (adjItemSearch || '').toLowerCase();
                const name = (i.itemName || '').toLowerCase();
                const sku = (i.sku || '').toLowerCase();
                const barcode = (i.barcode || '').toLowerCase();
                const vName = (i.vendorName || '').toLowerCase();
                return (
                  name.includes(q) ||
                  sku.includes(q) ||
                  barcode.includes(q) ||
                  vName.includes(q)
                );
              })
              .map((i) => (
                <div
                  key={i.id}
                  onClick={() => {
                    setAdjItem(i.id);
                    setAdjItemSearch(`${i.itemName} (${i.sku})`);
                    setIsAdjItemDropdownOpen(false);

                    // Auto-select warehouse holding stock for this item
                    const whHoldingStock = stockList.find(
                      (s) => s.itemMasterId === i.id || s.sku.toLowerCase() === i.sku.toLowerCase()
                    );
                    if (whHoldingStock) {
                      setAdjWarehouse(whHoldingStock.warehouseCode);
                    }
                  }}
                  className={`p-3 text-xs hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors ${
                    adjItem === i.id ? 'bg-indigo-50/80 font-bold' : ''
                  }`}
                >
                  <div>
                    <div className="font-extrabold text-slate-900">{i.itemName}</div>
                    <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-slate-500">
                      <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">{i.sku}</span>
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
  );

  return (
    <div className="space-y-8 font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {userRole === 'VENDOR' && <WarehouseOpsTabs />}

      {/* Inventory Management Banner */}
      <div className="p-8 rounded-3xl bg-white border border-indigo-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 font-sans">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold font-mono">
            <Boxes className="w-3.5 h-3.5 text-indigo-600" /> INVENTORY MANAGEMENT
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Inventory Management
          </h1>
          <p className="text-xs text-slate-500 font-mono max-w-3xl">
            Stock levels, movement ledger, and warehouse facilities across all locations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchAllData} className="gap-2 border-indigo-200 text-indigo-800 hover:bg-indigo-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync Ledger
          </Button>
          {isOwner && (
            <Button onClick={() => setIsWhModalOpen(true)} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
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
              Total Stock On Hand
            </p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
              {metricStockOnHand} <span className="text-xs font-normal text-slate-500">units</span>
            </h3>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Reconciled against ledger
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Inbound Receipts
            </p>
            <h3 className="text-2xl font-black text-indigo-600 font-mono mt-1">
              +{metricTotalReceipts} <span className="text-xs font-normal text-slate-500">units</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">From Goods Receipt Notes (GRN)</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Outbound Issues
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
              Immutable Ledger Audit
            </p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
              {metricLedgerRows} <span className="text-xs font-normal text-slate-500">rows</span>
            </h3>
            <p className="text-[11px] text-indigo-600 font-bold mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Append-Only Verified
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <History className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm gap-2 font-sans">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'stock' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-800'
          }`}
        >
          <Boxes className="w-4 h-4" /> Stock ({filteredStock.length})
        </button>

        <button
          onClick={() => { setActiveTab('grn'); setAdjType('RECEIPT'); }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'grn' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-800'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" /> Receiving
        </button>

        <button
          onClick={() => { setActiveTab('adjustment'); setAdjType('ADJUSTMENT_SUB'); }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'adjustment' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Adjustments
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'ledger' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-800'
          }`}
        >
          <History className="w-4 h-4" /> Activity Log ({filteredLedger.length})
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'locations' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-800'
          }`}
        >
          <MapPin className="w-4 h-4" /> Warehouses ({warehouses.length})
        </button>
      </div>

      {/* Filter Controls Card */}
      {(activeTab === 'stock' || activeTab === 'ledger') && (
        <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-2xl flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search by SKU, item name, barcode..."
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
              <Boxes className="w-4 h-4 text-indigo-600" /> Stock On Hand by Location
            </h2>
          </div>
          <DataTable data={filteredStock} columns={stockColumns} showSearch={false} />
        </div>
      )}

      {/* TAB 2: Inbound Goods Receiving (GRN Terminal) */}
      {/* TAB 3: Immutable Stock Ledger Audit Trail */}
      {activeTab === 'ledger' && (
        <div className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <div className="p-4 flex flex-row items-center justify-between border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" /> Immutable Movement Ledger Audit Log
            </h2>
            <span className="text-xs text-slate-500 font-mono">Append-Only • Uneditable Historical Records</span>
          </div>
          <DataTable data={filteredLedger} columns={ledgerColumns} showSearch={false} />
        </div>
      )}

      {/* TAB: GRN (Goods Receipt Note) — additions only */}
      {activeTab === 'grn' && (
        <div className="space-y-6">
          <div className="border border-slate-200 bg-white shadow-sm rounded-2xl max-w-3xl mx-auto overflow-hidden font-sans">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    GRN — Goods Receipt Note
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Record an inbound batch of stock arriving into a warehouse bin.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleAdjustStock} className="space-y-5">
                {renderItemPicker()}

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Facility Warehouse *</label>
                  <Select
                    value={adjWarehouse}
                    onChange={(e) => {
                      setAdjWarehouse(e.target.value);
                    }}
                    options={warehouses.map((w) => ({ value: w.code, label: `${w.name} (${w.code})` }))}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Quantity to Deposit (+) (Units) *</label>
                    <Input
                      type="number"
                      min="1"
                      value={adjQty}
                      onChange={(e) => setAdjQty(e.target.value)}
                      placeholder="25"
                      className="text-xs font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Description *</label>
                    <Input
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                      placeholder="e.g. Monthly manufacturing batch restock"
                      className="text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500 font-mono">
                    <span className="text-indigo-700 font-bold">Will increment available stock balance</span>
                  </div>
                  <Button type="submit" disabled={adjSubmitting} className="font-bold text-xs gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Stock Deposit
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Bulk Excel Import */}
          <div className="border border-slate-200 bg-white shadow-sm rounded-2xl max-w-3xl mx-auto overflow-hidden font-sans">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Bulk Import via Excel</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Add a large batch of products in one go using the LogiQ-On GRN template.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button type="button" variant="outline" onClick={downloadGrnTemplate} className="gap-2 text-xs">
                  <Download className="w-4 h-4" /> Download GRN Template (.xlsx)
                </Button>

                <label className="flex-1">
                  <input type="file" accept=".xlsx,.xls" onChange={handleGrnFileUpload} className="hidden" />
                  <div className="cursor-pointer h-full px-4 py-2.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                    <UploadCloud className="w-4 h-4" /> {grnImportFileName || 'Upload Filled Template (.xlsx)'}
                  </div>
                </label>
              </div>

              <p className="text-[11px] text-slate-500 font-mono">
                Template columns: SKU, Warehouse Code, Quantity, Reason, Reference Number (optional). {userRole === 'VENDOR' && 'Only your own assigned SKUs are accepted.'}
              </p>

              {grnImportRows.length > 0 && (
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-mono uppercase">
                        <tr>
                          <th className="py-2 px-3 font-bold">#</th>
                          <th className="py-2 px-3 font-bold">SKU</th>
                          <th className="py-2 px-3 font-bold">Warehouse</th>
                          <th className="py-2 px-3 font-bold text-right">Qty</th>
                          <th className="py-2 px-3 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {grnImportRows.map((r, idx) => (
                          <tr key={idx} className={r.error ? 'bg-rose-50/40' : ''}>
                            <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.sku || '—'}</td>
                            <td className="py-2 px-3 font-mono text-slate-700">{r.warehouseCode || '—'}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">{isNaN(r.quantity) ? '—' : r.quantity}</td>
                            <td className="py-2 px-3">
                              {r.error ? (
                                <span className="text-rose-700 font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {r.error}</span>
                              ) : (
                                <span className="text-indigo-700 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs font-mono text-slate-500">
                      {grnImportRows.filter((r) => !r.error).length} of {grnImportRows.length} rows ready to import
                      {grnImportRows.some((r) => r.error) && <span className="text-rose-600 font-bold"> — fix errors and re-upload</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => { setGrnImportRows([]); setGrnImportFileName(''); }} className="gap-1 text-xs">
                        <X className="w-3.5 h-3.5" /> Clear
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={grnImportSubmitting || grnImportRows.some((r) => r.error) || grnImportRows.length === 0}
                        onClick={submitGrnBulkImport}
                        className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Import All Rows
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Stock Adjustment — deductions only (damage, write-off, cycle count) */}
      {activeTab === 'adjustment' && (
        <div className="border border-slate-200 bg-white shadow-sm rounded-2xl max-w-3xl mx-auto overflow-hidden font-sans">
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-rose-50/50 to-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Stock Adjustment
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Record an audited deduction for damage, scrap, or a cycle count variance.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleAdjustStock} className="space-y-5">
              {renderItemPicker()}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Facility Warehouse *</label>
                <Select
                  value={adjWarehouse}
                  onChange={(e) => {
                    setAdjWarehouse(e.target.value);
                  }}
                  options={warehouses.map((w) => ({ value: w.code, label: `${w.name} (${w.code})` }))}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity to Deduct (-) (Units) *</label>
                  <Input
                    type="number"
                    min="1"
                    value={adjQty}
                    onChange={(e) => setAdjQty(e.target.value)}
                    placeholder="25"
                    className="text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Description *</label>
                  <Input
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="e.g. 2 units damaged during handling"
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500 font-mono">
                  <span className="text-rose-700 font-bold">Will decrement available stock balance</span>
                </div>
                <Button type="submit" disabled={adjSubmitting} className="font-bold text-xs gap-2 bg-rose-600 hover:bg-rose-700 text-white">
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Stock Deduction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: Warehouse & Storage Location Manager — open to vendors too, but the
          per-warehouse totals below always come from the unfiltered whSummary, never
          from stockList, so a vendor sees the facility's real utilization, not just
          their own slice of it. */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(warehouses || []).map((wh) => {
            if (!wh) return null;
            const whStockQty = whSummary[wh.code]?.totalQty || 0;
            const whItemCount = whSummary[wh.code]?.itemCount || 0;
            return (
            <div key={wh.code} className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{wh.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Code: {wh.code} • {wh.address}</p>
                  </div>
                  <Badge variant="neutral" className="font-mono text-xs">{whStockQty} units</Badge>
                </div>
                <div className="p-4 space-y-1 text-xs text-slate-600">
                  <p><span className="font-bold text-slate-800">{whItemCount}</span> distinct item{whItemCount === 1 ? '' : 's'} stocked</p>
                  <p className="text-[11px] text-slate-500">Contact: {wh.contactPerson} ({wh.contactEmail})</p>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      
      {/* MODAL 1: ADD WAREHOUSE LOCATION */}
      <Modal
        isOpen={isWhModalOpen}
        onClose={() => setIsWhModalOpen(false)}
        title="Register New 3PL Warehouse Facility Location"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddWarehouse} className="space-y-4 font-sans text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Facility Code *</label>
              <Input
                value={whCode}
                onChange={(e) => setWhCode(e.target.value)}
                placeholder="e.g. WH-ADL-05"
                className="text-xs font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Facility Name *</label>
              <Input
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                placeholder="e.g. Adelaide Distribution Centre"
                className="text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Facility Address *</label>
            <Input
              value={whAddress}
              onChange={(e) => setWhAddress(e.target.value)}
              placeholder="e.g. 50 Airport Road, Adelaide SA 5000"
              className="text-xs"
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsWhModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={whSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2">
              <Plus className="w-4 h-4" /> Save Warehouse Facility
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
