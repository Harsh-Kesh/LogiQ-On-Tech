"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/nav";
import Brand from "./Brand";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith("/dashboard")) return null;

  return (
    <header className="site-header">
      <div className="container header-container header-inner">
        <Brand />
        <nav className="main-nav hidden lg:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <Link key={l.key} href={l.href} className={pathname === l.href ? "active" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link
            href="/auth/login"
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
            className="nav-toggle flex lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
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
      {open && (
        <div className="lg:hidden p-4 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 space-y-2">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-900 rounded-xl"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
