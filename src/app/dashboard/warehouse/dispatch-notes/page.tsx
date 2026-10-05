'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Truck, Search, RefreshCw, Edit2, PackageCheck, ClipboardList, Plus, Printer, Box, CheckCircle2, MapPin, Paperclip, FileText, Download, Eye, UploadCloud, ShieldCheck, FileCheck, X, Receipt, PackageSearch, XCircle, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import WarehouseOpsTabs from '@/components/warehouse/WarehouseOpsTabs';

interface DispatchNote {
  id: string;
  dispatchNumber: string;
  salesOrderNumber: string;
  customerName: string;
  customerAddress: string;
  warehouseCode: string;
  warehouseName?: string;
  lines?: any[];
  status: string;
  dispatchDate?: string;
  carrier?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  comments?: string;
  receiverName?: string;
  podReference?: string;
  rejectionReason?: string;
  attachment?: {
    fileName: string;
    fileData?: string;
    fileType?: string;
    uploadedAt?: string;
    receiverName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Semantic status palette (LogiQ design system): success/warning/danger/neutral/info.
// Kept deliberately separate from the navy brand color so statuses stay scannable.
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: '#fafafa', text: '#71717a', border: '#e4e4e7' },
  ALLOCATED: { bg: '#eff6ff', text: '#1e3a8a', border: '#bfdbfe' },
  PICKING: { bg: '#fefce8', text: '#854d0e', border: '#fde68a' },
  PICKED: { bg: '#fefce8', text: '#854d0e', border: '#fde68a' },
  PACKING: { bg: '#eff6ff', text: '#1e3a8a', border: '#bfdbfe' },
  PACKED: { bg: '#eff6ff', text: '#1e3a8a', border: '#bfdbfe' },
  READY_FOR_DISPATCH: { bg: '#eff6ff', text: '#1e3a8a', border: '#bfdbfe' },
  DISPATCHED: { bg: '#eff6ff', text: '#1e3a8a', border: '#bfdbfe' },
  IN_TRANSIT: { bg: '#eff6ff', text: '#1e3a8a', border: '#bfdbfe' },
  DELIVERED: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  PARTIALLY_DELIVERED: { bg: '#fefce8', text: '#854d0e', border: '#fde68a' },
  DELIVERY_EXCEPTION: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  ON_HOLD: { bg: '#fefce8', text: '#854d0e', border: '#fde68a' },
  RETURNED: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  CANCELLED: { bg: '#fafafa', text: '#71717a', border: '#e4e4e7' },
};
const DEFAULT_STATUS_STYLE = { bg: '#fafafa', text: '#71717a', border: '#e4e4e7' };

