'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { Search, Package, ShoppingCart, FileText } from 'lucide-react';

interface TraceResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
}

interface Results {
  warranties: TraceResult[];
  orders: TraceResult[];
  supplierInvoices: TraceResult[];
}

const TYPE_ICON: Record<string, any> = {
  WARRANTY: Package,
  STOREFRONT_ORDER: ShoppingCart,
  SUPPLIER_INVOICE: FileText,
};

const TYPE_COLOR: Record<string, string> = {
  WARRANTY: 'bg-green-100 text-green-700',
  STOREFRONT_ORDER: 'bg-blue-100 text-blue-700',
  SUPPLIER_INVOICE: 'bg-violet-100 text-violet-700',
};

const TYPE_LABEL: Record<string, string> = {
  WARRANTY: 'Warranty',
  STOREFRONT_ORDER: 'Order',
  SUPPLIER_INVOICE: 'Supplier Invoice',
};

export default function TraceabilityPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    const res = await fetch(`/api/admin/traceability?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.results);
    }
    setLoading(false);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    search(val);
  };

  const allResults: TraceResult[] = results
    ? [...(results.warranties || []), ...(results.orders || []), ...(results.supplierInvoices || [])]
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Global Traceability</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Search across warranties, orders, supplier invoices, PO numbers, serials, and more
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder="Search by order number, part number, serial, customer, PO, invoice…"
          className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm shadow-sm"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        )}
      </div>

      {results && allResults.length === 0 && (
        <div className="text-center py-16 text-slate-400">No results found for "{query}"</div>
      )}

      {allResults.length > 0 && (
        <div className="space-y-2">
          {allResults.map((item) => {
            const Icon = TYPE_ICON[item.type] || Search;
            const color = TYPE_COLOR[item.type] || 'bg-slate-100 text-slate-600';
            const label = TYPE_LABEL[item.type] || item.type;
            return (
              <a
                key={item.id}
                href={item.href}
                className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className={`p-2 rounded-lg shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{item.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>{label}</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-0.5">{item.subtitle}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.meta}</div>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {!results && !loading && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Start typing to search across the entire supply chain</p>
        </div>
      )}
    </div>
  );
}
