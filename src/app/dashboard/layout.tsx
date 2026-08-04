'use client';

export const dynamic = 'force-dynamic';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shield, Building, Warehouse, ShoppingCart, Key, FileText, LogOut, Lock, Database } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const role = (session?.user as any)?.role || 'CUSTOMER';
  const mfaEnabled = (session?.user as any)?.mfaEnabled || false;
  const mfaVerified = (session?.user as any)?.mfaVerified || false;

  useEffect(() => {
    if (status === 'authenticated' && mfaEnabled && !mfaVerified) {
      router.push('/auth/mfa-verify');
    }
  }, [status, mfaEnabled, mfaVerified, router]);

  if (status === 'loading' || (status === 'authenticated' && mfaEnabled && !mfaVerified)) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <span className="text-xs font-mono text-slate-400">Verifying Session & MFA Checks...</span>
        </div>
      </div>
    );
  }

  const navLinks = [
    { name: 'Platform Owner', href: '/dashboard/owner', roleRequired: ['PLATFORM_OWNER', 'MDM'], icon: Shield },
    { name: 'User Directory', href: '/dashboard/owner/users', roleRequired: ['PLATFORM_OWNER'], icon: Key },
    { name: 'Vendor Portal', href: '/dashboard/vendor', roleRequired: ['VENDOR', 'PLATFORM_OWNER'], icon: Building },
    { name: 'Warehouse Point', href: '/dashboard/warehouse', roleRequired: ['WAREHOUSE', 'PLATFORM_OWNER'], icon: Warehouse },
    { name: 'Customer CRM', href: '/dashboard/customer', roleRequired: ['CUSTOMER', 'PLATFORM_OWNER'], icon: ShoppingCart },
    { name: 'Audit Logs', href: '/dashboard/owner/audit-logs', roleRequired: ['PLATFORM_OWNER'], icon: FileText },
    { name: 'MFA Security', href: '/dashboard/mfa-enrol', roleRequired: ['PLATFORM_OWNER', 'VENDOR', 'WAREHOUSE', 'CUSTOMER'], icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Glass Header matching LogiQ Navbar */}
      <header className="glass-header sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 text-white no-underline">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-extrabold text-base text-white shadow-lg shadow-indigo-600/30">
                LQ
              </div>
              <span className="font-extrabold text-lg tracking-tight">LogiQ-On Tech</span>
            </Link>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest hidden sm:inline-block">
              KAN-2 Staging Build
            </span>
          </div>

          {/* User Session Info & Action Pills */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{session?.user?.name || 'User Session'}</div>
              <div className="flex items-center gap-2 mt-0.5 justify-end">
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-bold">
                  Role: {role}
                </span>
                {mfaEnabled ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                    <Lock className="w-2.5 h-2.5" /> 2FA Active
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                    MFA Pending
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-red-500/20 hover:text-red-400 text-slate-300 border border-slate-800 transition-all text-xs flex items-center gap-1.5 font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 overflow-x-auto">
          {navLinks.map((link) => {
            const isAllowed = link.roleRequired.includes(role);
            const isActive = pathname === link.href;
            const Icon = link.icon;

            if (!isAllowed) return null;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40'
                    : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.name}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">{children}</main>
    </div>
  );
}
