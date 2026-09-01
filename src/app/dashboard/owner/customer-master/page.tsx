'use client';

import { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ItemPicker } from '@/components/ui/ItemPicker';
import { QuickAddCustomerModal } from '@/components/customer-master/QuickAddCustomerModal';
import { Plus, Search, Edit2, Trash2, RefreshCw, Users } from 'lucide-react';

// FR-MD-004 — Customer Master Data. Key fields per requirement:
// Customer Name, Item Code, Item Description, Selling Price, Currency, MOQ, Payment Terms, Incoterms.

interface CustomerMasterRecord {
  id: string;
  customerName: string;
  itemCode: string;
  customerItemCode?: string;
  itemDescription: string;
  sellingPrice: number;
  currency: string;
  moq: number;
  paymentTerms: string;
  incoterms: string;
  leadTimeDays: number;
  createdAt: string;
  updatedAt: string;
}

const CURRENCIES = ['AUD', 'USD', 'EUR', 'GBP', 'NZD', 'SGD'];
const PAYMENT_TERMS = ['Net 7', 'Net 14', 'Net 30', 'Net 45', 'Net 60', 'Prepaid', 'CIA (Cash in Advance)', 'COD'];
const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

const emptyForm = {
  customerName: '',
  itemCode: '',
  customerItemCode: '',
  itemDescription: '',
  sellingPrice: '',
  currency: 'AUD',
  moq: '',
  paymentTerms: 'Net 30',
  incoterms: 'EXW',
  leadTimeDays: '7',
};

export default function CustomerMasterDataPage() {
  const [records, setRecords] = useState<CustomerMasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerMasterRecord | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [res, itemsRes] = await Promise.all([
        fetch('/api/mdm/customer-master'),
        fetch('/api/mdm/items')
      ]);
      const data = await res.json();
      const itemsData = await itemsRes.json();
      setRecords(data.records || []);
      setItems(itemsData.items || []);
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
    setIsQuickAddOpen(true);
  };

  const openEdit = (r: CustomerMasterRecord) => {
    setEditing(r);
    setForm({ ...r, sellingPrice: String(r.sellingPrice), moq: String(r.moq) });
    setIsOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const res = await fetch(`/api/mdm/customer-master/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setToast({ msg: 'Record updated.', type: 'success' });
      setIsOpen(false);
      load();
    } catch (err: any) {
      setToast({ msg: err.message || 'Save failed.', type: 'error' });
    }
  };

  const handleQuickAddCreated = (customerName: string) => {
    setIsQuickAddOpen(false);
    setToast({ msg: `Price agreement created for ${customerName}.`, type: 'success' });
    load();
  };

  const remove = async (r: CustomerMasterRecord) => {
    if (!confirm(`Delete customer master record for ${r.customerName} / ${r.itemCode}?`)) return;
    try {
      const res = await fetch(`/api/mdm/customer-master/${r.id}`, { method: 'DELETE' });
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
    return r.customerName.toLowerCase().includes(s) || r.itemCode.toLowerCase().includes(s) || r.itemDescription.toLowerCase().includes(s);
  });

  const columns: Column<CustomerMasterRecord>[] = [
    { header: 'Customer Name', cell: (r) => <span className="font-bold text-slate-900">{r.customerName}</span> },
    { header: 'Item Code', cell: (r) => <span className="font-mono text-xs text-indigo-700">{r.itemCode}</span> },
    { header: "Customer's Item Code", cell: (r) => <span className="font-mono text-xs text-slate-600">{r.customerItemCode || '—'}</span> },
    { header: 'Item Description', accessorKey: 'itemDescription' },
    { header: 'Selling Price', cell: (r) => <span className="font-mono">{r.currency} {r.sellingPrice.toFixed(2)}</span> },
    { header: 'MOQ', cell: (r) => <span className="font-mono">{r.moq.toLocaleString()}</span> },
    { header: 'Payment Terms', accessorKey: 'paymentTerms' },
    { header: 'Incoterms', cell: (r) => <span className="font-mono font-bold text-slate-700">{r.incoterms}</span> },
    { header: 'Lead Time', cell: (r) => <span className="font-mono">{r.leadTimeDays} day{r.leadTimeDays === 1 ? '' : 's'}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Customer Master Data
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pricing and terms used when creating Sales Orders and Sales Invoices for each customer.
          </p>
        </div>
        <Button onClick={openCreate} variant="primary" className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Customer Master Record
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, item code or description..."
            className="pl-10"
          />
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={loading}
        emptyMessage="No customer master records yet. Add your first record above."
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

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Edit Customer Master Record" maxWidth="lg">
        {editing && (
          <form onSubmit={save} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Customer Name *</label>
                <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Item *</label>
                <ItemPicker
                  items={items}
                  value={{ itemCode: form.itemCode, itemName: form.itemDescription }}
                  onChange={(v) => setForm({ ...form, itemCode: v.itemCode, itemDescription: v.itemName, sellingPrice: v.sellingPrice || form.sellingPrice })}
                  placeholder="Search global items..."
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Item Description *</label>
              <Input value={form.itemDescription} readOnly className="bg-slate-50 cursor-not-allowed text-slate-500" required />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Customer's Item Code</label>
              <Input
                value={form.customerItemCode}
                onChange={(e) => setForm({ ...form, customerItemCode: e.target.value })}
                placeholder="e.g. the customer's own SKU/reference for this item"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Selling Price *</label>
                <Input type="number" step="0.01" min="0" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} required />
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

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Incoterms *</label>
              <Select value={form.incoterms} onChange={(e) => setForm({ ...form, incoterms: e.target.value })} options={INCOTERMS.map((t) => ({ value: t, label: t }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payment Terms *</label>
                <Select value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} options={PAYMENT_TERMS.map((t) => ({ value: t, label: t }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Lead Time (Days) *</label>
                <Input type="number" min="0" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} required />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Update Record</Button>
            </div>
          </form>
        )}
      </Modal>

      <QuickAddCustomerModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        items={items}
        existingRecords={records}
        onCreated={handleQuickAddCreated}
      />

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
