'use client';

import { useEffect, useState } from 'react';
import {
  Truck, Search, RefreshCw, Plus, X, Mail, MapPin, CreditCard,
  Building2, Save, Edit2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Supplier {
  id: string;
  companyName: string;
  abnAcn: string;
  status: string;
  businessRegisteredAddress?: string;
  paymentTerms?: string;
  currency?: string;
  poEmail?: string;
  apEmail?: string;
  bankBsb?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  myobContactId?: string;
  user?: { email: string; fullName?: string };
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>{label}</p>
      <p className={`text-xs leading-snug ${mono ? 'font-mono' : 'font-semibold'}`} style={{ color: '#0f172a' }}>{value}</p>
    </div>
  );
}

function MissingTag({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}>
      ⚠ {label} not set
    </span>
  );
}

// ─── Slide-over form ────────────────────────────────────────────────────────

interface FormProps {
  initial?: Supplier | null;
  onSave: (supplier: Supplier) => void;
  onClose: () => void;
}

function SupplierForm({ initial, onSave, onClose }: FormProps) {
  const isEdit = !!initial;

  const [companyName, setCompanyName] = useState(initial?.companyName ?? '');
  const [abnAcn, setAbnAcn] = useState(initial?.abnAcn ?? '');
  const [poEmail, setPoEmail] = useState(initial?.poEmail ?? '');
  const [apEmail, setApEmail] = useState(initial?.apEmail ?? '');
  const [address, setAddress] = useState(initial?.businessRegisteredAddress ?? '');
  const [bankBsb, setBankBsb] = useState(initial?.bankBsb ?? '');
  const [bankAccNum, setBankAccNum] = useState(initial?.bankAccountNumber ?? '');
  const [bankAccName, setBankAccName] = useState(initial?.bankAccountName ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (isEdit) {
        // PUT — update existing vendor's operational details
        const res = await fetch('/api/admin/vendors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId: initial!.id,
            poEmail: poEmail.trim() || null,
            apEmail: apEmail.trim() || null,
            bankBsb: bankBsb.trim() || null,
            bankAccountNumber: bankAccNum.trim() || null,
            bankAccountName: bankAccName.trim() || null,
          }),
        });
        if (!res.ok) {
          const j = await res.json();
          setError(j.error || 'Update failed.');
          setSaving(false);
          return;
        }
        onSave({
          ...initial!,
          poEmail: poEmail.trim() || undefined,
          apEmail: apEmail.trim() || undefined,
          businessRegisteredAddress: address.trim() || undefined,
          bankBsb: bankBsb.trim() || undefined,
          bankAccountNumber: bankAccNum.trim() || undefined,
          bankAccountName: bankAccName.trim() || undefined,
        });
      } else {
        // POST — create new vendor
        const res = await fetch('/api/admin/vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: companyName.trim(),
            abnAcn: abnAcn.trim() || undefined,
            poEmail: poEmail.trim(),
            apEmail: apEmail.trim() || null,
            businessRegisteredAddress: address.trim() || null,
            bankBsb: bankBsb.trim() || null,
            bankAccountNumber: bankAccNum.trim() || null,
            bankAccountName: bankAccName.trim() || null,
          }),
        });
        const j = await res.json();
        if (!res.ok) { setError(j.error || 'Failed to add supplier.'); setSaving(false); return; }

        onSave({
          id: j.vendor?.id ?? '',
          companyName: companyName.trim(),
          abnAcn: j.vendor?.abnAcn ?? abnAcn.trim(),
          status: 'APPROVED',
          businessRegisteredAddress: address.trim() || undefined,
          poEmail: poEmail.trim() || undefined,
          apEmail: apEmail.trim() || undefined,
          bankBsb: bankBsb.trim() || undefined,
          bankAccountNumber: bankAccNum.trim() || undefined,
          bankAccountName: bankAccName.trim() || undefined,
        });
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSaving(false);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? `Edit Supplier — ${initial!.companyName}` : 'Add New Supplier'}
      subtitle="Only company name and PO email are required — everything else can be added later"
      maxWidth="3xl"
    >
      <div className="space-y-6 text-xs font-sans max-w-3xl">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: COMPANY IDENTITY */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#4C3AE3]" />
              <span>1. Company Identity</span>
            </div>
            <Input label="Business / Company Name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Apex Hardware Pty Ltd" disabled={isEdit} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="ABN or ACN" value={abnAcn} onChange={(e) => setAbnAcn(e.target.value)} placeholder="Optional — can be added later" disabled={isEdit} />
              <Input label="Registered Business Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Trade St, Melbourne VIC 3000" />
            </div>
          </div>

          {/* SECTION 2: PROCUREMENT EMAILS */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#4C3AE3]" />
              <span>2. Procurement Emails</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="PO Email (Purchase Orders)"
                type="email"
                required={!isEdit}
                value={poEmail}
                onChange={(e) => setPoEmail(e.target.value)}
                placeholder="e.g. orders@apexhardware.com.au"
                helperText="All purchase orders from LogiQ-On are emailed here."
              />
              <Input
                label="AP Email (Accounts Payable)"
                type="email"
                value={apEmail}
                onChange={(e) => setApEmail(e.target.value)}
                placeholder="e.g. accounts@apexhardware.com.au"
                helperText="The address the supplier invoices from — used for 3-way matching."
              />
            </div>
          </div>

          {/* SECTION 3: BANK DETAILS FOR PAYMENT */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#4C3AE3]" />
              <span>3. Bank Details for Payment</span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-1">
              Optional. Fill this in only if LogiQ-On should pay this supplier automatically by bank
              transfer once an order is confirmed received. Leave blank to pay them manually instead.
            </p>
            <Input label="Supplier's Bank BSB" value={bankBsb} onChange={(e) => setBankBsb(e.target.value)} placeholder="e.g. 063-000" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Supplier's Account Number" value={bankAccNum} onChange={(e) => setBankAccNum(e.target.value)} placeholder="e.g. 12345678" />
              <Input label="Supplier's Account Name" value={bankAccName} onChange={(e) => setBankAccName(e.target.value)} placeholder="e.g. Apex Hardware Pty Ltd" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
              {isEdit ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ─── Supplier card ────────────────────────────────────────────────────────────

function SupplierCard({ supplier, onEdit }: { supplier: Supplier; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const hasBanking = supplier.bankBsb || supplier.bankAccountNumber;
  const initials = (supplier.companyName || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="bg-white rounded-2xl border flex flex-col" style={{ borderColor: '#e2e8f0' }}>
      {/* Card header */}
      <div className="p-5 flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
          style={{ background: '#EEF0FE', color: '#4C3AE3' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-snug" style={{ color: '#0f172a' }}>{supplier.companyName}</p>
          {supplier.user?.fullName && !supplier.user.fullName.includes('(Supplier Contact)') && (
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{supplier.user.fullName}</p>
          )}
          {!supplier.abnAcn?.startsWith('PENDING-') && (
            <p className="text-[11px] font-mono mt-1" style={{ color: '#94a3b8' }}>ABN/ACN: {supplier.abnAcn}</p>
          )}
        </div>
        <button
          onClick={onEdit}
          className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title="Edit supplier"
        >
          <Edit2 className="w-3.5 h-3.5" style={{ color: '#64748b' }} />
        </button>
      </div>

      {/* Main info */}
      <div className="px-5 pb-4 space-y-3 border-t pt-4" style={{ borderColor: '#f8fafc' }}>
        {/* PO Email */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>PO Email</p>
          {supplier.poEmail ? (
            <a href={`mailto:${supplier.poEmail}`} className="text-xs font-semibold hover:underline flex items-center gap-1" style={{ color: '#4C3AE3' }}>
              <Mail className="w-3 h-3" />
              {supplier.poEmail}
            </a>
          ) : (
            <MissingTag label="PO email not set" />
          )}
        </div>

        {/* AP Email */}
        {supplier.apEmail && supplier.apEmail !== supplier.poEmail && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>AP Email</p>
            <a href={`mailto:${supplier.apEmail}`} className="text-xs font-semibold hover:underline flex items-center gap-1" style={{ color: '#475569' }}>
              <Mail className="w-3 h-3" />
              {supplier.apEmail}
            </a>
          </div>
        )}

        {/* Address */}
        {supplier.businessRegisteredAddress && (
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" style={{ color: '#94a3b8' }} />
            <p className="text-xs leading-snug" style={{ color: '#64748b' }}>{supplier.businessRegisteredAddress}</p>
          </div>
        )}

        {/* Payment terms */}
        {supplier.paymentTerms && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Terms</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#EEF0FE', color: '#4C3AE3', border: '1px solid #D9D4FB' }}>
              {supplier.paymentTerms}
            </span>
            <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{supplier.currency || 'AUD'}</span>
          </div>
        )}
      </div>

      {/* Expandable: bank details for paying this supplier */}
      {hasBanking && (
        <div className="border-t" style={{ borderColor: '#f1f5f9' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold hover:bg-slate-50 transition-colors"
            style={{ color: '#64748b' }}
          >
            <span>Bank Details for Payment</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expanded && (
            <div className="px-5 pb-4 space-y-3">
              {supplier.bankBsb && <Field label="BSB" value={supplier.bankBsb} mono />}
              {supplier.bankAccountNumber && <Field label="Account Number" value={supplier.bankAccountNumber} mono />}
              {supplier.bankAccountName && <Field label="Account Name" value={supplier.bankAccountName} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VendorMasterDataPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vendors');
      const data = res.ok ? await res.json() : {};
      const list: Supplier[] = Array.isArray(data) ? data : Array.isArray(data.vendors) ? data.vendors : [];
      setSuppliers(list.filter((v) => v.status === 'APPROVED'));
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.companyName?.toLowerCase().includes(q) ||
      s.abnAcn?.toLowerCase().includes(q) ||
      s.poEmail?.toLowerCase().includes(q) ||
      s.user?.email?.toLowerCase().includes(q) ||
      s.user?.fullName?.toLowerCase().includes(q)
    );
  });

  const handleSave = (updated: Supplier) => {
    if (editTarget) {
      setSuppliers((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } else {
      setSuppliers((prev) => [updated, ...prev]);
    }
    setShowForm(false);
    setEditTarget(null);
  };

  const openEdit = (s: Supplier) => {
    setEditTarget(s);
    setShowForm(true);
  };

  const openAdd = () => {
    setEditTarget(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-5 h-5" style={{ color: '#4C3AE3' }} />
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Supplier Master Data</h1>
          </div>
          <p className="text-sm" style={{ color: '#64748b' }}>
            {loading ? 'Loading…' : `${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''} — manage contacts, PO emails and payment details.`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={load} className="p-2 rounded-xl border hover:bg-slate-50 transition-colors" style={{ borderColor: '#e2e8f0' }}>
            <RefreshCw className="w-4 h-4" style={{ color: '#64748b' }} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all hover:opacity-90"
            style={{ background: '#4C3AE3', color: '#fff' }}
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: '#e2e8f0' }}>
        <Search className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ABN, contact or email…"
          className="flex-1 text-sm outline-none bg-transparent placeholder-slate-400"
          style={{ color: '#0f172a' }}
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Clear</button>
        )}
      </div>

      {/* Supplier grid */}
      {loading ? (
        <div className="text-center py-20 text-sm" style={{ color: '#94a3b8' }}>Loading suppliers…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: '#e2e8f0' }}>
          <Truck className="w-8 h-8 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>
            {search ? 'No suppliers match your search.' : 'No suppliers yet.'}
          </p>
          {!search && (
            <button
              onClick={openAdd}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl"
              style={{ background: '#4C3AE3', color: '#fff' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add your first supplier
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <SupplierCard key={s.id} supplier={s} onEdit={() => openEdit(s)} />
          ))}
        </div>
      )}

      {/* Slide-over form */}
      {showForm && (
        <SupplierForm
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
