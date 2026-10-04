'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function MainDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') return;
    const role = (session?.user as any)?.role;
    router.replace(role === 'PLATFORM_OWNER' ? '/dashboard/owner' : '/dashboard/vendor');
  }, [status, session, router]);

  return (
    <div className="py-12 text-center text-xs font-mono text-slate-500 flex items-center justify-center gap-2">
      <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      <span>Loading your dashboard…</span>
    </div>
  );
}
