'use client';

import { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ItemPicker } from '@/components/ui/ItemPicker';
import { Plus, Search, Edit2, Trash2, RefreshCw, Building } from 'lucide-react';

// FR-MD-004 — Vendor Master Data. Key fields per requirement:
// Vendor Name, Item Code, Item Description, Cost of Goods, Currency, MOQ, Lead Time, Payment Terms, Incoterms.

interface VendorMasterRecord {
  id: string;
  vendorName: string;
  itemCode: string;
  itemDescription: string;
  costOfGoods: number;
  currency: string;
  moq: number;
  leadTimeDays: number;
  paymentTerms: string;
  incoterms: string;
  createdAt: string;
  updatedAt: string;
}

const CURRENCIES = ['AUD', 'USD', 'EUR', 'GBP', 'NZD', 'SGD'];
const PAYMENT_TERMS = ['Net 7', 'Net 14', 'Net 30', 'Net 45', 'Net 60', 'Prepaid', 'CIA (Cash in Advance)', 'COD'];
const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

const emptyForm = {
  vendorName: '',
  itemCode: '',
  itemDescription: '',
  costOfGoods: '',
  currency: 'AUD',
  moq: '',
  leadTimeDays: '',
  paymentTerms: 'Net 30',
  incoterms: 'EXW',
};

export default function VendorMasterDataPage() {
  const [records, setRecords] = useState<VendorMasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [registeredVendors, setRegisteredVendors] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<VendorMasterRecord | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [res, itemsRes, vendorsRes] = await Promise.all([
        fetch('/api/mdm/vendor-master'),
        fetch('/api/mdm/items'),
        fetch('/api/admin/vendors'),
      ]);
      const data = await res.json();
      const itemsData = await itemsRes.json();
      const vendorsData = vendorsRes.ok ? await vendorsRes.json() : { vendors: [] };
      setRecords(data.records || []);
      setItems(itemsData.items || []);
      setRegisteredVendors(
        Array.from(
          new Set(
            (vendorsData.vendors || [])
              .filter((v: any) => v.status === 'APPROVED' && v.companyName)
              .map((v: any) => v.companyName as string)
          )
        )
      );
    } catch (e) {
      setToast({ msg: 'Failed to load records.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (r: VendorMasterRecord) => {
    setEditing(r);
    setForm({ ...r, costOfGoods: String(r.costOfGoods), moq: String(r.moq), leadTimeDays: String(r.leadTimeDays) });
    setIsOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/mdm/vendor-master/${editing.id}` : '/api/mdm/vendor-master';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setToast({ msg: editing ? 'Record updated.' : 'Record created.', type: 'success' });
      setIsOpen(false);
      load();
    } catch (err: any) {
      setToast({ msg: err.message || 'Save failed.', type: 'error' });
    }
  };

  const remove = async (r: VendorMasterRecord) => {
    if (!confirm(`Delete vendor master record for ${r.vendorName} / ${r.itemCode}?`)) return;
    try {
      const res = await fetch(`/api/mdm/vendor-master/${r.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setToast({ msg: 'Record deleted.', type: 'success' });
      load();
    } catch (err: any) {
      setToast({ msg: err.message || 'Delete failed.', type: 'error' });
    }
  };

  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return r.vendorName.toLowerCase().includes(s) || r.itemCode.toLowerCase().includes(s) || r.itemDescription.toLowerCase().includes(s);
  });

  const columns: Column<VendorMasterRecord>[] = [
    { header: 'Vendor Name', cell: (r) => <span className="font-bold text-slate-900">{r.vendorName}</span> },
    { header: 'Item Code', cell: (r) => <span className="font-mono text-xs text-indigo-700">{r.itemCode}</span> },
    { header: 'Item Description', accessorKey: 'itemDescription' },
    { header: 'Cost of Goods', cell: (r) => <span className="font-mono">{r.currency} {r.costOfGoods.toFixed(2)}</span> },
    { header: 'MOQ', cell: (r) => <span className="font-mono">{r.moq.toLocaleString()}</span> },
    { header: 'Lead Time', cell: (r) => <span className="font-mono">{r.leadTimeDays} days</span> },
    { header: 'Payment Terms', accessorKey: 'paymentTerms' },
    { header: 'Incoterms', cell: (r) => <span className="font-mono font-bold text-slate-700">{r.incoterms}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Building className="w-6 h-6 text-indigo-600" /> Vendor Pricing &amp; Terms
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Per-item procurement pricing and terms used when creating Purchase Orders for each vendor.
          </p>
        </div>
        <Button onClick={openCreate} variant="primary" className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Vendor Master Record
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vendor, item code or description..."
            className="pl-10"
          />
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={loading}
        emptyMessage="No vendor master records yet. Add your first record above."
        showSearch={false}
        actions={(r) => (
          <div className="flex gap-2 justify-end">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600" aria-label="Edit">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => remove(r)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600" aria-label="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      />

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? 'Edit Vendor Master Record' : 'Add Vendor Master Record'} maxWidth="lg">
        <form onSubmit={save} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Vendor Name *</label>
              <Select
                value={form.vendorName}
                onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                options={[{ value: '', label: '-- Select registered vendor --' }, ...registeredVendors.map((v) => ({ value: v, label: v }))]}
                required
              />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Item *</label>
                <ItemPicker
                  items={items}
                  value={{ itemCode: form.itemCode, itemName: form.itemDescription }}
                  onChange={(v) => setForm({ ...form, itemCode: v.itemCode, itemDescription: v.itemName, costOfGoods: v.unitCost || form.costOfGoods })}
                  placeholder="Search global items..."
                />
              </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Item Description *</label>
            <Input value={form.itemDescription} readOnly className="bg-slate-50 cursor-not-allowed text-slate-500" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Cost of Goods *</label>
              <Input type="number" step="0.01" min="0" value={form.costOfGoods} onChange={(e) => setForm({ ...form, costOfGoods: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Currency *</label>
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">MOQ *</label>
              <Input type="number" min="0" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Lead Time (days) *</label>
              <Input type="number" min="0" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Payment Terms *</label>
              <Select value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} options={PAYMENT_TERMS.map((t) => ({ value: t, label: t }))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Incoterms *</label>
              <Select value={form.incoterms} onChange={(e) => setForm({ ...form, incoterms: e.target.value })} options={INCOTERMS.map((t) => ({ value: t, label: t }))} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editing ? 'Update Record' : 'Create Record'}</Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
