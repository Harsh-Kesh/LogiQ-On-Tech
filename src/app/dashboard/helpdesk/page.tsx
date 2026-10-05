'use client';

// FR-HLP-008 — fallback UI when MyHitch Helpdesk hand-off fails or is unavailable.
// Shows a safe message and approved alternative support methods.

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LifeBuoy, AlertTriangle, Mail, Phone, ArrowLeft } from 'lucide-react';

export default function HelpdeskFallbackPage() {
  const params = useSearchParams();
  const errorType = params.get('error') || 'unavailable';

  const explain: Record<string, string> = {
    network: 'A network error prevented the MyHitch Helpdesk hand-off. Please try again in a moment.',
    unavailable: 'MyHitch Helpdesk is currently unavailable. Please use one of the alternative channels below.',
    url_not_configured: 'MyHitch Helpdesk has not been configured for this environment yet. Contact your administrator.',
    role_not_permitted: 'Your role does not currently include MyHitch Helpdesk access.',
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold hover:opacity-80" style={{ color: '#64748b' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </Link>

      <div className="bg-white rounded-2xl border p-6 space-y-5" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fefce8', border: '1px solid #fde68a', color: '#854d0e' }}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: '#0f172a' }}>MyHitch Helpdesk hand-off failed</h1>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>{explain[errorType] || explain.unavailable}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl space-y-3 text-xs border" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <LifeBuoy className="w-4 h-4" style={{ color: '#4C3AE3' }} /> Alternative support channels
          </h2>
          <div className="flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Mail className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
            <a href="mailto:support@logiqon.com.au" className="font-bold hover:underline" style={{ color: '#4C3AE3' }}>
              support@logiqon.com.au
            </a>
          </div>
          <div className="flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Phone className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
            <span className="font-mono">+61 3 9000 0000</span>
          </div>
          <p className="text-[11px] mt-2" style={{ color: '#94a3b8' }}>
            Please include your organisation identifier <span className="font-mono font-bold" style={{ color: '#64748b' }}>logiqon-tech</span> and the source screen when contacting support.
          </p>
        </div>
      </div>
    </div>
  );
}
