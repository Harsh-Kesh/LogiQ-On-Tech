'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, MessageSquare, Send, CheckCircle2, RotateCcw, ExternalLink, PlugZap, Inbox, FileText, Mail } from 'lucide-react';

interface Inquiry {
  id: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  preview: string;
  receivedAt: string;
  unread: boolean;
  handled: boolean;
  messageCount: number;
}

interface Thread {
  subject: string;
  customerName: string;
  customerEmail: string;
  handled: boolean;
  order: { id: string; orderNumber: string } | null;
  messages: { id: string; fromName: string; fromEmail: string; outbound: boolean; sentAt: string; body: string }[];
}

type Filter = 'open' | 'handled' | 'all';
type Tab = 'customers' | 'suppliers';

function formatTime(iso: string) {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// Inbox: everything RECEIVED. Customers = orders@ mailbox (new enquiries + replies to our
// automatic emails, answered from here). Supplier invoices = invoice emails the poller read.
// Outgoing automatic emails live on the separate Sent Emails page (/dashboard/owner/emails).
export default function InboxPage() {
  const [tab, setTab] = useState<Tab>('customers');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [filter, setFilter] = useState<Filter>('open');
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inquiries');
      const data = await res.json().catch(() => ({}));
      if (res.status === 503 && data.configured === false) setNotConfigured(true);
      else if (!res.ok) setError(data.error || 'Could not load inquiries');
      else setInquiries(data.inquiries);
    } catch {
      setError('Could not load inquiries');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = async (inq: Inquiry) => {
    setSelected(inq);
    setThread(null);
    setReply('');
    setLoadingThread(true);
    const res = await fetch(`/api/inquiries?id=${encodeURIComponent(inq.id)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setThread(data);
      setInquiries((list) => list.map((i) => (i.id === inq.id ? { ...i, unread: false } : i)));
    } else {
      setError(data.error || 'Could not open conversation');
    }
    setLoadingThread(false);
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reply', id: selected.id, text: reply }),
    });
    setSending(false);
    if (res.ok) {
      setReply('');
      await open(selected); // reload thread so the sent reply shows
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Reply failed: ${data.error || res.statusText}`);
    }
  };

  const toggleHandled = async () => {
    if (!selected || !thread) return;
    const handled = !thread.handled;
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'handled', id: selected.id, handled }),
    });
    if (res.ok) {
      setThread({ ...thread, handled });
      setInquiries((list) => list.map((i) => (i.id === selected.id ? { ...i, handled } : i)));
    }
  };

  const visible = inquiries.filter((i) => (filter === 'all' ? true : filter === 'handled' ? i.handled : !i.handled));
  const openCount = inquiries.filter((i) => !i.handled).length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Inbox className="w-6 h-6" style={{ color: '#4C3AE3' }} />
            Inbox
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Emails received — customer enquiries and replies (answer them here, sent from the orders mailbox in the same thread), and supplier invoices.
          </p>
        </div>
        {tab === 'customers' && !notConfigured && (
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-3">
        {([
          { key: 'customers', label: `Customers${openCount > 0 ? ` (${openCount} open)` : ''}`, icon: MessageSquare },
          { key: 'suppliers', label: 'Supplier invoices', icon: FileText },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
              tab === t.key ? 'bg-[#4C3AE3] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {error && tab === 'customers' && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {tab === 'suppliers' ? (
        <SupplierInvoices />
      ) : notConfigured ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <PlugZap className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Orders mailbox not connected</h2>
          <p className="text-sm text-slate-500 mt-2">
            Add MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET and MS_SENDER_MAILBOX to the environment variables,
            then redeploy. Customer emails and replies sent to that mailbox will show here.
          </p>
        </div>
      ) : (
      <div className="flex rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        {/* Left: conversation list */}
        <div className="w-80 shrink-0 border-r border-slate-200 flex flex-col">
          <div className="flex gap-1 p-2 border-b border-slate-100">
            {(['open', 'handled', 'all'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold capitalize transition ${
                  filter === f ? 'bg-[#EEF0FE] text-[#4C3AE3]' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f}{f === 'open' && openCount > 0 ? ` (${openCount})` : ''}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-500">No {filter === 'all' ? '' : filter} inquiries</p>
              </div>
            ) : (
              visible.map((inq) => {
                const isSelected = selected?.id === inq.id;
                return (
                  <button
                    key={inq.id}
                    onClick={() => open(inq)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 transition hover:bg-slate-50 ${
                      isSelected ? 'bg-[#EEF0FE] border-l-2 border-l-[#4C3AE3]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm truncate ${inq.unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'}`}>
                        {inq.customerName}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">{formatTime(inq.receivedAt)}</span>
                    </div>
                    <p className={`text-sm truncate ${inq.unread ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                      {inq.subject}{inq.messageCount > 1 ? ` (${inq.messageCount})` : ''}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{inq.preview}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: thread + reply */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <MessageSquare className="w-14 h-14 text-slate-200 mb-4" />
              <p className="text-base font-semibold text-slate-400">Select a conversation</p>
            </div>
          ) : loadingThread || !thread ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading conversation…</div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-bold text-slate-900 truncate">{thread.subject}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {thread.customerName} · {thread.customerEmail}
                    {thread.order && (
                      <>
                        {' · '}
                        <Link href={`/dashboard/owner/shop-orders/${thread.order.id}`} className="inline-flex items-center gap-1 font-semibold text-[#4C3AE3] hover:underline">
                          Order {thread.order.orderNumber} <ExternalLink className="w-3 h-3" />
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={toggleHandled}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    thread.handled ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {thread.handled ? <><RotateCcw className="w-3.5 h-3.5" /> Reopen</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Mark handled</>}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-white">
                {thread.messages.map((m) => (
                  <div key={m.id} className={`max-w-[85%] rounded-xl border px-4 py-3 ${m.outbound ? 'ml-auto bg-[#EEF0FE] border-[#D9D4FB]' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="text-xs font-semibold text-slate-700">{m.outbound ? 'You' : m.fromName}</span>
                      <span className="text-[11px] text-slate-400">{new Date(m.sentAt).toLocaleString('en-AU')}</span>
                    </div>
                    {/* Plain text only — never render customer HTML in the dashboard. */}
                    <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 p-4 shrink-0 bg-slate-50">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder={`Reply to ${thread.customerName}…`}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#4C3AE3] focus:outline-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4C3AE3] hover:bg-[#3d2fc4] text-white text-sm font-semibold transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

interface ReceivedEmail { id: string; to: string; subject: string; sentAt: string; orderId?: string | null }

// Supplier invoice emails the invoice poller read (EmailLog mode 'received'; `to` holds the sender).
function SupplierInvoices() {
  const [emails, setEmails] = useState<ReceivedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReceivedEmail | null>(null);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/emails?direction=received')
      .then((r) => (r.ok ? r.json() : []))
      .then(setEmails)
      .finally(() => setLoading(false));
  }, []);

  const open = async (e: ReceivedEmail) => {
    setSelected(e);
    setHtml(null);
    const res = await fetch(`/api/admin/emails/${e.id}`);
    if (res.ok) setHtml((await res.json()).html);
  };

  return (
    <div className="flex rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white" style={{ height: 'calc(100vh - 260px)', minHeight: '460px' }}>
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
  );
}
