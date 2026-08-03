'use client';

export const dynamic = 'force-dynamic';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Building, Warehouse, ShoppingCart, Key, FileText, LogOut, Lock } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <span className="text-sm font-mono text-slate-400">Loading Session & Verifying Role Permissions...</span>
        </div>
      </div>
    );
  }

  const role = (session?.user as any)?.role || 'CUSTOMER';
  const mfaEnabled = (session?.user as any)?.mfaEnabled || false;

  const navLinks = [
    { name: 'Platform Owner', href: '/dashboard/owner', roleRequired: ['PLATFORM_OWNER', 'MDM'], icon: Shield },
    { name: 'Vendor Portal', href: '/dashboard/vendor', roleRequired: ['VENDOR', 'PLATFORM_OWNER'], icon: Building },
    { name: 'Warehouse Point', href: '/dashboard/warehouse', roleRequired: ['WAREHOUSE', 'PLATFORM_OWNER'], icon: Warehouse },
    { name: 'Customer CRM', href: '/dashboard/customer', roleRequired: ['CUSTOMER', 'PLATFORM_OWNER'], icon: ShoppingCart },
    { name: 'Audit Logs', href: '/dashboard/owner/audit-logs', roleRequired: ['PLATFORM_OWNER'], icon: FileText },
    { name: 'MFA Security', href: '/dashboard/mfa-enrol', roleRequired: ['PLATFORM_OWNER', 'VENDOR', 'WAREHOUSE', 'CUSTOMER'], icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Navbar Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-base text-white shadow-lg shadow-indigo-500/20">
              LQ
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight">LogiQ-On Tech</span>
              <span className="text-[10px] ml-2 font-mono px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                KAN-2 Active
              </span>
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{session?.user?.name || 'User Session'}</div>
              <div className="flex items-center gap-2 mt-0.5 justify-end">
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                  Role: {role}
                </span>
                {mfaEnabled ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> 2FA Active
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    MFA Pending
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-slate-700 transition-all text-xs flex items-center gap-1.5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/60 overflow-x-auto">
          {navLinks.map((link) => {
            const isAllowed = link.roleRequired.includes(role);
            const isActive = pathname === link.href;
            const Icon = link.icon;

            if (!isAllowed) return null;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.name}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">{children}</main>
    </div>
  );
}
