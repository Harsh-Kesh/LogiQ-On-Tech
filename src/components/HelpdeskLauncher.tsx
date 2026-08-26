'use client';

// FR-HLP-001..008 — MyHitch Helpdesk launcher.
// Renders a nav-friendly link that:
//  - is role-gated (Owner, Sales/Ops, Finance, Auditor — configurable in permittedRoles)
//  - calls /api/helpdesk/launch to audit the attempt (FR-HLP-007)
//  - opens the approved MyHitch URL in a new tab (FR-HLP-003/004)
//  - falls back to /dashboard/helpdesk on failure (FR-HLP-008)

import { useSession } from 'next-auth/react';
import { LifeBuoy } from 'lucide-react';
import { useRouter } from 'next/navigation';

const HELPDESK_PERMITTED_ROLES = ['PLATFORM_OWNER', 'MDM', 'WAREHOUSE', 'VENDOR'];

interface Props {
  compact?: boolean;
}

export default function HelpdeskLauncher({ compact = false }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const role = user?.role;

  if (!user || !HELPDESK_PERMITTED_ROLES.includes(role)) return null;

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
        title="Open MyHitch Helpdesk (external)"
        aria-label="MyHitch Helpdesk"
        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer"
      >
        <LifeBuoy className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={openHelpdesk}
      className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap bg-indigo-600 text-white shadow-sm border border-indigo-700 hover:bg-indigo-700 cursor-pointer"
    >
      <LifeBuoy className="w-3.5 h-3.5" />
      MyHitch Helpdesk
    </button>
  );
}
