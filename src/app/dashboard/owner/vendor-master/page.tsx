'use client';

import { useEffect, useState } from 'react';
import {
  Truck, Search, RefreshCw, Plus, X, Mail, MapPin, CreditCard,
  Building2, Save, Edit2, ChevronDown, ChevronUp,
} from 'lucide-react';

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

const PAYMENT_TERMS = ['Net 30', 'Net 60', 'EOM', 'Prepaid', 'COD', '7 Days', '14 Days'];

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
  const [contactName, setContactName] = useState(initial?.user?.fullName ?? '');
  const [loginEmail, setLoginEmail] = useState(initial?.user?.email ?? '');
  const [poEmail, setPoEmail] = useState(initial?.poEmail ?? '');
  const [apEmail, setApEmail] = useState(initial?.apEmail ?? '');
  const [address, setAddress] = useState(initial?.businessRegisteredAddress ?? '');
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'AUD');
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
            paymentTerms: paymentTerms.trim() || null,
            currency: currency.trim() || 'AUD',
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
          paymentTerms: paymentTerms.trim() || undefined,
          currency: currency.trim() || 'AUD',
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
            abnAcn: abnAcn.trim(),
            contactName: contactName.trim(),
            loginEmail: loginEmail.trim(),
            poEmail: poEmail.trim(),
            apEmail: apEmail.trim() || null,
            businessRegisteredAddress: address.trim() || null,
            paymentTerms: paymentTerms.trim() || null,
            currency: currency.trim() || 'AUD',
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
          abnAcn: abnAcn.trim(),
          status: 'APPROVED',
          businessRegisteredAddress: address.trim() || undefined,
          paymentTerms: paymentTerms.trim() || undefined,
          currency: currency.trim() || 'AUD',
          poEmail: poEmail.trim() || undefined,
          apEmail: apEmail.trim() || undefined,
          bankBsb: bankBsb.trim() || undefined,
          bankAccountNumber: bankAccNum.trim() || undefined,
          bankAccountName: bankAccName.trim() || undefined,
          user: { email: loginEmail.trim(), fullName: contactName.trim() },
        });
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSaving(false);
  };

  return (
    /* Slide-over overlay */
    <div className="fixed inset-0 z-50 flex" style={{ background: 'rgba(15,23,42,0.4)' }} onClick={onClose}>
      <div className="ml-auto w-full max-w-lg h-full bg-white flex flex-col shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#e2e8f0' }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>
              {isEdit ? 'Edit Supplier' : 'New Supplier'}
            </p>
            <h2 className="text-base font-extrabold" style={{ color: '#0f172a' }}>
              {isEdit ? initial!.companyName : 'Add a supplier to your directory'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-slate-100">
            <X className="w-5 h-5" style={{ color: '#94a3b8' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-6">
          {/* SECTION 1 — Identity */}
          <section className="space-y-4">
            <SectionLabel icon={<Building2 className="w-3.5 h-3.5" />}>Company Identity</SectionLabel>
            <FI label="Business / Company Name" required value={companyName} onChange={setCompanyName} placeholder="e.g. Apex Hardware Pty Ltd" disabled={isEdit} />
            <FI label="ABN or ACN" required value={abnAcn} onChange={setAbnAcn} placeholder="11 digit ABN or 9 digit ACN" mono disabled={isEdit} />
            <FI label="Registered Business Address" value={address} onChange={setAddress} placeholder="e.g. 12 Trade St, Melbourne VIC 3000" />
          </section>

          {/* SECTION 2 — Contact & Login (new only) */}
          {!isEdit && (
            <section className="space-y-4">
              <SectionLabel icon={<Mail className="w-3.5 h-3.5" />}>Contact Person & Platform Access</SectionLabel>
              <FI label="Contact Person Full Name" required value={contactName} onChange={setContactName} placeholder="e.g. James Wilson" />
              <div>
                <FI label="Login Email" type="email" required value={loginEmail} onChange={setLoginEmail} placeholder="e.g. james@apexhardware.com.au" />
                <p className="text-[11px] mt-1.5 leading-snug" style={{ color: '#94a3b8' }}>
                  A platform account is created with a temporary password <span className="font-mono font-bold">Password123!</span> — share this with the supplier to log in and update their details.
                </p>
              </div>
            </section>
          )}

          {/* SECTION 3 — Procurement emails */}
          <section className="space-y-4">
            <SectionLabel icon={<Mail className="w-3.5 h-3.5" />}>Procurement Emails</SectionLabel>
            <div>
              <FI label="PO Email (Purchase Orders)" type="email" required={!isEdit} value={poEmail} onChange={setPoEmail} placeholder="e.g. orders@apexhardware.com.au" />
              <p className="text-[11px] mt-1.5 leading-snug" style={{ color: '#94a3b8' }}>
                All purchase orders from LogiQ-On will be emailed to this address.
              </p>
            </div>
            <div>
              <FI label="AP Email (Accounts Payable)" type="email" value={apEmail} onChange={setApEmail} placeholder="e.g. accounts@apexhardware.com.au" />
              <p className="text-[11px] mt-1.5 leading-snug" style={{ color: '#94a3b8' }}>
                The email address the supplier sends their invoices from — used for three-way matching.
              </p>
            </div>
          </section>

          {/* SECTION 4 — How we pay this supplier */}
          <section className="space-y-4">
            <SectionLabel icon={<CreditCard className="w-3.5 h-3.5" />}>How We Pay This Supplier</SectionLabel>
            <p className="text-[11px] -mt-2 leading-snug" style={{ color: '#94a3b8' }}>
              Optional. Fill this in if you want LogiQ-On to pay this supplier automatically by bank
              transfer once an order is confirmed received. Leave blank to pay them manually instead.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Agreed Payment Terms</p>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border text-sm focus:outline-none"
                  style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
                >
                  <option value="">— Select —</option>
                  {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Currency</p>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border text-sm focus:outline-none"
                  style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
                >
                  {['AUD', 'USD', 'NZD', 'EUR', 'GBP', 'SGD'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <FI label="Supplier's Bank BSB" value={bankBsb} onChange={setBankBsb} placeholder="e.g. 063-000" mono />
            <div className="grid grid-cols-2 gap-3">
              <FI label="Supplier's Account Number" value={bankAccNum} onChange={setBankAccNum} placeholder="e.g. 12345678" mono />
              <FI label="Supplier's Account Name" value={bankAccName} onChange={setBankAccName} placeholder="e.g. Apex Hardware Pty Ltd" />
            </div>
          </section>

          {error && (
            <p className="text-xs font-semibold px-3 py-2 rounded-xl" style={{ background: '#fef2f2', color: '#991b1b' }}>{error}</p>
          )}
        </form>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: '#e2e8f0' }}>
          <button type="button" onClick={onClose} className="text-sm font-semibold px-4 py-2 rounded-xl border transition-all" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
            Cancel
          </button>
          <button
            onClick={(e) => { e.preventDefault(); handleSubmit(e as any); }}
            disabled={saving}
            className="text-sm font-bold px-5 py-2 rounded-xl flex items-center gap-2 transition-all"
            style={{ background: saving ? '#94a3b8' : '#1e3a8a', color: '#fff' }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supplier'}
          </button>
        </div>
      </div>
    </div>
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
          style={{ background: '#eff6ff', color: '#1e3a8a' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-snug" style={{ color: '#0f172a' }}>{supplier.companyName}</p>
          {supplier.user?.fullName && (
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{supplier.user.fullName}</p>
          )}
          <p className="text-[11px] font-mono mt-1" style={{ color: '#94a3b8' }}>ABN/ACN: {supplier.abnAcn}</p>
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
            <a href={`mailto:${supplier.poEmail}`} className="text-xs font-semibold hover:underline flex items-center gap-1" style={{ color: '#1e3a8a' }}>
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
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#eff6ff', color: '#1e3a8a', border: '1px solid #bfdbfe' }}>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b" style={{ borderColor: '#f1f5f9' }}>
      <span style={{ color: '#1e3a8a' }}>{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>{children}</span>
    </div>
  );
}

function FI({
  label, value, onChange, placeholder, type = 'text', required, mono, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; mono?: boolean; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none ${mono ? 'font-mono' : ''}`}
        style={{
          borderColor: '#e2e8f0',
          color: '#0f172a',
          background: disabled ? '#f8fafc' : '#fff',
        }}
      />
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
            <Truck className="w-5 h-5" style={{ color: '#1e3a8a' }} />
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Supplier Directory</h1>
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
            style={{ background: '#1e3a8a', color: '#fff' }}
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
              style={{ background: '#1e3a8a', color: '#fff' }}
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
