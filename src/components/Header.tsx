"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Brand from "./Brand";
import MobileNav from "./MobileNav";

const PROJECT_NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Owner Console", href: "/dashboard/owner" },
  { label: "User Directory", href: "/dashboard/owner/users" },
  { label: "Audit Logs", href: "/dashboard/owner/audit-logs" },
  { label: "Vendor Portal", href: "/dashboard/vendor" },
  { label: "Warehouse", href: "/dashboard/warehouse" },
  { label: "Customer CRM", href: "/dashboard/customer" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith("/dashboard/")) return null;

  return (
    <>
      <header className="site-header">
        <div className="container header-container header-inner">
          <Brand />
          <nav className="main-nav" aria-label="Primary">
            {PROJECT_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? "active" : ""}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link href="/auth/login" className="btn-liquid-login">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Login
            </Link>
            <button
              className="nav-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>
      {open && <MobileNav onNavigate={() => setOpen(false)} />}
    </>
  );
}
