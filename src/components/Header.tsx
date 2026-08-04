"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Brand from "./Brand";
import { LogIn, Menu, X, ShieldCheck, Users, Activity, Building2, Warehouse, ShoppingCart } from "lucide-react";

const PROJECT_NAV_ITEMS = [
  { label: "Home", href: "/", icon: null },
  { label: "Owner Console", href: "/dashboard/owner", icon: ShieldCheck },
  { label: "User Directory", href: "/dashboard/owner/users", icon: Users },
  { label: "Audit Logs", href: "/dashboard/owner/audit-logs", icon: Activity },
  { label: "Vendor Portal", href: "/dashboard/vendor", icon: Building2 },
  { label: "Warehouse", href: "/dashboard/warehouse", icon: Warehouse },
  { label: "Customer CRM", href: "/dashboard/customer", icon: ShoppingCart },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide duplicate top header inside dashboard console views
  if (pathname?.startsWith("/dashboard/")) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-2xl border-b border-slate-800/80 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Brand />
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1.5 bg-slate-900/70 p-1.5 rounded-full border border-slate-800/80">
          {PROJECT_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                {item.icon && <item.icon className="w-3.5 h-3.5 opacity-80" />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Day 3 Complete
          </div>

          <Link
            href="/auth/login"
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-full shadow-lg shadow-indigo-600/20 border border-indigo-400/30 transition-all flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </Link>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="xl:hidden bg-slate-950/98 backdrop-blur-2xl border-b border-slate-800 px-6 py-6 space-y-3">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
            LogiQ-On Tech Modules
          </div>
          {PROJECT_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                pathname === item.href
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              {item.icon && <item.icon className="w-4 h-4" />}
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
