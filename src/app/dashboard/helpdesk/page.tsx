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
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </Link>

      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">MyHitch Helpdesk hand-off failed</h1>
            <p className="text-xs text-slate-500 mt-1">{explain[errorType] || explain.unavailable}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-indigo-600" /> Alternative support channels
          </h2>
          <div className="flex items-center gap-2 text-slate-700">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            <a href="mailto:support@logiqon.com.au" className="font-bold text-indigo-700 hover:underline">
              support@logiqon.com.au
            </a>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono">+61 3 9000 0000</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Please include your organisation identifier <span className="font-mono font-bold">logiqon-tech</span> and the source screen when contacting support.
          </p>
        </div>
      </div>
    </div>
  );
}
