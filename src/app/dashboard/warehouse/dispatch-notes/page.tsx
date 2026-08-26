'use client';

// Warehouse Dispatch Note List page (per shared spec).
// Columns: Sales Order No. | Dispatch No. | Customer | Item Code / Item | Quantity | Status | Tracking No. | Comments
// Backed by dispatch-notes lib and /api/dispatch-notes; scoped to warehouse user's warehouse.

import { useEffect, useState } from 'react';
import { Truck, Search, RefreshCw, Filter, Edit2, PackageCheck, ClipboardList } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';

interface DispatchNote {
  id: string;
  dispatchNumber: string;
  salesOrderNumber: string;
  customerName: string;
  customerAddress: string;
  warehouseCode: string;
  warehouseName?: string;
  itemCode: string;
  itemName: string;
  orderedQty: number;
  dispatchQty: number;
  status: string;
  dispatchDate?: string;
  carrier?: string;
  trackingNumber?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUSES = [
  'PENDING',
  'ALLOCATED',
  'PICKING',
  'PICKED',
  'PACKING',
  'PACKED',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
  'PARTIALLY_DELIVERED',
  'DELIVERY_EXCEPTION',
  'ON_HOLD',
  'RETURNED',
  'CANCELLED',
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-200',
  ALLOCATED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PICKING: 'bg-amber-50 text-amber-700 border-amber-200',
  PICKED: 'bg-amber-100 text-amber-800 border-amber-300',
  PACKING: 'bg-sky-50 text-sky-700 border-sky-200',
  PACKED: 'bg-sky-100 text-sky-800 border-sky-300',
  READY_FOR_DISPATCH: 'bg-purple-50 text-purple-700 border-purple-200',
  DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 border-blue-300',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIALLY_DELIVERED: 'bg-teal-50 text-teal-700 border-teal-200',
  DELIVERY_EXCEPTION: 'bg-rose-50 text-rose-700 border-rose-200',
  ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
  RETURNED: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  CANCELLED: 'bg-slate-200 text-slate-600 border-slate-300',
};

export default function WarehouseDispatchNoteListPage() {
  const [records, setRecords] = useState<DispatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editing, setEditing] = useState<DispatchNote | null>(null);
  const [form, setForm] = useState<any>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dispatch-notes');
      const data = await res.json();
      setRecords(data.dispatchNotes || []);
    } catch (e) {
      setToast({ msg: 'Failed to load dispatch notes.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (r: DispatchNote) => {
    setEditing(r);
    setForm({
      status: r.status,
      carrier: r.carrier || '',
      trackingNumber: r.trackingNumber || '',
      dispatchQty: r.dispatchQty,
      comments: r.comments || '',
    });
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

  const filtered = records.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.dispatchNumber.toLowerCase().includes(s) ||
      r.salesOrderNumber.toLowerCase().includes(s) ||
      r.customerName.toLowerCase().includes(s) ||
      r.itemCode.toLowerCase().includes(s) ||
      r.itemName.toLowerCase().includes(s) ||
      (r.trackingNumber || '').toLowerCase().includes(s)
    );
  });

  const counts = {
    total: records.length,
    picking: records.filter((r) => r.status === 'PICKING' || r.status === 'PICKED').length,
    inTransit: records.filter((r) => r.status === 'IN_TRANSIT' || r.status === 'DISPATCHED').length,
    delivered: records.filter((r) => r.status === 'DELIVERED').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-indigo-600" /> Warehouse Dispatch Note List
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Operational control view for sales-order picking, packing, dispatch, transit and delivery tracking.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Total Dispatches</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{counts.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="text-[10px] font-mono font-bold text-amber-700 uppercase">In Picking</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{counts.picking}</div>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
          <div className="text-[10px] font-mono font-bold text-blue-700 uppercase">In Transit</div>
          <div className="text-2xl font-black text-blue-900 mt-1">{counts.inTransit}</div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="text-[10px] font-mono font-bold text-emerald-700 uppercase">Delivered</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{counts.delivered}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by dispatch, SO, customer, item, tracking..." className="pl-10" />
        </div>
        <div className="w-full md:w-56">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: 'ALL', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))]} />
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
              <th className="py-3 px-4 font-bold">Sales Order No.</th>
              <th className="py-3 px-4 font-bold">Dispatch No.</th>
              <th className="py-3 px-4 font-bold">Customer</th>
              <th className="py-3 px-4 font-bold">Item Code / Item</th>
              <th className="py-3 px-4 font-bold text-right">Quantity</th>
              <th className="py-3 px-4 font-bold">Status</th>
              <th className="py-3 px-4 font-bold">Tracking No.</th>
              <th className="py-3 px-4 font-bold">Comments</th>
              <th className="py-3 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400 font-mono">Loading dispatch notes...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">No dispatch notes match your filters.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.salesOrderNumber}</td>
                  <td className="py-3 px-4 font-mono font-bold text-indigo-700">{r.dispatchNumber}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{r.customerName}</td>
                  <td className="py-3 px-4">
                    <div className="font-mono text-emerald-700 font-bold text-[11px]">{r.itemCode}</div>
                    <div className="text-[11px] text-slate-600">{r.itemName}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">{r.dispatchQty}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">{r.trackingNumber || '—'}</td>
                  <td className="py-3 px-4 text-slate-600 text-[11px] max-w-[200px] truncate">{r.comments || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600" aria-label="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing ? `Update ${editing.dispatchNumber}` : 'Update Dispatch Note'} maxWidth="lg">
        {editing && (
          <form onSubmit={save} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Sales Order</div>
              <div className="font-bold text-slate-900">{editing.salesOrderNumber} — {editing.customerName}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{editing.itemCode} · {editing.itemName} · Ordered {editing.orderedQty}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Status *</label>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Dispatch Qty</label>
                <Input type="number" min="0" value={form.dispatchQty} onChange={(e) => setForm({ ...form, dispatchQty: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Carrier / Transporter</label>
                <Input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} placeholder="e.g. StarTrack Express" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tracking Number</label>
                <Input value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} placeholder="e.g. TRK45879621" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Comments</label>
              <Input value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" variant="primary" leftIcon={<PackageCheck className="w-4 h-4" />}>Save Update</Button>
            </div>
          </form>
        )}
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
