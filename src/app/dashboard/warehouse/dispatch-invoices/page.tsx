'use client';

// Dispatch Invoice & Payment List (per shared spec).
// Columns: Dispatch No. | PO Number | Amount Value | Invoice No. | Attachment | Payment Status
// Extended fields per SRS §7.7 / §7.8.

import { useEffect, useState } from 'react';
import { Receipt, Search, RefreshCw, Edit2, FileText, Paperclip, DollarSign } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';

interface DispatchInvoice {
  id: string;
  dispatchNumber: string;
  salesOrderNumber?: string;
  customerPoNumber?: string;
  customerName: string;
  dispatchValue: number;
  currency: string;
  invoiceNumber: string;
  invoiceDate?: string;
  invoiceAmount: number;
  attachment?: { fileName: string; fileUrl?: string; type: 'INVOICE' | 'POD' | 'DELIVERY_NOTE' };
  paymentDueDate?: string;
  paymentStatus: string;
  paymentDate?: string;
  paymentReference?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUSES = ['NOT_INVOICED', 'INVOICE_ISSUED', 'PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'ON_HOLD', 'DISPUTED', 'CANCELLED'];

const STATUS_STYLES: Record<string, string> = {
  NOT_INVOICED: 'bg-slate-100 text-slate-700 border-slate-200',
  INVOICE_ISSUED: 'bg-sky-50 text-sky-700 border-sky-200',
  PAYMENT_PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PARTIALLY_PAID: 'bg-orange-50 text-orange-700 border-orange-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
  ON_HOLD: 'bg-purple-50 text-purple-700 border-purple-200',
  DISPUTED: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  CANCELLED: 'bg-slate-200 text-slate-600 border-slate-300',
};

export default function WarehouseDispatchInvoiceListPage() {
  const [records, setRecords] = useState<DispatchInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editing, setEditing] = useState<DispatchInvoice | null>(null);
  const [form, setForm] = useState<any>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dispatch-invoices');
      const data = await res.json();
      setRecords(data.dispatchInvoices || []);
    } catch (e) {
      setToast({ msg: 'Failed to load dispatch invoices.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (r: DispatchInvoice) => {
    setEditing(r);
    setForm({
      paymentStatus: r.paymentStatus,
      paymentDate: r.paymentDate ? r.paymentDate.slice(0, 10) : '',
      paymentReference: r.paymentReference || '',
      comments: r.comments || '',
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const res = await fetch(`/api/dispatch-invoices/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ msg: 'Payment record updated.', type: 'success' });
      setEditing(null);
      load();
    } catch (err: any) {
      setToast({ msg: err.message || 'Update failed.', type: 'error' });
    }
  };

  const filtered = records.filter((r) => {
    if (statusFilter !== 'ALL' && r.paymentStatus !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.dispatchNumber.toLowerCase().includes(s) ||
      (r.customerPoNumber || '').toLowerCase().includes(s) ||
      r.invoiceNumber.toLowerCase().includes(s) ||
      r.customerName.toLowerCase().includes(s)
    );
  });

  const totalPending = records.filter((r) => r.paymentStatus === 'PAYMENT_PENDING').reduce((s, r) => s + r.invoiceAmount, 0);
  const totalPaid = records.filter((r) => r.paymentStatus === 'PAID').reduce((s, r) => s + r.invoiceAmount, 0);
  const totalOverdue = records.filter((r) => r.paymentStatus === 'OVERDUE').reduce((s, r) => s + r.invoiceAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-emerald-600" /> Dispatch Invoice & Payment List
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Operational register linking dispatch, customer PO, invoice value, attachments and payment status.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Total Records</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{records.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="text-[10px] font-mono font-bold text-amber-700 uppercase">Payment Pending</div>
          <div className="text-2xl font-black text-amber-900 mt-1">AUD {totalPending.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="text-[10px] font-mono font-bold text-emerald-700 uppercase">Paid</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">AUD {totalPaid.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
          <div className="text-[10px] font-mono font-bold text-rose-700 uppercase">Overdue</div>
          <div className="text-2xl font-black text-rose-900 mt-1">AUD {totalOverdue.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by dispatch, PO, invoice, customer..." className="pl-10" />
        </div>
        <div className="w-full md:w-56">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: 'ALL', label: 'All payment statuses' }, ...STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))]} />
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono">
              <th className="py-3 px-4 font-bold">Dispatch No.</th>
              <th className="py-3 px-4 font-bold">PO Number</th>
              <th className="py-3 px-4 font-bold text-right">Amount Value</th>
              <th className="py-3 px-4 font-bold">Invoice No.</th>
              <th className="py-3 px-4 font-bold">Attachment</th>
              <th className="py-3 px-4 font-bold">Payment Status</th>
              <th className="py-3 px-4 font-bold">Payment Ref</th>
              <th className="py-3 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400 font-mono">Loading dispatch invoices...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">No dispatch invoices match your filters.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-700">{r.dispatchNumber}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{r.customerPoNumber || '—'}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{r.currency} {r.invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">{r.invoiceNumber}</td>
                  <td className="py-3 px-4">
                    {r.attachment ? (
                      <a href={r.attachment.fileUrl || '#'} className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-bold hover:underline">
                        <Paperclip className="w-3 h-3" /> {r.attachment.type.replace(/_/g, ' ')}
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.paymentStatus] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {r.paymentStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{r.paymentReference || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600" aria-label="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing ? `Update payment for ${editing.invoiceNumber}` : ''} maxWidth="md">
        {editing && (
          <form onSubmit={save} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Dispatch / PO</div>
              <div className="font-bold text-slate-900">{editing.dispatchNumber} · {editing.customerPoNumber || 'No PO'}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Amount: {editing.currency} {editing.invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Payment Status *</label>
              <Select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })} options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payment Date</label>
                <Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payment Reference</label>
                <Input value={form.paymentReference} onChange={(e) => setForm({ ...form, paymentReference: e.target.value })} placeholder="e.g. BANK-REF-##" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Comments</label>
              <Input value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" variant="primary" leftIcon={<DollarSign className="w-4 h-4" />}>Save Update</Button>
            </div>
          </form>
        )}
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
