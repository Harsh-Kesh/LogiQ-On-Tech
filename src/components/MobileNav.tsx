"use client";

import Link from "next/link";
import { NAV_LINKS } from "@/lib/nav";

export default function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="mobile-nav">
      {NAV_LINKS.map((l) => (
        <Link key={l.key} href={l.href} onClick={onNavigate}>
          {l.label}
        </Link>
      ))}
      <div className="mobile-actions">
        <Link href="/auth/login" className="btn btn-primary btn-block" onClick={onNavigate}>
          Platform Sign In
        </Link>
        <Link href="/request?type=quote" className="btn btn-ghost btn-block" onClick={onNavigate}>
          Request Quote
        </Link>
        <Link href="/request?type=demo" className="btn btn-ghost btn-block" onClick={onNavigate}>
          Request Demo
        </Link>
      </div>
    </div>
  );
}
