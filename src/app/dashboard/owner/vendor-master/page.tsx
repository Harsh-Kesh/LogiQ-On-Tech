'use client';

import { useEffect, useState } from 'react';
import { Truck, Search, RefreshCw, Mail, MapPin, Phone, ExternalLink } from 'lucide-react';

interface Supplier {
  id: string;
  companyName: string;
  abnAcn: string;
  status: string;
  businessRegisteredAddress?: string;
  businessLocation?: string;
  paymentTerms?: string;
  poEmail?: string;
  apEmail?: string;
  phone?: string;
  user?: { email: string; fullName?: string };
}

export default function VendorMasterDataPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
      s.user?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-5 h-5" style={{ color: '#1e3a8a' }} />
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Supplier Directory</h1>
          </div>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Approved suppliers and their contact details.
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: '#e2e8f0' }}>
        <Search className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers by name, ABN or email..."
          className="flex-1 text-sm outline-none bg-transparent placeholder-slate-400"
          style={{ color: '#0f172a' }}
        />
        <button onClick={load} className="p-1.5 rounded-lg transition-colors" style={{ color: '#64748b' }}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Supplier cards */}
      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>Loading suppliers…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border" style={{ borderColor: '#e2e8f0' }}>
          <Truck className="w-8 h-8 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
          <p className="text-sm font-semibold" style={{ color: '#475569' }}>
            {search ? 'No suppliers match your search.' : 'No approved suppliers yet.'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
            Suppliers are approved in the Vendor Directory section.
          </p>
          <a
            href="/dashboard/owner/vendors"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold px-4 py-2 rounded-xl border transition-all"
            style={{ color: '#1e3a8a', borderColor: '#bfdbfe', background: '#eff6ff' }}
          >
            Go to Vendor Directory <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border p-5 space-y-4 hover:shadow-sm transition-all" style={{ borderColor: '#e2e8f0' }}>
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-black" style={{ background: '#eff6ff', color: '#1e3a8a' }}>
                  {s.companyName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-snug truncate" style={{ color: '#0f172a' }}>{s.companyName}</p>
                  {s.abnAcn && (
                    <p className="text-xs font-mono mt-0.5" style={{ color: '#64748b' }}>ABN/ACN: {s.abnAcn}</p>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                  APPROVED
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2">
                {(s.poEmail || s.user?.email) && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
                    <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: '#94a3b8' }} />
                    <a href={`mailto:${s.poEmail || s.user?.email}`} className="hover:underline truncate" style={{ color: '#1e3a8a' }}>
                      {s.poEmail || s.user?.email}
                    </a>
                  </div>
                )}
                {s.apEmail && s.apEmail !== s.poEmail && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
                    <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: '#94a3b8' }} />
                    <a href={`mailto:${s.apEmail}`} className="hover:underline truncate" style={{ color: '#1e3a8a' }}>
                      {s.apEmail} <span className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>(AP)</span>
                    </a>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
                    <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: '#94a3b8' }} />
                    <span>{s.phone}</span>
                  </div>
                )}
                {(s.businessLocation || s.businessRegisteredAddress) && (
                  <div className="flex items-start gap-2 text-xs" style={{ color: '#475569' }}>
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#94a3b8' }} />
                    <span className="leading-snug">{s.businessLocation || s.businessRegisteredAddress}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              {s.paymentTerms && (
                <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: '#f1f5f9' }}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Payment Terms</span>
                  <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>{s.paymentTerms}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
          Showing {filtered.length} approved supplier{filtered.length !== 1 ? 's' : ''}.{' '}
          <a href="/dashboard/owner/vendors" className="font-semibold hover:underline" style={{ color: '#1e3a8a' }}>
            Manage all vendors →
          </a>
        </p>
      )}
    </div>
  );
}
