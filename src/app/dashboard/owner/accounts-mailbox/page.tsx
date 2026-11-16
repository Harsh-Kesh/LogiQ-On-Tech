'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ExternalLink, FileText, Mail, Receipt } from 'lucide-react';

interface ReceivedEmail { id: string; to: string; subject: string; sentAt: string; orderId?: string | null }

function formatTime(iso: string) {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// Accounts mailbox (MS_INVOICE_MAILBOX, e.g. accounts@): supplier invoices only. Each entry is an
// invoice email the poller read (EmailLog mode 'received'; `to` holds the sender), with what was
// extracted and the order it was linked to. Customer email lives on the Orders Mailbox page.
export default function AccountsMailboxPage() {
  const [emails, setEmails] = useState<ReceivedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReceivedEmail | null>(null);
  const [html, setHtml] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/emails?direction=received');
    if (res.ok) setEmails(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = async (e: ReceivedEmail) => {
    setSelected(e);
    setHtml(null);
    const res = await fetch(`/api/admin/emails/${e.id}`);
    if (res.ok) setHtml((await res.json()).html);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Receipt className="w-6 h-6" style={{ color: '#4C3AE3' }} />
            Accounts Mailbox
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Supplier invoices received. Each one shows what the app read from it (invoice, PO, total, tracking) and the order it was linked to.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        <div className="w-80 shrink-0 border-r border-slate-200 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <Mail className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No supplier invoices received yet</p>
            </div>
          ) : (
            emails.map((e) => (
              <button
                key={e.id}
                onClick={() => open(e)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 transition hover:bg-slate-50 ${
                  selected?.id === e.id ? 'bg-[#EEF0FE] border-l-2 border-l-[#4C3AE3]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500 truncate">{e.to}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">{formatTime(e.sentAt)}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">{e.subject}</p>
                {!e.orderId && <p className="text-[11px] font-semibold text-red-600 mt-0.5">Not linked to an order</p>}
              </button>
            ))
          )}
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <FileText className="w-14 h-14 text-slate-200 mb-4" />
              <p className="text-base font-semibold text-slate-400">Select an invoice email</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h2 className="font-bold text-slate-900 truncate">{selected.subject}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  From {selected.to} · {new Date(selected.sentAt).toLocaleString('en-AU')}
                  {selected.orderId && (
                    <>
                      {' · '}
                      <Link href={`/dashboard/owner/shop-orders/${selected.orderId}`} className="inline-flex items-center gap-1 font-semibold text-[#4C3AE3] hover:underline">
                        View order <ExternalLink className="w-3 h-3" />
                      </Link>
                    </>
                  )}
                </p>
              </div>
              {html === null ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading…</div>
              ) : (
                <iframe srcDoc={html} sandbox="" className="flex-1 w-full border-0 bg-white" title={selected.subject} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
