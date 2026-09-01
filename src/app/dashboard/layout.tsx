'use client';

export const dynamic = 'force-dynamic';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Brand from '@/components/Brand';
import HelpdeskLauncher from '@/components/HelpdeskLauncher';
import { Shield, Building, Warehouse, FileText, LogOut, Lock, Users, Package, Boxes, Truck, ShoppingCart, Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const role = (session?.user as any)?.role || 'VENDOR';
  const mfaEnabled = (session?.user as any)?.mfaEnabled || false;
  const mfaVerified = (session?.user as any)?.mfaVerified || false;

  // MFA mandatory for PLATFORM_OWNER.
  // If they have not enrolled yet, redirect to enrolment. If enrolled but not
  // verified for this session, redirect to challenge.
  const MFA_REQUIRED_ROLES = ['PLATFORM_OWNER'];
  const mfaMandatory = MFA_REQUIRED_ROLES.includes(role);
  const mustEnrol = mfaMandatory && !mfaEnabled;
  const mustVerify = mfaEnabled && !mfaVerified;
  const onEnrolPage = pathname === '/dashboard/mfa-enrol';
  const onVerifyPage = pathname === '/auth/mfa-verify';

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (mustVerify && !onVerifyPage) {
      router.push('/auth/mfa-verify');
      return;
    }
    if (mustEnrol && !onEnrolPage) {
      router.push('/dashboard/mfa-enrol?mandatory=1');
    }
  }, [status, mustVerify, mustEnrol, onVerifyPage, onEnrolPage, router]);

  const showBlockingLoader =
    status === 'loading' ||
    (status === 'authenticated' && mustVerify && !onVerifyPage) ||
    (status === 'authenticated' && mustEnrol && !onEnrolPage);

  if (showBlockingLoader) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 bg-white p-6 rounded-2xl shadow-md border border-slate-200">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-slate-600">
            {mustEnrol ? 'Enrolling required MFA…' : 'Verifying Security Session…'}
          </span>
        </div>
      </div>
    );
  }

  const OWNER_ONLY = ['PLATFORM_OWNER'];
  const VENDOR_ONLY = ['VENDOR'];
  const BOTH = ['PLATFORM_OWNER', 'VENDOR'];

  const navGroups = [
    {
      label: 'Overview',
      links: [
        { name: 'Platform Owner', href: '/dashboard/owner', roleRequired: OWNER_ONLY, icon: Shield },
        { name: 'Vendor Portal', href: '/dashboard/vendor', roleRequired: VENDOR_ONLY, icon: Building },
      ],
    },
    {
      label: 'Operations',
      links: [
        { name: 'B2B Orders', href: '/dashboard/owner/b2b-orders', roleRequired: OWNER_ONLY, icon: ShoppingCart },
        { name: 'Inventory Master', href: '/dashboard/owner/inventory', roleRequired: OWNER_ONLY, icon: Boxes },
        {
          name: 'Warehouse Operations',
          href: '/dashboard/warehouse',
          roleRequired: VENDOR_ONLY,
          icon: Warehouse,
          // Also covers the Stock Control Desk and Dispatch Notes pages reached via
          // this section's own sub-tabs, so the sidebar stays highlighted on all three.
          activePaths: ['/dashboard/warehouse', '/dashboard/owner/inventory', '/dashboard/warehouse/dispatch-notes'],
        },
      ],
    },
    {
      label: 'Master Data',
      links: [
        { name: 'Item Master Data', href: '/dashboard/owner/items', roleRequired: OWNER_ONLY, icon: Package },
        { name: 'Vendor Master Data', href: '/dashboard/owner/vendor-master', roleRequired: OWNER_ONLY, icon: Truck },
        { name: 'Customer Master Data', href: '/dashboard/owner/customer-master', roleRequired: OWNER_ONLY, icon: ShoppingCart },
      ],
    },
    {
      label: 'Administration',
      links: [
        { name: 'User Directory', href: '/dashboard/owner/users', roleRequired: OWNER_ONLY, icon: Users },
        { name: 'Vendor Directory', href: '/dashboard/owner/vendors', roleRequired: OWNER_ONLY, icon: Building },
        { name: 'Audit Logs', href: '/dashboard/owner/audit-logs', roleRequired: OWNER_ONLY, icon: FileText },
      ],
    },
    {
      label: 'Security',
      links: [
        { name: 'MFA Security', href: '/dashboard/mfa-enrol', roleRequired: BOTH, icon: Lock },
      ],
    },
  ]
    .map((group) => ({ ...group, links: group.links.filter((link) => link.roleRequired.includes(role)) }))
    .filter((group) => group.links.length > 0);

  const sidebarContent = (
    <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {group.label}
          </div>
          <div className="space-y-1">
            {group.links.map((link) => {
              const isActive = (link as any).activePaths
                ? (link as any).activePaths.includes(pathname)
                : pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Light Header matching LogiQ Landing Brand */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
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
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 font-bold">
                    <Lock className="w-2.5 h-2.5" /> 2FA Active
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                    MFA Pending
                  </span>
                )}
              </div>
            </div>

            <HelpdeskLauncher />

            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 transition-all text-xs flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex" style={{ minHeight: 'calc(100vh - 61px)' }}>
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-slate-200 bg-white sticky top-[61px] h-[calc(100vh-61px)]">
          {sidebarContent}
        </aside>

        {/* Mobile Sidebar Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-200 flex flex-col shadow-xl">
              <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <Brand />
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {sidebarContent}
            </aside>
          </div>
        )}

        {/* Main Content Container */}
        <main className="flex-1 min-w-0 p-6">{children}</main>
      </div>
    </div>
  );
}
