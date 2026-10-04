'use client';

export const dynamic = 'force-dynamic';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Brand from '@/components/Brand';
import HelpdeskLauncher from '@/components/HelpdeskLauncher';
import {
  Shield, FileText, LogOut, Lock, Package, Truck, ShoppingCart,
  Menu, X, GitBranch, Search, ShieldCheck, Inbox, BarChart2, LayoutDashboard,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const role = (session?.user as any)?.role || 'VENDOR';
  const mfaEnabled = (session?.user as any)?.mfaEnabled || false;
  const mfaVerified = (session?.user as any)?.mfaVerified || false;

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f4ff' }}>
        <div className="flex items-center gap-3 bg-white p-6 rounded-2xl shadow-md border border-slate-200">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#1e3a8a', borderTopColor: 'transparent' }} />
          <span className="text-xs font-semibold text-slate-600">
            {mustEnrol ? 'Enrolling required MFA…' : 'Verifying security session…'}
          </span>
        </div>
      </div>
    );
  }

  const OWNER_ONLY = ['PLATFORM_OWNER'];

  const navGroups = [
    {
      label: 'Overview',
      links: [
        { name: 'Overview', href: '/dashboard/owner', roleRequired: OWNER_ONLY, icon: LayoutDashboard },
      ],
    },
    {
      label: 'Operations',
      links: [
        { name: 'Orders', href: '/dashboard/owner/b2b-orders', roleRequired: OWNER_ONLY, icon: ShoppingCart },
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
      label: 'Supply Chain',
      links: [
        { name: 'Order Pipeline', href: '/dashboard/owner/pipeline', roleRequired: OWNER_ONLY, icon: GitBranch },
        { name: 'Email Inbox', href: '/dashboard/owner/emails', roleRequired: OWNER_ONLY, icon: Inbox },
        { name: 'Traceability', href: '/dashboard/owner/traceability', roleRequired: OWNER_ONLY, icon: Search },
        { name: 'Warranties', href: '/dashboard/owner/warranties', roleRequired: OWNER_ONLY, icon: ShieldCheck },
        { name: 'Reports', href: '/dashboard/owner/reports', roleRequired: OWNER_ONLY, icon: BarChart2 },
      ],
    },
    {
      label: 'Administration',
      links: [
        { name: 'Audit Logs', href: '/dashboard/owner/audit-logs', roleRequired: OWNER_ONLY, icon: FileText },
      ],
    },
    {
      label: 'Security',
      links: [
        { name: 'MFA Security', href: '/dashboard/mfa-enrol', roleRequired: OWNER_ONLY, icon: Lock },
      ],
    },
  ]
    .map((group) => ({ ...group, links: group.links.filter((link) => link.roleRequired.includes(role)) }))
    .filter((group) => group.links.length > 0);

  const sidebarContent = (
    <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.links.map((link) => {
              const isActive = (link as any).activePaths
                ? (link as any).activePaths.includes(pathname)
                : pathname === link.href || (link.href !== '/dashboard/owner' && pathname.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white text-[#1e3a8a] shadow-sm font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
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

  const sidebarFooter = (
    <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
      <button
        onClick={() => signOut({ callbackUrl: '/auth/login' })}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span>Sign Out</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen font-sans" style={{ background: '#f0f4ff', color: '#0f172a' }}>
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Brand />
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border" style={{ background: '#eff6ff', color: '#1e3a8a', borderColor: '#bfdbfe' }}>
              <Shield className="w-3 h-3" /> Platform Console
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <span className="text-xs font-bold text-slate-800">{session?.user?.name || 'Platform Owner'}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#eff6ff', color: '#1e3a8a' }}>
                  Platform Owner
                </span>
                {mfaEnabled ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#f0fdf4', color: '#166534' }}>
                    <Lock className="w-2.5 h-2.5" /> 2FA On
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#fffbeb', color: '#92400e' }}>
                    MFA Pending
                  </span>
                )}
              </div>
            </div>

            <HelpdeskLauncher />

            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex" style={{ minHeight: 'calc(100vh - 61px)' }}>
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 sticky top-[61px] h-[calc(100vh-61px)]" style={{ background: '#1e3a8a' }}>
          {sidebarContent}
          {sidebarFooter}
        </aside>

        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileNavOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col shadow-2xl" style={{ background: '#1e3a8a' }}>
              <div className="px-4 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-white font-bold text-sm">Platform Console</span>
                <button onClick={() => setMobileNavOpen(false)} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {sidebarContent}
              {sidebarFooter}
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
