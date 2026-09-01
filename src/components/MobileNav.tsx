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
        <Link href="/products/shop/cart" className="btn btn-ghost btn-block" onClick={onNavigate}>
          View Cart
        </Link>
        <Link href="/auth/login" className="btn btn-primary btn-block" onClick={onNavigate}>
          Customer Login
        </Link>
        <Link href="/vendor-login" className="btn btn-ghost btn-block" onClick={onNavigate}>
          Vendor Login
        </Link>
        <Link href="/request-quote" className="btn btn-ghost btn-block" onClick={onNavigate}>
          Request a Quote
        </Link>
        <Link href="/request-demo" className="btn btn-ghost btn-block" onClick={onNavigate}>
          Request a Demo
        </Link>
      </div>
    </div>
  );
}
