"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/nav";
import Brand from "./Brand";
import MobileNav from "./MobileNav";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (
    pathname?.startsWith("/portal") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/customer-login" ||
    pathname === "/vendor-login"
  )
    return null;

  return (
    <>
      <header className="site-header">
        <div className="container header-container header-inner">
          <Brand />
          <nav className="main-nav" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <Link key={l.key} href={l.href} className={pathname === l.href ? "active" : ""}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link
              href="/login"
              className="btn-liquid-login"
            >
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
