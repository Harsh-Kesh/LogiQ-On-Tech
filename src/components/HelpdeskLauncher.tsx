'use client';

// FR-HLP-001..008 — MyHitch Helpdesk launcher.
// Owner-only: the Platform Owner is MyHitch's actual client contact for this app —
// vendors report issues to the Owner, not directly to MyHitch, so this stays out of
// their nav entirely rather than being hidden-but-technically-reachable.
//  - calls /api/helpdesk/launch to audit the attempt (FR-HLP-007)
//  - opens the approved MyHitch URL in a new tab (FR-HLP-003/004)
//  - falls back to /dashboard/helpdesk on failure (FR-HLP-008)

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';

// The source file (public/myhitch-logo.jpeg) is the full lockup — icon + wordmark +
// tagline on a white square. For a small nav badge we only want the icon glyph, so
// it's scaled up and shifted inside an overflow-hidden circle to crop it in place
// (no separate cropped asset to keep in sync with the original file).
function MyHitchIcon({ className = '' }: { className?: string }) {
  return (
    <span className={`relative overflow-hidden rounded-full bg-white shrink-0 ${className}`}>
      <img
        src="/myhitch-logo.jpeg"
        alt=""
        aria-hidden="true"
        className="absolute max-w-none"
        style={{ width: '429%', left: '-157%', top: '-122%' }}
      />
    </span>
  );
}

interface Props {
  compact?: boolean;
}

export default function HelpdeskLauncher({ compact = false }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  if (!user || user.role !== 'PLATFORM_OWNER') return null;

  const openHelpdesk = async () => {
    try {
      const res = await fetch('/api/helpdesk/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: typeof window !== 'undefined' ? window.location.pathname : 'unknown' }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        router.push('/dashboard/helpdesk?error=' + encodeURIComponent(data?.error || 'unavailable'));
        return;
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      router.push('/dashboard/helpdesk?error=network');
    }
  };

  if (compact) {
    return (
      <button
        onClick={openHelpdesk}
        title="Report a software issue to MyHitch Support (opens in a new tab)"
        aria-label="Open MyHitch Helpdesk"
        className="p-1.5 rounded-xl bg-white hover:bg-sky-50 border border-sky-300 transition-all cursor-pointer"
      >
        <MyHitchIcon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={openHelpdesk}
      title="Report a software issue to MyHitch Support (opens in a new tab)"
      aria-label="Open MyHitch Helpdesk"
      className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 border border-sky-300 hover:border-sky-400 shadow-sm transition-all cursor-pointer shrink-0"
    >
      <MyHitchIcon className="w-6 h-6" />
      <span className="text-xs font-bold whitespace-nowrap leading-none text-slate-700">
        <span className="text-sky-600 font-black">MY</span><span className="text-slate-900 font-black">Hitch</span> Helpdesk
      </span>
      <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
    </button>
  );
}
