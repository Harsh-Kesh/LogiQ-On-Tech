"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Brand from "./Brand";
import SocialLinks from "./SocialLinks";

const FOOTER_COLUMNS = [
  {
    heading: "Products",
    links: [
      { label: "Barcode Scanners", href: "/products/barcode-scanners" },
      { label: "RFID Solutions", href: "/products/rfid-solutions" },
      { label: "Mobile Computers", href: "/products/mobile-computers" },
      { label: "Label Printing", href: "/products/label-printing/desktop-printers" },
      { label: "Digital Signage", href: "/products/digital-signage" },
    ],
  },
  {
    heading: "Solutions",
    links: [
      { label: "Solutions Hub", href: "/solutions" },
      { label: "gStore by GreyOrange", href: "/solutions/retail-rfid-solutions/gstore-greyorange" },
      { label: "Wireless Solutions", href: "/products/wireless-solutions" },
      { label: "Industries", href: "/industries" },
      { label: "Retail Stores", href: "/retail-stores" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Partners", href: "/partners" },
      { label: "LogiQ-On Buzz", href: "/buzz" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    heading: "Get Started",
    links: [
      { label: "Request a Demo", href: "/request-demo" },
      { label: "Request a Quote", href: "/request-quote" },
      { label: "Platform Sign In", href: "/auth/login" },
      { label: "Vendor Portal", href: "/dashboard/vendor" },
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubscribed(true);
  }

  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/auth/login" ||
    pathname === "/vendor-login"
  )
    return null;

  return (
    <footer className={`bg-white border-t border-slate-200 ${pathname?.startsWith("/portal") ? "ml-[260px]" : ""}`}>
      <div className="container mx-auto px-margin-desktop py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_repeat(4,1fr)] gap-8 lg:gap-6">
          {/* Brand + newsletter */}
          <div className="max-w-xs">
            <Brand />
            <p className="mt-3 text-[13px] text-slate-600 leading-relaxed">
              Bespoke supply chain, warehouse, and retail technology &mdash; sourced, installed, and supported
              across Australia since 2020.
            </p>

            {subscribed ? (
              <p className="mt-4 text-[13px] font-bold text-slate-950">
                Thanks &mdash; you&apos;re on the list.
              </p>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="mt-4 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full p-1 pl-4 max-w-[280px] focus-within:border-slate-950 transition-colors"
              >
                <label htmlFor="footer-email" className="sr-only">
                  Your email
                </label>
                <input
                  id="footer-email"
                  name="email"
                  type="email"
                  required
                  placeholder="Your email"
                  className="flex-1 min-w-0 bg-transparent text-xs text-slate-950 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors"
                >
                  Subscribe
                </button>
              </form>
            )}

            <div className="mt-4 grid gap-0.5 text-[13px] text-slate-600">
              <a href="tel:1300717433" className="hover:text-indigo-600 transition-colors w-fit">1300 717 433</a>
              <a href="mailto:info@logiqon.com.au" className="hover:text-indigo-600 transition-colors w-fit">
                info@logiqon.com.au
              </a>
            </div>

            {/* Social Media Buttons (FB & IG) */}
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Follow Us</p>
              <SocialLinks />
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-[13px] font-bold text-slate-950 mb-3">{col.heading}</h4>
              <ul className="grid gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-5 border-t border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            &copy; 2026 LogiQ-On Technology Group Pty Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <p className="text-xs text-slate-600">
              Melbourne, Victoria &middot; Prices in AUD &middot; Australia-wide service
            </p>
            <SocialLinks />
          </div>
        </div>
      </div>
    </footer>
  );
}