export default function WarehouseDispatchNoteListPage() {
  const { data: session } = useSession();
  const isVendor = (session?.user as any)?.role === 'VENDOR';
  const [records, setRecords] = useState<DispatchNote[]>([]);
  // --- SHIPPED FLOW MODAL STATES ---


  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editing, setEditing] = useState<DispatchNote | null>(null);
  const [form, setForm] = useState<any>({});
  const [editAllowed, setEditAllowed] = useState<string[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [createForm, setCreateForm] = useState<any>({
    salesOrderNumber: '', customerName: '', customerAddress: '',
    warehouseCode: '', lines: [] as any[], comments: '',
  });
  const [selectedSoLines, setSelectedSoLines] = useState<any[]>([]);
  const [stockOnHand, setStockOnHand] = useState<any[]>([]);
  const [pickModalDn, setPickModalDn] = useState<DispatchNote | null>(null);
  const [dispatchModalDn, setDispatchModalDn] = useState<DispatchNote | null>(null);
  const [rejectModalDn, setRejectModalDn] = useState<DispatchNote | null>(null);
  const [deliveryModalDn, setDeliveryModalDn] = useState<DispatchNote | null>(null);
  const [podViewerDn, setPodViewerDn] = useState<DispatchNote | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<any>({
    receiverName: '',
    deliveryDateTime: new Date().toISOString().substring(0, 16),
    podReference: '',
    comments: '',
    attachment: null,
    lines: [],
  });
  const [pickForm, setPickForm] = useState<any>({
    lines: [],
  });
  const [dispatchForm, setDispatchForm] = useState<any>({
    carrier: 'StarTrack Express',
    dispatchDate: new Date().toISOString().substring(0, 10),
    comments: '',
    lines: [],
  });
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [dnRes, soRes, whRes, stockRes] = await Promise.all([
        fetch('/api/dispatch-notes').then((r) => r.json()),
        fetch('/api/sales-orders').then((r) => r.json()),
        fetch('/api/inventory/warehouses').then((r) => r.json()),
        fetch('/api/inventory/stock').then((r) => r.json()).catch(() => ({ stock: [] })),
      ]);
      setRecords(dnRes.dispatchNotes || []);
      setSalesOrders(soRes.salesOrders || []);
      setWarehouses(whRes.warehouses || []);
      setStockOnHand(stockRes.stock || []);
    } catch {
      setToast({ msg: 'Failed to load data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fetchAllowed = async (from: string): Promise<string[]> => {
    try {
      const res = await fetch(`/api/lifecycle?entity=DISPATCH_NOTE&from=${from}`);
      const data = await res.json();
      return data.allowed || [];
    } catch { return []; }
  };

  const openDeliveryModal = (r: DispatchNote) => {
    setDeliveryModalDn(r);
    const defaultLines = (r.lines || []).map((l: any) => ({
      ...l,
      deliveredQty: l.deliveredQty || l.dispatchQty || l.orderedQty || 1,
      condition: 'GOOD',
      damagedQty: l.damagedQty || 0,
    }));
    setDeliveryForm({
      receiverName: r.receiverName || '',
      deliveryDateTime: r.actualDeliveryDate ? r.actualDeliveryDate.substring(0, 16) : new Date().toISOString().substring(0, 16),
      podReference: r.podReference || (r.attachment?.fileName || ''),
      comments: r.comments || '',
      attachment: r.attachment || null,
      lines: defaultLines,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setToast({ msg: 'File size exceeds 5MB limit.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setDeliveryForm((prev: any) => ({
        ...prev,
        podReference: prev.podReference || file.name,
        attachment: {
          fileName: file.name,
          fileData: base64Data,
          fileType: file.type,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          uploadedAt: new Date().toISOString(),
        },
      }));
      setToast({ msg: `Attached ${file.name} successfully.`, type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const submitDeliveryPOD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryModalDn) return;
    if (!deliveryForm.attachment) {
      setToast({ msg: 'Attach the signed Proof of Delivery (POD) file before confirming delivery.', type: 'error' });
      return;
    }
    try {
      const res = await fetch(`/api/dispatch-notes/${deliveryModalDn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DELIVERED',
          actualDeliveryDate: new Date(deliveryForm.deliveryDateTime).toISOString(),
          receiverName: deliveryForm.receiverName,
          podReference: deliveryForm.podReference || deliveryForm.attachment?.fileName || 'POD-SIGNED-CONFIRMED',
          attachment: deliveryForm.attachment,
          comments: deliveryForm.comments,
          lines: deliveryForm.lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delivery confirmation failed.');
      setToast({ msg: `Delivery confirmed for ${deliveryModalDn.dispatchNumber}. Proof of Delivery locked!`, type: 'success' });
      setDeliveryModalDn(null);
      load();
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to confirm delivery.', type: 'error' });
    }
  };

  const startPicking = async (r: DispatchNote) => {
    try {
      const res = await fetch(`/api/dispatch-notes/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PICKING' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start picking.');
      setToast({ msg: `${r.dispatchNumber} moved to Picking.`, type: 'success' });
      load();
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to start picking.', type: 'error' });
    }
  };

  const openPickModal = (r: DispatchNote) => {
    setPickModalDn(r);
    const defaultLines = (r.lines || []).map((l: any) => {
      const matchedStock = stockOnHand.find((s) => s.sku === l.itemCode && s.warehouseCode === r.warehouseCode);
      return {
        ...l,
        binLocation: matchedStock?.binLocation || 'BIN-A1-01',
        pickedQty: l.pickedQty || l.orderedQty || 1,
      };
    });
    setPickForm({ lines: defaultLines });
  };

  const submitPicking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickModalDn) return;
    try {
      const res = await fetch(`/api/dispatch-notes/${pickModalDn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PICKED',
          lines: pickForm.lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Picking confirmation failed.');
      setToast({ msg: `Picking confirmed for ${pickModalDn.dispatchNumber}.`, type: 'success' });
      setPickModalDn(null);
      load();
    } catch (err: any) {
      setToast({ msg: err.message || 'Picking confirmation failed.', type: 'error' });
    }
  };

  const openDispatchModal = (r: DispatchNote) => {
    setDispatchModalDn(r);
    const defaultLines = (r.lines || []).map((l: any) => ({
      ...l,
      dispatchQty: l.dispatchQty || l.pickedQty || l.orderedQty || 1,
    }));
    setDispatchForm({
      carrier: r.carrier || 'StarTrack Express',
      dispatchDate: r.dispatchDate ? r.dispatchDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
      comments: r.comments || '',
      lines: defaultLines,
    });
  };

  const submitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalDn) return;
    try {
      const res = await fetch(`/api/dispatch-notes/${dispatchModalDn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DISPATCHED',
          carrier: dispatchForm.carrier,
          dispatchDate: new Date(dispatchForm.dispatchDate).toISOString(),
          comments: dispatchForm.comments,
          dispatchQty: dispatchForm.lines?.[0]?.dispatchQty,
          lines: dispatchForm.lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dispatch release failed.');
      setToast({ msg: `Dispatch note ${dispatchModalDn.dispatchNumber} released & stock decremented from ledger.`, type: 'success' });
      setDispatchModalDn(null);
      load();
    } catch (err: any) {
      setToast({ msg: err.message || 'Dispatch confirmation failed.', type: 'error' });
    }
  };

  const openRejectModal = (r: DispatchNote) => {
    setRejectModalDn(r);
    setRejectReason('');
  };

  const submitRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalDn) return;
    if (!rejectReason.trim()) {
      setToast({ msg: 'A reason is required to report a delivery exception.', type: 'error' });
      return;
    }
    try {
      const res = await fetch(`/api/dispatch-notes/${rejectModalDn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DELIVERY_EXCEPTION',
          rejectionReason: rejectReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to report exception.');
      setToast({ msg: `Delivery exception reported for ${rejectModalDn.dispatchNumber}.`, type: 'success' });
      setRejectModalDn(null);
      load();
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to report exception.', type: 'error' });
    }
  };

  const openEdit = async (r: DispatchNote) => {
    setEditing(r);
    setForm({
      status: r.status,
      carrier: r.carrier || '',
      dispatchQty: r.lines?.[0]?.dispatchQty,
      comments: r.comments || '',
    });
    const allowed = await fetchAllowed(r.status);
    setEditAllowed(allowed);
  };

  const save = async (e: React.FormEvent) => {

    e.preventDefault();
    if (!editing) return;
    try {
      const res = await fetch(`/api/dispatch-notes/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: 'Dispatch note updated.', type: 'success' });
      setEditing(null);
      load();
    } catch (err: any) {
      setToast({ msg: err.message || 'Update failed.', type: 'error' });
    }
  };

  const allocatableSOs = salesOrders.filter((s) =>
    ['CONFIRMED', 'STOCK_CHECK', 'ALLOCATED', 'PARTIALLY_ALLOCATED'].includes(s.status)
  );

  const onSelectSO = (soNumber: string) => {
    const so = salesOrders.find((s) => s.salesOrderNumber === soNumber);
    if (so) {
      const soLines = so.lines || [];
      setSelectedSoLines(soLines);
      const lines = soLines.map((l: any) => ({
        itemCode: l.itemCode,
        itemName: l.itemName,
        orderedQty: l.quantity,
        dispatchQty: l.quantity,
      }));
      setCreateForm({
        ...createForm,
        salesOrderNumber: so.salesOrderNumber,
        customerName: so.customerName,
        customerAddress: so.deliveryLocation || '',
        lines,
      });
    }
  };

  const onSelectLine = (itemCode: string) => {
    const line = selectedSoLines.find((l: any) => l.itemCode === itemCode);
    if (line) {
      setCreateForm({
        ...createForm,
        lines: [{
          itemCode: line.itemCode,
          itemName: line.itemName,
          orderedQty: line.quantity,
          dispatchQty: line.quantity,
        }],
      });
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.lines || createForm.lines.length === 0) {
      setToast({ msg: 'Select a sales order first.', type: 'error' });
      return;
    }
    try {
      const wh = warehouses.find((w) => w.code === createForm.warehouseCode);
      const res = await fetch('/api/dispatch-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesOrderNumber: createForm.salesOrderNumber,
          customerName: createForm.customerName,
          customerAddress: createForm.customerAddress,
          warehouseCode: createForm.warehouseCode,
          warehouseName: wh?.name || '',
          lines: createForm.lines,
          comments: createForm.comments,
          status: 'ALLOCATED',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: `Dispatch note ${data.dispatchNote.dispatchNumber} created.`, type: 'success' });
      setIsCreateOpen(false);
      setCreateForm({ salesOrderNumber: '', customerName: '', customerAddress: '', warehouseCode: '', lines: [], comments: '' });
      setSelectedSoLines([]);
      load();
    } catch (err: any) {
      setToast({ msg: err.message || 'Create failed.', type: 'error' });
    }
  };

  const filtered = records.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.dispatchNumber.toLowerCase().includes(s) ||
      r.salesOrderNumber.toLowerCase().includes(s) ||
      r.customerName.toLowerCase().includes(s) ||
      r.lines?.some((l: any) => l.itemCode.toLowerCase().includes(s) || l.itemName.toLowerCase().includes(s))
    );
  });

  const allStatuses = Object.keys(STATUS_STYLES);

  const counts = {
    total: records.length,
    picking: records.filter((r) => r.status === 'PICKING' || r.status === 'PICKED').length,
    inTransit: records.filter((r) => r.status === 'IN_TRANSIT' || r.status === 'DISPATCHED').length,
    delivered: records.filter((r) => r.status === 'DELIVERED').length,
  };

  return (
    <div className="space-y-6">
      <WarehouseOpsTabs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <ClipboardList className="w-5 h-5" style={{ color: '#1e3a8a' }} /> Dispatch Notes
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Operational control view for sales-order picking, packing, dispatch, transit and delivery tracking.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} variant="primary" className="bg-[#1e3a8a] hover:bg-[#162c69]" leftIcon={<Plus className="w-4 h-4" />}>Create Dispatch Note</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border" style={{ borderColor: '#e2e8f0' }}>
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Total Dispatches</div>
          <div className="text-2xl font-black mt-1" style={{ color: '#1e3a8a' }}>{counts.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border" style={{ borderColor: '#e2e8f0' }}>
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>In Picking</div>
          <div className="text-2xl font-black mt-1" style={{ color: '#854d0e' }}>{counts.picking}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border" style={{ borderColor: '#e2e8f0' }}>
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>In Transit</div>
          <div className="text-2xl font-black mt-1" style={{ color: '#1e3a8a' }}>{counts.inTransit}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border" style={{ borderColor: '#e2e8f0' }}>
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Delivered</div>
          <div className="text-2xl font-black mt-1" style={{ color: '#166534' }}>{counts.delivered}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white p-4 rounded-2xl border" style={{ borderColor: '#e2e8f0' }}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by dispatch, SO, customer, item, tracking..." className="pl-10" />
        </div>
        <div className="w-full md:w-56">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: 'ALL', label: 'All statuses' }, ...allStatuses.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))]} />
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200" style={{ color: '#64748b' }} aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: '#e2e8f0' }}>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Sales Order No.</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Dispatch No.</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Customer</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Item Code / Item</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-right" style={{ color: '#94a3b8' }}>Quantity</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Status</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Comments</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-right" style={{ color: '#94a3b8' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center" style={{ color: '#94a3b8' }}>Loading dispatch notes...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center" style={{ color: '#94a3b8' }}>No dispatch notes match your filters.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b transition-colors hover:bg-slate-50" style={{ borderColor: '#f1f5f9' }}>
                  <td className="py-3 px-4 font-mono font-bold" style={{ color: '#0f172a' }}>{r.salesOrderNumber}</td>
                  <td className="py-3 px-4 font-mono font-bold" style={{ color: '#1e3a8a' }}>{r.dispatchNumber}</td>
                  <td className="py-3 px-4 font-semibold" style={{ color: '#0f172a' }}>{r.customerName}</td>
                  <td className="py-3 px-4">
                    {r.lines?.map((l: any, i: number) => (
                      <div key={i}>
                        <span className="font-mono font-bold text-[11px]" style={{ color: '#1e3a8a' }}>{l.itemCode}</span>
                        <span className="text-[11px] ml-1" style={{ color: '#64748b' }}>{l.itemName}</span>
                      </div>
                    ))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold" style={{ color: '#0f172a' }}>{r.lines?.reduce((sum: number, l: any) => sum + l.dispatchQty, 0)}</td>
                  <td className="py-3 px-4">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                      style={{
                        background: (STATUS_STYLES[r.status] || DEFAULT_STATUS_STYLE).bg,
                        color: (STATUS_STYLES[r.status] || DEFAULT_STATUS_STYLE).text,
                        borderColor: (STATUS_STYLES[r.status] || DEFAULT_STATUS_STYLE).border,
                      }}
                    >
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[11px] max-w-[200px] truncate" style={{ color: '#64748b' }}>{r.comments || '—'}</td>
                  <td className="py-3 px-4 text-right flex items-center justify-end gap-1.5">
                    {isVendor && ['PENDING', 'ALLOCATED'].includes(r.status) && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-sm px-2.5 py-1"
                        onClick={() => startPicking(r)}
                        leftIcon={<PackageSearch className="w-3.5 h-3.5" />}
                        title="Picking is a two-step process: start picking, then confirm the picked quantities."
                      >
                        Start Picking
                      </Button>
                    )}
                    {isVendor && r.status === 'PICKING' && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-amber-700 font-semibold">Picking in progress — confirm quantities to continue</span>
                        <Button
                          size="sm"
                          variant="primary"
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-sm px-2.5 py-1"
                          onClick={() => openPickModal(r)}
                          leftIcon={<PackageSearch className="w-3.5 h-3.5" />}
                        >
                          Confirm Picking
                        </Button>
                      </div>
                    )}
                    {isVendor && ['PICKED', 'PACKING', 'PACKED', 'READY_FOR_DISPATCH'].includes(r.status) && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-[#1e3a8a] hover:bg-[#162c69] text-white font-bold text-[11px] shadow-sm px-2.5 py-1"
                        onClick={() => openDispatchModal(r)}
                        leftIcon={<PackageCheck className="w-3.5 h-3.5" />}
                      >
                        Dispatch
                      </Button>
                    )}
                    {['DISPATCHED', 'IN_TRANSIT'].includes(r.status) && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shadow-sm px-2.5 py-1"
                        onClick={() => openDeliveryModal(r)}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Confirm Delivery (POD)
                      </Button>
                    )}
                    {['DISPATCHED', 'IN_TRANSIT'].includes(r.status) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] shadow-sm px-2.5 py-1"
                        onClick={() => openRejectModal(r)}
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Report Rejection
                      </Button>
                    )}
                    {r.status === 'DELIVERY_EXCEPTION' && r.rejectionReason && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold max-w-[220px] truncate"
                        style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }}
                        title={r.rejectionReason}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {r.rejectionReason}
                      </span>
                    )}
                    {r.status === 'DELIVERED' && !r.attachment?.fileData && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="font-bold text-[11px] shadow-sm px-2.5 py-1 border"
                        style={{ background: '#eff6ff', color: '#1e3a8a', borderColor: '#bfdbfe' }}
                        onClick={() => openDeliveryModal(r)}
                        leftIcon={<Paperclip className="w-3.5 h-3.5" />}
                      >
                        Attach POD
                      </Button>
                    )}
                    {r.status === 'DELIVERED' && r.attachment?.fileData && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPodViewerDn(r)}
                          className="p-1.5 rounded-lg border"
                          style={{ background: '#eff6ff', color: '#1e3a8a', borderColor: '#bfdbfe' }}
                          title="View Proof of Delivery (POD) Document"
                          aria-label="View POD"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeliveryModal(r)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-600 border border-slate-200"
                          title="Update / Replace POD Document"
                          aria-label="Update POD"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <button onClick={() => window.open(`/api/dispatch-notes/${r.id}/print`, '_blank')} className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#eff6ff] text-slate-700 hover:text-[#1e3a8a]" aria-label="Print dispatch note" title="Print dispatch note">
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#eff6ff] text-slate-700 hover:text-[#1e3a8a]" aria-label="Edit" title="Edit dispatch note">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dispatch Note modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Dispatch Note" maxWidth="lg">
        <form onSubmit={submitCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1">Sales Order *</label>
              <Select
                value={createForm.salesOrderNumber}
                onChange={(e) => onSelectSO(e.target.value)}
                options={[
                  { value: '', label: '— Select sales order —' },
                  ...allocatableSOs.map((s) => ({ value: s.salesOrderNumber, label: `${s.salesOrderNumber} — ${s.customerName} (${s.status.replace(/_/g, ' ')})` })),
                ]}
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Warehouse *</label>
              <Select
                value={createForm.warehouseCode}
                onChange={(e) => setCreateForm({ ...createForm, warehouseCode: e.target.value })}
                options={[
                  { value: '', label: '— Select warehouse —' },
                  ...warehouses.map((w) => ({ value: w.code, label: `${w.code} — ${w.name}` })),
                ]}
              />
            </div>
          </div>

          {selectedSoLines.length > 1 && (
            <div>
              <label className="font-bold block mb-1">SO Line Item *</label>
              <Select
                value={createForm.lines?.[0]?.itemCode}
                onChange={(e) => onSelectLine(e.target.value)}
                options={selectedSoLines.map((l: any) => ({ value: l.itemCode, label: `${l.itemCode} — ${l.itemName} (qty ${l.quantity})` }))}
              />
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border" style={{ borderColor: '#e2e8f0' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Auto-populated from Sales Order</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span style={{ color: '#64748b' }}>Customer:</span> <span className="font-bold" style={{ color: '#0f172a' }}>{createForm.customerName || '—'}</span></div>
              <div><span style={{ color: '#64748b' }}>Delivery:</span> <span className="font-bold" style={{ color: '#0f172a' }}>{createForm.customerAddress || '—'}</span></div>
              <div><span style={{ color: '#64748b' }}>Item:</span> <span className="font-mono font-bold" style={{ color: '#1e3a8a' }}>{createForm.lines?.[0]?.itemCode || '—'}</span> {createForm.lines?.[0]?.itemName}</div>
              <div><span style={{ color: '#64748b' }}>Ordered Qty:</span> <span className="font-mono font-bold" style={{ color: '#0f172a' }}>{createForm.lines?.[0]?.orderedQty}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1">Dispatch Qty *</label>
              <Input type="number" min="1" max={createForm.lines?.[0]?.orderedQty || 99999} value={(createForm.lines?.[0]?.dispatchQty || 0)} onChange={(e) => {
                const updated = [...(createForm.lines || [])];
                if (updated[0]) updated[0] = { ...updated[0], dispatchQty: Number(e.target.value) };
                setCreateForm({ ...createForm, lines: updated });
              }} required />
            </div>
            <div>
              <label className="font-bold block mb-1">Comments</label>
              <Input value={createForm.comments} onChange={(e) => setCreateForm({ ...createForm, comments: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="bg-[#1e3a8a] hover:bg-[#162c69]" leftIcon={<PackageCheck className="w-4 h-4" />}>Create Dispatch Note</Button>
          </div>
        </form>
      </Modal>

      
      
      {/* Step 6: Confirm Customer Delivery & POD Modal */}
      <Modal isOpen={!!deliveryModalDn} onClose={() => setDeliveryModalDn(null)} title={deliveryModalDn?.status === 'DELIVERED' ? `Manage Proof of Delivery (POD) — ${deliveryModalDn?.dispatchNumber || ''}` : `Confirm Customer Delivery & POD — ${deliveryModalDn?.dispatchNumber || ''}`} maxWidth="2xl">
        {deliveryModalDn && (
          <form onSubmit={submitDeliveryPOD} className="space-y-4 text-xs">
            {/* Header Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border flex flex-wrap items-center justify-between gap-2" style={{ borderColor: '#e2e8f0' }}>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Sales Order Reference</div>
                <div className="font-extrabold text-sm" style={{ color: '#0f172a' }}>{deliveryModalDn.salesOrderNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Carrier & Consignment</div>
                <div className="font-bold text-sky-800 font-mono text-xs">{deliveryModalDn.carrier || 'Standard Freight'}</div>
              </div>
            </div>

            {/* Destination Verification Card */}
            <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-1">
              <div className="text-[10px] font-mono font-bold text-sky-800 uppercase flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600" /> Delivered Customer Facility
              </div>
              <div className="font-bold" style={{ color: '#0f172a' }}>{deliveryModalDn.customerName}</div>
              <div className="text-[11px]" style={{ color: '#64748b' }}>{deliveryModalDn.customerAddress || 'Designated Receiving Dock'}</div>
            </div>

            {/* Section 1: Receiver Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>Receiver Name / Authorized Contact *</label>
                <Input
                  required
                  placeholder="e.g. Mark Stevens (Receiving Supervisor)"
                  value={deliveryForm.receiverName}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, receiverName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>Date & Time of Physical Handover *</label>
                <Input
                  type="datetime-local"
                  required
                  value={deliveryForm.deliveryDateTime}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDateTime: e.target.value })}
                />
              </div>
            </div>

            {/* Section 2: Line Items Delivery Acceptance */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest flex items-center justify-between" style={{ color: '#94a3b8' }}>
                <span className="flex items-center gap-1"><Box className="w-3.5 h-3.5" style={{ color: '#1e3a8a' }} /> Delivered Items Verification</span>
                <span className="font-normal">Confirm accepted quantities & condition</span>
              </div>
              <div className="border rounded-xl overflow-hidden bg-white" style={{ borderColor: '#e2e8f0' }}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Item SKU & Name</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest text-center" style={{ color: '#94a3b8' }}>Dispatched</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest text-right" style={{ color: '#94a3b8' }}>Delivered Qty *</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Condition</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest text-right" style={{ color: '#94a3b8' }}>Damaged Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(deliveryForm.lines || []).map((line: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-slate-50" style={{ borderColor: '#f1f5f9' }}>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold" style={{ color: '#0f172a' }}>{line.itemCode}</div>
                          <div className="text-[11px] truncate max-w-[180px]" style={{ color: '#64748b' }}>{line.itemName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold" style={{ color: '#0f172a' }}>
                          {line.dispatchQty || line.orderedQty || 1}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            max={line.dispatchQty || line.orderedQty || 99999}
                            value={line.deliveredQty || ''}
                            onChange={(e) => {
                              const updated = [...deliveryForm.lines];
                              updated[idx] = { ...updated[idx], deliveredQty: Number(e.target.value) };
                              setDeliveryForm({ ...deliveryForm, lines: updated });
                            }}
                            className="w-20 text-right font-bold ml-auto"
                            required
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <Select
                            value={line.condition || 'GOOD'}
                            onChange={(e) => {
                              const updated = [...deliveryForm.lines];
                              updated[idx] = { ...updated[idx], condition: e.target.value };
                              setDeliveryForm({ ...deliveryForm, lines: updated });
                            }}
                            options={[
                              { value: 'GOOD', label: 'Good - Accepted' },
                              { value: 'MINOR_SCUFF', label: 'Minor Scuff - Accepted' },
                              { value: 'DAMAGED_PARTIAL', label: 'Damaged in Transit' },
                              { value: 'REJECTED', label: 'Rejected at Dock' },
                            ]}
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            max={line.deliveredQty || line.dispatchQty || line.orderedQty || 99999}
                            value={line.damagedQty || 0}
                            onChange={(e) => {
                              const updated = [...deliveryForm.lines];
                              updated[idx] = { ...updated[idx], damagedQty: Number(e.target.value) };
                              setDeliveryForm({ ...deliveryForm, lines: updated });
                            }}
                            className="w-20 text-right font-bold ml-auto"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Interactive File Upload & POD Evidence */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold block" style={{ color: '#0f172a' }}>Proof of Delivery (POD) Attachment & Evidence *</label>

              <div className="p-4 border-2 border-dashed border-slate-300 hover:border-[#1e3a8a] rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center transition-colors">
                <input
                  type="file"
                  id="pod-file-upload"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="pod-file-upload" className="cursor-pointer flex flex-col items-center space-y-1">
                  <div className="p-2.5 rounded-xl border" style={{ background: '#eff6ff', color: '#1e3a8a', borderColor: '#bfdbfe' }}>
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#1e3a8a' }}>Click to upload signed POD docket / image</span>
                  <span className="text-[10px]" style={{ color: '#94a3b8' }}>Supports PDF, PNG, JPG, WEBP (Max 5MB)</span>
                </label>
              </div>

              {/* Uploaded File Pill / Preview Card */}
              {deliveryForm.attachment && (
                <div className="p-3 rounded-xl border flex items-center justify-between" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg shrink-0" style={{ background: '#dbeafe', color: '#1e3a8a' }}>
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate" style={{ color: '#1e3a8a' }}>{deliveryForm.attachment.fileName}</div>
                      <div className="text-[10px]" style={{ color: '#1e3a8a' }}>{deliveryForm.attachment.fileSize || 'Attached'} • Uploaded ready to lock</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeliveryForm({ ...deliveryForm, attachment: null, podReference: '' })}
                    className="p-1 rounded-lg hover:bg-[#dbeafe]"
                    style={{ color: '#1e3a8a' }}
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: '#64748b' }}>POD Reference Code / Slip ID *</label>
                  <Input
                    required
                    placeholder="e.g. POD-ST998822-SIGNED.pdf"
                    value={deliveryForm.podReference}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, podReference: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: '#64748b' }}>Receiving Dock Remarks (Optional)</label>
                  <Input
                    placeholder="e.g. Received at Bay 2, pallet seal intact"
                    value={deliveryForm.comments}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, comments: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setDeliveryModalDn(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-sky-600 hover:bg-sky-700 text-white font-bold" leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                Confirm Delivery & Lock POD
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Proof of Delivery (POD) Document Viewer Modal */}
      <Modal isOpen={!!podViewerDn} onClose={() => setPodViewerDn(null)} title={`Proof of Delivery Document — ${podViewerDn?.dispatchNumber || ''}`} maxWidth="2xl">
        {podViewerDn && (
          <div className="space-y-4 text-xs font-sans">
            {/* Top Certificate Header */}
            <div className="p-4 rounded-2xl border flex items-center justify-between" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 text-white rounded-xl shadow-sm" style={{ background: '#1e3a8a' }}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono" style={{ background: '#dbeafe', color: '#1e3a8a' }}>
                    ✓ VERIFIED PROOF OF DELIVERY (POD)
                  </div>
                  <h3 className="text-base font-black mt-0.5" style={{ color: '#0f172a' }}>Commercial Delivery Certificate</h3>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Delivered Date</div>
                <div className="font-extrabold font-mono text-xs" style={{ color: '#0f172a' }}>{podViewerDn.actualDeliveryDate ? new Date(podViewerDn.actualDeliveryDate).toLocaleDateString() : 'Confirmed'}</div>
              </div>
            </div>

            {/* Delivery Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 border text-[11px]" style={{ borderColor: '#e2e8f0' }}>
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Sales Order</span>
                <span className="font-extrabold font-mono" style={{ color: '#0f172a' }}>{podViewerDn.salesOrderNumber}</span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Customer</span>
                <span className="font-bold truncate block" style={{ color: '#0f172a' }}>{podViewerDn.customerName}</span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Received By</span>
                <span className="font-bold" style={{ color: '#1e3a8a' }}>{podViewerDn.receiverName || 'Authorized Dock Supervisor'}</span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Carrier</span>
                <span className="font-mono font-bold" style={{ color: '#0f172a' }}>{podViewerDn.carrier || 'Standard Freight'}</span>
              </div>
            </div>

            {/* Render Raw Attached File (Image / PDF Preview) or Render Official POD Certificate */}
            {podViewerDn.attachment?.fileData ? (
              <div className="border rounded-2xl p-3 bg-slate-900/5 space-y-2" style={{ borderColor: '#e2e8f0' }}>
                <div className="flex items-center justify-between text-xs font-bold" style={{ color: '#0f172a' }}>
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" style={{ color: '#1e3a8a' }} /> {podViewerDn.attachment.fileName}</span>
                  <a
                    href={podViewerDn.attachment.fileData}
                    download={podViewerDn.attachment.fileName || 'POD-Document.pdf'}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 border rounded-lg font-bold text-xs shadow-sm"
                    style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>

                {podViewerDn.attachment.fileType?.startsWith('image/') || podViewerDn.attachment.fileData.startsWith('data:image/') ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white max-h-[380px] flex items-center justify-center p-2">
                    <img
                      src={podViewerDn.attachment.fileData}
                      alt="Proof of Delivery Scan"
                      className="max-h-[360px] w-auto object-contain rounded-lg shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white h-[350px]">
                    <iframe
                      src={podViewerDn.attachment.fileData}
                      title="Proof of Delivery Document"
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* High-fidelity Digital Proof of Delivery Certificate */
              <div className="p-4 rounded-2xl bg-white border shadow-sm space-y-3" style={{ borderColor: '#e2e8f0' }}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="font-mono font-bold text-xs" style={{ color: '#0f172a' }}>DOCUMENT REFERENCE: {podViewerDn.podReference || podViewerDn.attachment?.fileName || `POD-${podViewerDn.dispatchNumber}.pdf`}</div>
                  <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold" style={{ background: '#eff6ff', color: '#1e3a8a', borderColor: '#bfdbfe' }}>DIGITALLY SIGNED</span>
                </div>

                <div className="text-[11px] space-y-1" style={{ color: '#64748b' }}>
                  <div><strong>Delivery Location:</strong> {podViewerDn.customerAddress}</div>
                  <div><strong>Carrier Transporter:</strong> {podViewerDn.carrier || 'StarTrack Express'}</div>
                  <div><strong>Remarks / Dock Notes:</strong> {podViewerDn.comments || 'Goods inspected and received in full at destination receiving bay.'}</div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th className="py-2 px-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Item Code</th>
                        <th className="py-2 px-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Item Description</th>
                        <th className="py-2 px-3 text-xs font-bold uppercase tracking-widest text-right" style={{ color: '#94a3b8' }}>Delivered Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(podViewerDn.lines || []).map((l: any, i: number) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-mono font-bold" style={{ color: '#0f172a' }}>{l.itemCode}</td>
                          <td className="py-2 px-3" style={{ color: '#64748b' }}>{l.itemName}</td>
                          <td className="py-2 px-3 font-bold text-right" style={{ color: '#1e3a8a' }}>{l.deliveredQty || l.dispatchQty || l.orderedQty} units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border flex items-center justify-between text-[11px]" style={{ borderColor: '#e2e8f0' }}>
                  <div>
                    <span className="block text-[10px] font-mono" style={{ color: '#94a3b8' }}>Signatory Acceptance:</span>
                    <span className="font-bold" style={{ color: '#0f172a' }}>{podViewerDn.receiverName || 'Authorized Dock Supervisor'}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-mono" style={{ color: '#94a3b8' }}>Handover Timestamp:</span>
                    <span className="font-mono font-bold" style={{ color: '#0f172a' }}>{podViewerDn.actualDeliveryDate ? new Date(podViewerDn.actualDeliveryDate).toLocaleString() : new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setPodViewerDn(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Step 5a: Confirm Picking Modal (vendor/warehouse-only, precedes Dispatch) */}
      <Modal isOpen={!!pickModalDn} onClose={() => setPickModalDn(null)} title={`Confirm Picking — ${pickModalDn?.dispatchNumber || ''}`} maxWidth="2xl">
        {pickModalDn && (
          <form onSubmit={submitPicking} className="space-y-4 text-xs">
            {/* Header Context Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border flex flex-wrap items-center justify-between gap-2" style={{ borderColor: '#e2e8f0' }}>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Sales Order Reference</div>
                <div className="font-extrabold text-sm" style={{ color: '#0f172a' }}>{pickModalDn.salesOrderNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Warehouse Facility</div>
                <div className="font-bold text-amber-800 font-mono text-xs">{pickModalDn.warehouseCode} {pickModalDn.warehouseName ? `• ${pickModalDn.warehouseName}` : ''}</div>
              </div>
            </div>

            {/* Destination Card */}
            <div className="p-3.5 rounded-2xl border space-y-1" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div className="text-[10px] font-mono font-bold uppercase flex items-center gap-1" style={{ color: '#1e3a8a' }}>
                <MapPin className="w-3.5 h-3.5" style={{ color: '#1e3a8a' }} /> Delivery Destination
              </div>
              <div className="font-bold" style={{ color: '#0f172a' }}>{pickModalDn.customerName}</div>
              <div className="text-[11px]" style={{ color: '#64748b' }}>{pickModalDn.customerAddress || 'No street address specified'}</div>
            </div>

            {/* Line Items & Picked Quantity Verification */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest flex items-center justify-between" style={{ color: '#94a3b8' }}>
                <span className="flex items-center gap-1"><PackageSearch className="w-3.5 h-3.5 text-amber-600" /> Picked Quantity Verification</span>
                <span className="font-normal">Verify actual picked quantity against ordered</span>
              </div>
              <div className="border rounded-xl overflow-hidden bg-white" style={{ borderColor: '#e2e8f0' }}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Item SKU & Name</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest text-center" style={{ color: '#94a3b8' }}>Ordered</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest text-right" style={{ color: '#94a3b8' }}>Picked Qty *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pickForm.lines || []).map((line: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-slate-50" style={{ borderColor: '#f1f5f9' }}>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold" style={{ color: '#0f172a' }}>{line.itemCode}</div>
                          <div className="text-[11px] truncate max-w-[200px]" style={{ color: '#64748b' }}>{line.itemName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold" style={{ color: '#0f172a' }}>
                          {line.orderedQty || line.quantity || 1}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Input
                            type="number"
                            min="1"
                            max={line.orderedQty || 99999}
                            value={line.pickedQty || ''}
                            onChange={(e) => {
                              const updated = [...pickForm.lines];
                              updated[idx] = { ...updated[idx], pickedQty: Number(e.target.value) };
                              setPickForm({ ...pickForm, lines: updated });
                            }}
                            className="w-24 text-right font-bold ml-auto"
                            required
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setPickModalDn(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-amber-600 hover:bg-amber-700 text-white font-bold" leftIcon={<PackageSearch className="w-4 h-4" />}>
                Confirm Picking
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Step 5b: Dispatch Modal (vendor/warehouse-only, separate action from Picking) */}
      <Modal isOpen={!!dispatchModalDn} onClose={() => setDispatchModalDn(null)} title={`Dispatch — ${dispatchModalDn?.dispatchNumber || ''}`} maxWidth="2xl">
        {dispatchModalDn && (
          <form onSubmit={submitDispatch} className="space-y-4 text-xs">
            {/* Header Context Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border flex flex-wrap items-center justify-between gap-2" style={{ borderColor: '#e2e8f0' }}>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Sales Order Reference</div>
                <div className="font-extrabold text-sm" style={{ color: '#0f172a' }}>{dispatchModalDn.salesOrderNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Warehouse Facility</div>
                <div className="font-bold font-mono text-xs" style={{ color: '#1e3a8a' }}>{dispatchModalDn.warehouseCode} {dispatchModalDn.warehouseName ? `• ${dispatchModalDn.warehouseName}` : ''}</div>
              </div>
            </div>

            {/* Destination Card */}
            <div className="p-3.5 rounded-2xl border space-y-1" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div className="text-[10px] font-mono font-bold uppercase flex items-center gap-1" style={{ color: '#1e3a8a' }}>
                <MapPin className="w-3.5 h-3.5" style={{ color: '#1e3a8a' }} /> Delivery Destination
              </div>
              <div className="font-bold" style={{ color: '#0f172a' }}>{dispatchModalDn.customerName}</div>
              <div className="text-[11px]" style={{ color: '#64748b' }}>{dispatchModalDn.customerAddress || 'No street address specified'}</div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest flex items-center justify-between" style={{ color: '#94a3b8' }}>
                <span className="flex items-center gap-1"><Box className="w-3.5 h-3.5" style={{ color: '#1e3a8a' }} /> Dispatched Quantity Verification</span>
                <span className="font-normal">Already picked — confirm outgoing quantity</span>
              </div>
              <div className="border rounded-xl overflow-hidden bg-white" style={{ borderColor: '#e2e8f0' }}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Item SKU & Name</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest text-center" style={{ color: '#94a3b8' }}>Picked</th>
                      <th className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest text-right" style={{ color: '#94a3b8' }}>Dispatched Qty *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dispatchForm.lines || []).map((line: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-slate-50" style={{ borderColor: '#f1f5f9' }}>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold" style={{ color: '#0f172a' }}>{line.itemCode}</div>
                          <div className="text-[11px] truncate max-w-[200px]" style={{ color: '#64748b' }}>{line.itemName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold" style={{ color: '#0f172a' }}>
                          {line.pickedQty || line.orderedQty || 1}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Input
                            type="number"
                            min="1"
                            max={line.pickedQty || line.orderedQty || 99999}
                            value={line.dispatchQty || ''}
                            onChange={(e) => {
                              const updated = [...dispatchForm.lines];
                              updated[idx] = { ...updated[idx], dispatchQty: Number(e.target.value) };
                              setDispatchForm({ ...dispatchForm, lines: updated });
                            }}
                            className="w-24 text-right font-bold ml-auto"
                            required
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Carrier & Dispatch Date — tracking / consignment number is captured later,
                against the Transport Cost claim for this shipment, since several
                dispatches from this warehouse may go out together under one tracking
                number. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>Carrier / Transporter *</label>
                <Input
                  required
                  placeholder="e.g. StarTrack Express, Toll Priority"
                  value={dispatchForm.carrier}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, carrier: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>Date of Physical Dispatch *</label>
                <Input
                  type="date"
                  required
                  value={dispatchForm.dispatchDate}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>Driver / Manifest Notes (Optional)</label>
                <Input
                  placeholder="e.g. Pallet wrapped, Bay 4 loading"
                  value={dispatchForm.comments}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, comments: e.target.value })}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setDispatchModalDn(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-[#1e3a8a] hover:bg-[#162c69] text-white font-bold" leftIcon={<Truck className="w-4 h-4" />}>
                Confirm & Release Dispatch
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Step 5c: Report Rejection / Delivery Exception Modal — reason mandatory */}
      <Modal isOpen={!!rejectModalDn} onClose={() => setRejectModalDn(null)} title={`Report Rejection / Delivery Exception — ${rejectModalDn?.dispatchNumber || ''}`} maxWidth="lg">
        {rejectModalDn && (
          <form onSubmit={submitRejection} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl border flex items-start gap-2.5" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#991b1b' }} />
              <div style={{ color: '#991b1b' }}>
                This marks <strong>{rejectModalDn.dispatchNumber}</strong> ({rejectModalDn.salesOrderNumber}) as a delivery exception —
                use this when the order can no longer be completed as dispatched (e.g. refused at the dock, lost in transit, customer cancellation after dispatch). A reason is required.
              </div>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>Reason for Rejection / Exception *</label>
              <textarea
                required
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                placeholder="e.g. Customer refused delivery — wrong item shipped. Returning to WH-SYD-01."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setRejectModalDn(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-rose-600 hover:bg-rose-700 text-white font-bold" leftIcon={<XCircle className="w-4 h-4" />}>
                Report Exception
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit modal — lifecycle-aware status dropdown */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing ? `Update ${editing.dispatchNumber}` : 'Update Dispatch Note'} maxWidth="lg">
        {editing && (
          <form onSubmit={save} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border" style={{ borderColor: '#e2e8f0' }}>
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Sales Order</div>
              <div className="font-bold" style={{ color: '#0f172a' }}>{editing.salesOrderNumber} — {editing.customerName}</div>
              <div className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>{editing.lines?.[0]?.itemCode} • {editing.lines?.[0]?.itemName} • Ordered {editing.lines?.[0]?.orderedQty}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>Status *</label>
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  options={[
                    { value: editing.status, label: `${editing.status.replace(/_/g, ' ')} (current)` },
                    ...editAllowed.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>Dispatch Qty</label>
                <Input type="number" min="0" value={form.dispatchQty} onChange={(e) => setForm({ ...form, dispatchQty: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>Carrier / Transporter</label>
                <Input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} placeholder="e.g. StarTrack Express" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1" style={{ color: '#0f172a' }}>Comments</label>
              <Input value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" variant="primary" className="bg-[#1e3a8a] hover:bg-[#162c69]" leftIcon={<PackageCheck className="w-4 h-4" />}>Save Update</Button>
            </div>
          </form>
        )}
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
