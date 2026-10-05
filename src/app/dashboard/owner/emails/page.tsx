'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Mail, Inbox, ExternalLink } from 'lucide-react';

interface EmailSummary {
  id: string;
  to: string;
  cc?: string;
  subject: string;
  sentAt: string;
  mode: 'smtp' | 'simulated' | 'received';
  orderId?: string;
}

interface EmailDetail extends EmailSummary {
  html: string;
}

const MODE_BADGE = {
  smtp: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  simulated: 'bg-amber-100 text-amber-700 border-amber-200',
  received: 'bg-blue-100 text-blue-700 border-blue-200',
};

const MODE_LABEL = {
  smtp: 'SENT',
  simulated: 'DEMO',
  received: 'RECEIVED',
};

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/emails');
    if (res.ok) setEmails(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  const selectEmail = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    const res = await fetch(`/api/admin/emails/${id}`);
    if (res.ok) setDetail(await res.json());
    setLoadingDetail(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Inbox className="w-6 h-6" style={{ color: '#1e3a8a' }} />
            Email Inbox
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Every transactional email the platform sends — preview them exactly as customers receive them
          </p>
        </div>
        <button
          onClick={fetchEmails}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex gap-0 rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        {/* Left: Email list */}
        <div className="w-80 shrink-0 border-r border-slate-200 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <Mail className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No emails yet</p>
              <p className="text-xs text-slate-400 mt-1">Emails appear here as orders move through the pipeline</p>
            </div>
          ) : (
            <div>
              {emails.map((email) => {
                const isSelected = selectedId === email.id;
                return (
                  <button
                    key={email.id}
                    onClick={() => selectEmail(email.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 transition hover:bg-slate-50 ${
                      isSelected ? 'bg-[#eff6ff] border-l-2 border-l-[#1e3a8a]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${MODE_BADGE[email.mode]}`}>
                        {MODE_LABEL[email.mode]}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">{formatTime(email.sentAt)}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 truncate">
                      {email.mode === 'received' ? 'From supplier' : `To: ${email.to}`}
                    </p>
                    <p className={`text-sm font-semibold mt-0.5 truncate ${isSelected ? 'text-[#1e3a8a]' : 'text-slate-800'}`}>
                      {email.subject}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Email preview */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <Mail className="w-14 h-14 text-slate-200 mb-4" />
              <p className="text-base font-semibold text-slate-400">Select an email to preview</p>
              <p className="text-sm text-slate-300 mt-1">Click any email in the list to see the full rendered version</p>
            </div>
          ) : loadingDetail ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading email…</div>
          ) : detail ? (
            <div className="flex flex-col h-full">
              {/* Email meta bar */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 truncate">{detail.subject}</h2>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                      <span><strong className="text-slate-700">{detail.mode === 'received' ? 'From:' : 'To:'}</strong> {detail.to}</span>
                      {detail.cc && <span><strong className="text-slate-700">Cc:</strong> {detail.cc}</span>}
                      <span><strong className="text-slate-700">{detail.mode === 'received' ? 'Received:' : 'Sent:'}</strong> {new Date(detail.sentAt).toLocaleString('en-AU')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${MODE_BADGE[detail.mode]}`}>
                      {detail.mode === 'smtp' ? 'SENT via SMTP' : detail.mode === 'received' ? 'RECEIVED (simulated)' : 'DEMO (simulated)'}
                    </span>
                    {detail.orderId && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                        Order linked
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* iframe render */}
              <div className="flex-1 overflow-hidden">
                <iframe
                  srcDoc={detail.html}
                  className="w-full h-full border-0 bg-white"
                  title={detail.subject}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400 text-center">
        Emails marked <strong>DEMO</strong> were captured while SMTP is not configured — the customer did not receive them.
        Emails marked <strong>SENT</strong> went through your real mail server.
        Emails marked <strong>RECEIVED</strong> are simulated incoming mail (e.g. a supplier invoice) — in production these arrive via the real IMAP inbox instead.
      </p>
    </div>
  );
}
