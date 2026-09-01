'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ItemPicker } from '@/components/ui/ItemPicker';
import { Plus, Trash2 } from 'lucide-react';

const CURRENCIES = ['AUD', 'USD', 'EUR', 'GBP', 'NZD', 'SGD'];
const PAYMENT_TERMS = ['Net 7', 'Net 14', 'Net 30', 'Net 45', 'Net 60', 'Prepaid', 'CIA (Cash in Advance)', 'COD'];
const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

const emptyLine = { itemCode: '', customerItemCode: '', itemDescription: '', sellingPrice: '', moq: '', incoterms: 'EXW' };
const emptyForm = {
  customerName: '',
  currency: 'AUD',
  paymentTerms: 'Net 30',
  leadTimeDays: '7',
  lines: [{ ...emptyLine }],
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  existingRecords: any[];
  onCreated: (customerName: string) => void;
}

// Shared "create a new Customer Master record" form — used both on the Customer Master
// page itself and inline from Create Sales Order, so a customer with no price agreement
// yet doesn't force a detour away from the order being created.
export function QuickAddCustomerModal({ isOpen, onClose, items, existingRecords, onCreated }: Props) {
  const [form, setForm] = useState<any>(emptyForm);
  const [error, setError] = useState('');

  const addLine = () => setForm({ ...form, lines: [...form.lines, { ...emptyLine }] });
  const removeLine = (idx: number) => {
    if (form.lines.length <= 1) return;
    setForm({ ...form, lines: form.lines.filter((_: any, i: number) => i !== idx) });
  };
  const updateLine = (idx: number, patch: Partial<typeof emptyLine>) => {
    const lines = [...form.lines];
    lines[idx] = { ...lines[idx], ...patch };
    setForm({ ...form, lines });
  };

  const existingCustomerMatch = form.customerName.trim()
    ? existingRecords.find((r: any) => r.customerName.trim().toLowerCase() === form.customerName.trim().toLowerCase())
    : null;
  const existingItemCodesForCustomer = existingCustomerMatch
    ? new Set(existingRecords.filter((r: any) => r.customerName.trim().toLowerCase() === existingCustomerMatch.customerName.trim().toLowerCase()).map((r: any) => r.itemCode))
    : new Set<string>();
  const effectiveCurrency = existingCustomerMatch ? existingCustomerMatch.currency : form.currency;
  const effectivePaymentTerms = existingCustomerMatch ? existingCustomerMatch.paymentTerms : form.paymentTerms;
  const effectiveLeadTimeDays = existingCustomerMatch ? existingCustomerMatch.leadTimeDays : Number(form.leadTimeDays);

  const handleClose = () => {
    setForm(emptyForm);
    setError('');
    onClose();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.lines.some((l: any) => !l.itemCode)) {
      setError('Every item line needs an item selected.');
      return;
    }
    const duplicateLine = form.lines.find((l: any) => existingItemCodesForCustomer.has(l.itemCode));
    if (duplicateLine) {
      setError(`${existingCustomerMatch?.customerName} already has a price agreement for ${duplicateLine.itemCode}. Edit that record instead.`);
      return;
    }
    try {
      const res = await fetch('/api/mdm/customer-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: existingCustomerMatch ? existingCustomerMatch.customerName : form.customerName,
          currency: effectiveCurrency,
          paymentTerms: effectivePaymentTerms,
          leadTimeDays: effectiveLeadTimeDays,
          lines: form.lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create customer record.');
      const createdName = existingCustomerMatch ? existingCustomerMatch.customerName : form.customerName;
      setForm(emptyForm);
      onCreated(createdName);
    } catch (err: any) {
      setError(err.message || 'Failed to create customer record.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Customer Master Record" maxWidth="2xl">
      <form onSubmit={save} className="space-y-4 text-xs">
        <p className="text-[11px] text-slate-500">
          Customer name, currency, payment terms, and lead time apply to every item below — one price agreement record is created per item.
        </p>

        {error && (
          <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 font-semibold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Customer Name *</label>
            <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Currency *</label>
            <Select
              value={effectiveCurrency}
              disabled={!!existingCustomerMatch}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Payment Terms *</label>
            <Select
              value={effectivePaymentTerms}
              disabled={!!existingCustomerMatch}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              options={PAYMENT_TERMS.map((t) => ({ value: t, label: t }))}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Lead Time (Days) *</label>
            <Input
              type="number"
              min="0"
              value={effectiveLeadTimeDays}
              disabled={!!existingCustomerMatch}
              onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
              required
            />
          </div>
        </div>

        {existingCustomerMatch && (
          <div className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-800 font-semibold">
            Existing customer — reusing their stored currency and payment terms. These new items will be added to {existingCustomerMatch.customerName}'s existing price list.
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Items *</label>
            <button type="button" onClick={addLine} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          {form.lines.map((line: any, idx: number) => {
            const isDuplicate = line.itemCode && existingItemCodesForCustomer.has(line.itemCode);
            return (
              <div key={idx} className={`p-3 rounded-xl border ${isDuplicate ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-start">
                  <ItemPicker
                    items={items}
                    value={{ itemCode: line.itemCode, itemName: line.itemDescription }}
                    onChange={(v: any) => updateLine(idx, {
                      itemCode: v.itemCode,
                      itemDescription: v.itemName,
                      sellingPrice: v.sellingPrice ? String(v.sellingPrice) : line.sellingPrice,
                      moq: !line.moq && v.moq ? String(v.moq) : line.moq,
                    })}
                    placeholder="Search global items..."
                  />
                  <Input type="number" step="0.01" min="0" placeholder="Selling price" value={line.sellingPrice} onChange={(e) => updateLine(idx, { sellingPrice: e.target.value })} required />
                  <Input type="number" min="0" placeholder="MOQ" value={line.moq} onChange={(e) => updateLine(idx, { moq: e.target.value })} required />
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={form.lines.length <= 1}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <Input
                    placeholder="Customer's item code (optional)"
                    value={line.customerItemCode}
                    onChange={(e) => updateLine(idx, { customerItemCode: e.target.value })}
                  />
                  <Select
                    value={line.incoterms}
                    onChange={(e) => updateLine(idx, { incoterms: e.target.value })}
                    options={INCOTERMS.map((t) => ({ value: t, label: t }))}
                  />
                </div>
                {isDuplicate && (
                  <p className="text-[11px] text-rose-700 font-bold mt-2">
                    {existingCustomerMatch?.customerName} already has a price agreement for {line.itemCode} — edit that record instead of adding it again.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={form.lines.some((l: any) => l.itemCode && existingItemCodesForCustomer.has(l.itemCode))}
          >
            Create Record{form.lines.length > 1 ? 's' : ''}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
