'use client';

export const dynamic = 'force-dynamic';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Brand from '@/components/Brand';
import HelpdeskLauncher from '@/components/HelpdeskLauncher';
import { Shield, Building, Warehouse, Key, FileText, LogOut, Lock, Users, Package, Truck, ShoppingCart, ClipboardList, Receipt } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const role = (session?.user as any)?.role || 'VENDOR';
  const mfaEnabled = (session?.user as any)?.mfaEnabled || false;
  const mfaVerified = (session?.user as any)?.mfaVerified || false;

  useEffect(() => {
    if (status === 'authenticated' && mfaEnabled && !mfaVerified) {
      router.push('/auth/mfa-verify');
    }
  }, [status, mfaEnabled, mfaVerified, router]);

  if (status === 'loading' || (status === 'authenticated' && mfaEnabled && !mfaVerified)) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 bg-white p-6 rounded-2xl shadow-md border border-slate-200">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-slate-600">Verifying Security Session...</span>
        </div>
      </div>
    );
  }

  const navLinks = [
    { name: 'Platform Owner', href: '/dashboard/owner', roleRequired: ['PLATFORM_OWNER'], icon: Shield },
    { name: 'B2B Orders', href: '/dashboard/owner/b2b-orders', roleRequired: ['PLATFORM_OWNER', 'MDM'], icon: ShoppingCart },
    { name: 'Master Data', href: '/dashboard/owner/items', roleRequired: ['PLATFORM_OWNER', 'MDM'], icon: Package },
    { name: 'Vendor Master Data', href: '/dashboard/owner/vendor-master', roleRequired: ['PLATFORM_OWNER', 'MDM'], icon: Truck },
    { name: 'Customer Master Data', href: '/dashboard/owner/customer-master', roleRequired: ['PLATFORM_OWNER', 'MDM'], icon: ShoppingCart },
    { name: 'User Directory', href: '/dashboard/owner/users', roleRequired: ['PLATFORM_OWNER'], icon: Users },
    { name: 'Vendor Directory', href: '/dashboard/owner/vendors', roleRequired: ['PLATFORM_OWNER'], icon: Building },
    { name: 'Vendor Portal', href: '/dashboard/vendor', roleRequired: ['VENDOR'], icon: Building },
    { name: 'Warehouse Point', href: '/dashboard/warehouse', roleRequired: ['WAREHOUSE', 'PLATFORM_OWNER'], icon: Warehouse },
    { name: 'Warehouse Dispatch List', href: '/dashboard/warehouse/dispatch-notes', roleRequired: ['WAREHOUSE', 'PLATFORM_OWNER'], icon: ClipboardList },
    { name: 'Dispatch Invoice & Payment', href: '/dashboard/warehouse/dispatch-invoices', roleRequired: ['WAREHOUSE', 'PLATFORM_OWNER'], icon: Receipt },
    { name: 'Audit Logs', href: '/dashboard/owner/audit-logs', roleRequired: ['PLATFORM_OWNER'], icon: FileText },
    { name: 'MFA Security', href: '/dashboard/mfa-enrol', roleRequired: ['PLATFORM_OWNER', 'VENDOR', 'WAREHOUSE'], icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Light Header matching LogiQ Landing Brand */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Brand />
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-widest hidden sm:inline-block font-semibold">
              Platform Console
            </span>
          </div>

          {/* User Session Info & Action Pills */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900">{session?.user?.name || 'User Session'}</div>
              <div className="flex items-center gap-2 mt-0.5 justify-end">
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase font-bold">
                  Role: {role}
                </span>
                {mfaEnabled ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-bold">
                    <Lock className="w-2.5 h-2.5" /> 2FA Active
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                    MFA Pending
                  </span>
                )}
              </div>
            </div>

            <HelpdeskLauncher compact />

            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 transition-all text-xs flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 overflow-x-auto">
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
                    ? 'bg-slate-900 text-white shadow-md border border-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
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
