"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SegmentedToggle from "@/components/SegmentedToggle";

type Tab = "products" | "solutions" | "industries" | "retail";

const TAB_OPTIONS = [
  { value: "products", label: "Products" },
  { value: "solutions", label: "Solutions" },
  { value: "industries", label: "Industries" },
  { value: "retail", label: "Retail Stores" },
];

function isTab(value: string | null): value is Tab {
  return value === "products" || value === "solutions" || value === "industries" || value === "retail";
}

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const ARROW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function ProductsSolutionsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(isTab(initial) ? initial : "products");

  function goTab(next: Tab) {
    setTab(next);
    router.replace(next === "products" ? "/products" : `/products?tab=${next}`, { scroll: false });
  }

  return (
    <>
      <div className="container" style={{ paddingTop: 40 }}>
        <SegmentedToggle value={tab} onChange={(v) => goTab(v as Tab)} options={TAB_OPTIONS} />
      </div>

      {tab === "products" && (
        <>
          <section className="section">
            <div className="container">
              <div className="section-head">
                <span className="eyebrow">Products</span>
                <h2>Hardware for every scan, tag, and label.</h2>
                <p className="lede">
                  Six categories cover the physical layer of a modern supply chain — sourced from leading
                  manufacturers and specified to your environment, not picked off a shelf.
                </p>
              </div>
              <div className="grid grid-3">
                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></svg></div>
                  <span className="tag">Category 01</span>
                  <h3>Mobile Computers</h3>
                  <p>Rugged handhelds, vehicle-mount, wearable, and tablet computers for every role on the floor.</p>
                  <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)" }}>Rugged &middot; Handheld &middot; Vehicle-mount &middot; Wearable &middot; Tablet</p>
                  <Link href="/request?type=quote" className="card-link">Get pricing {ARROW}</Link>
                </div>

                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h2M4 12h2M4 18h2M9 6h1M9 12h1M9 18h1M13 6h2M13 12h2M13 18h2M18 6h2M18 12h2M18 18h2" /></svg></div>
                  <span className="tag">Category 02</span>
                  <h3>Barcode Scanners</h3>
                  <p>General purpose, rugged, portable, wearable, and fixed-mount scanning for any read distance.</p>
                  <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)" }}>General Purpose &middot; Rugged &middot; Portable &middot; Wearable &middot; Fixed Mount</p>
                  <Link href="/request?type=quote" className="card-link">Get pricing {ARROW}</Link>
                </div>

                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="10" rx="1" /><path d="M7 17v2M15 17v2M3 11h18" /></svg></div>
                  <span className="tag">Category 03</span>
                  <h3>Label Printing</h3>
                  <p>Desktop, industrial, rugged mobile, specialty, and POS receipt printers.</p>
                  <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)" }}>
                    <Link href="/products/label-printing/desktop-printers" style={{ color: "var(--brand-primary, #0ce3fb)", textDecoration: "underline" }}>Desktop</Link> &middot; Industrial &middot; Mobile &middot; Specialty &middot; POS Receipt
                  </p>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <Link href="/products/label-printing/desktop-printers" className="card-link">View Desktop Printers {ARROW}</Link>
                  </div>
                </div>

                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8c2-2 14-2 16 0M4 12c2-2 14-2 16 0M4 16c2-2 14-2 16 0" /></svg></div>
                  <span className="tag">Category 04</span>
                  <h3>RFID Solutions</h3>
                  <p>Mobile and fixed RFID readers, antennas, printers, and tags for item-level visibility.</p>
                  <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)" }}>Mobile RFID &middot; Fixed RFID &middot; Antennas &middot; Printers &middot; Tags</p>
                  <Link href="/request?type=quote" className="card-link">Get pricing {ARROW}</Link>
                </div>

                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0-8-8" /><path d="M12 20v-8l5-3" /></svg></div>
                  <span className="tag">Category 05</span>
                  <h3>Wireless Solutions</h3>
                  <p>Site surveys and wireless infrastructure hardware engineered for warehouse conditions.</p>
                  <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)" }}>Site Surveys &middot; Access Points &middot; Antennas &middot; Controllers</p>
                  <Link href="/request?type=quote" className="card-link">Get pricing {ARROW}</Link>
                </div>

                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 20h6" /></svg></div>
                  <span className="tag">Category 06</span>
                  <h3>Digital Display</h3>
                  <p>Interactive displays, wireless collaboration, digital signage, and projectors.</p>
                  <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)" }}>Interactive &middot; Signage &middot; Projectors &middot; Mounting</p>
                  <button type="button" className="card-link" onClick={() => goTab("retail")}>See in Retail Stores {ARROW}</button>
                </div>
              </div>
            </div>
          </section>

          <section className="section tint">
            <div className="container split reverse">
              <div>
                <span className="eyebrow">Category 01 · Featured</span>
                <h2>Rugged mobile computers that survive the drop test and the shift.</h2>
                <ul className="checklist">
                  <li>{CHECK} IP65+ rated for dust, moisture, and repeated drops</li>
                  <li>{CHECK} Full-shift battery with hot-swap options</li>
                  <li>{CHECK} Vehicle-mount, wearable, and handheld form factors</li>
                  <li>{CHECK} Fleet-ready with charging cradles and accessories</li>
                </ul>
                <div className="hero-cta">
                  <Link href="/request?type=quote" className="btn btn-primary">Request a Quote</Link>
                </div>
              </div>
              <div className="split-visual" style={{ position: "relative", minHeight: 320, borderRadius: 20, overflow: "hidden", border: "1px solid var(--line)" }}>
                <Image
                  src="https://images.pexels.com/photos/4483941/pexels-photo-4483941.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Warehouse worker using a handheld barcode scanner on inventory"
                  fill
                  sizes="(max-width: 880px) 100vw, 45vw"
                  style={{ objectFit: "cover" }}
                />
                <div className="hero-visual-caption" style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#fff" }}><span>Handheld · IP67</span><span style={{ fontWeight: 600 }}>IN STOCK</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "rgba(255,255,255,0.85)" }}><span>Vehicle-mount · 10.1&quot;</span><span style={{ fontWeight: 600 }}>IN STOCK</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "rgba(255,255,255,0.7)" }}><span>Wearable · Ring Scanner</span><span style={{ fontWeight: 600 }}>ON ORDER</span></div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {tab === "solutions" && (
        <>
          <section className="section">
            <div className="container">
              <div className="section-head">
                <span className="eyebrow">Solutions</span>
                <h2>Systems, not just devices.</h2>
                <p className="lede">
                  Hardware only earns its keep once it&apos;s wired into software, wireless coverage, and a process
                  your team will actually follow. That&apos;s the layer we design.
                </p>
              </div>
              <div className="grid grid-3">
                <div className="card">
                  <span className="tag">Solution</span>
                  <h3>Hardware Solutions</h3>
                  <p>Device selection, provisioning, and lifecycle management across your entire fleet.</p>
                  <button type="button" className="card-link" onClick={() => goTab("products")}>View products {ARROW}</button>
                </div>
                <div className="card">
                  <span className="tag">Solution</span>
                  <h3>Software Solutions</h3>
                  <p>Warehouse, inventory, and stock-taking software that speaks to your existing ERP.</p>
                  <Link href="/request?type=demo" className="card-link">Request a demo {ARROW}</Link>
                </div>
                <div className="card">
                  <span className="tag">Solution</span>
                  <h3>Intelligent Cabinets</h3>
                  <p>Secure, tracked storage and charging for shared devices, keys, and high-value tools.</p>
                  <Link href="/contact" className="card-link">Ask a question {ARROW}</Link>
                </div>
                <div className="card">
                  <span className="tag">Solution</span>
                  <h3>Wireless Infrastructure</h3>
                  <p>Site surveys and wireless design engineered for racking, concrete, and RF interference.</p>
                  <Link href="/contact" className="card-link">Book a site survey {ARROW}</Link>
                </div>
                <div className="card">
                  <span className="tag">Solution</span>
                  <h3>Asset Solutions (BLE RTLS)</h3>
                  <p>Bluetooth Low Energy real-time location tracking for equipment, cages, and pallets.</p>
                  <Link href="/request?type=demo" className="card-link">Request a demo {ARROW}</Link>
                </div>
                <div className="card">
                  <span className="tag">Solution</span>
                  <h3>Retail RFID Solutions</h3>
                  <p>Item-level RFID for stocktake accuracy, loss prevention, and shelf availability.</p>
                  <button type="button" className="card-link" onClick={() => goTab("retail")}>See Retail Stores {ARROW}</button>
                </div>
              </div>
            </div>
          </section>

          <section className="section tint">
            <div className="container split reverse">
              <div>
                <span className="eyebrow">Featured · Electronic Shelf Labels</span>
                <h2>Change every price on the floor from one screen.</h2>
                <ul className="checklist">
                  <li>{CHECK} Instant, storewide price and promotion updates</li>
                  <li>{CHECK} Removes manual re-ticketing labour entirely</li>
                  <li>{CHECK} Pairs with digital signage for attention-grabbing displays</li>
                </ul>
                <div className="hero-cta">
                  <button type="button" className="btn btn-primary" onClick={() => goTab("retail")}>Explore Retail Stores</button>
                </div>
              </div>
              <div className="split-visual scan-panel" style={{ padding: 28, minHeight: 260, display: "flex", alignItems: "center" }}>
                <div style={{ display: "grid", gap: 10, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-soft)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Shelf 4A · Aisle 12</span><span style={{ color: "var(--indigo)", fontWeight: 600 }}>SYNCED</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Promo batch #221</span><span style={{ color: "var(--cyan)", fontWeight: 600 }}>PUSHING…</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Store-wide refresh</span><span style={{ color: "var(--ink-soft)" }}>98% complete</span></div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {tab === "industries" && (
        <>
          <section className="section">
            <div className="container">
              <div className="section-head">
                <span className="eyebrow">Industries</span>
                <h2>Different floors, the same low tolerance for guesswork.</h2>
                <p className="lede">
                  Every industry we work in has its own compliance rules, seasonality, and margin pressure — but all
                  of them lose money the moment a scan, tag, or dispatch goes wrong.
                </p>
              </div>
              <div className="grid grid-3">
                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6v9a1 1 0 0 1-1 1h-4v-6h-8v6H4a1 1 0 0 1-1-1z" /></svg></div>
                  <span className="tag">3PL</span>
                  <h3>Warehousing &amp; Distribution</h3>
                  <p>Receiving, put-away, picking, and dispatch systems built to hold same-day SLAs.</p>
                </div>
                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1-5h16l1 5M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /></svg></div>
                  <span className="tag">Storefront</span>
                  <h3>Retail</h3>
                  <p>Electronic shelf labels, in-store RFID, and signage that cut price-change labour to minutes.</p>
                </div>
                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg></div>
                  <span className="tag">Production</span>
                  <h3>Manufacturing</h3>
                  <p>Line-side data capture and asset tracking across plant floors and staging areas.</p>
                </div>
                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6M12 16v6M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M2 12h6M16 12h6M4.9 19.1l4.2-4.2M14.9 9.1l4.2-4.2" /></svg></div>
                  <span className="tag">Cold Chain</span>
                  <h3>Food &amp; Beverage</h3>
                  <p>Temperature-aware handhelds and tracking for perishable, compliance-heavy stock.</p>
                </div>
                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" /><path d="M9 12h6M12 9v6" /></svg></div>
                  <span className="tag">Clinical</span>
                  <h3>Healthcare</h3>
                  <p>Asset and stock tracking for supply rooms, sterile stores, and clinical logistics.</p>
                </div>
                <div className="card">
                  <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="15" height="10" rx="2" /><path d="M18 9h3l2 3v4h-5z" /><circle cx="7.5" cy="18.5" r="1.5" /><circle cx="17.5" cy="18.5" r="1.5" /></svg></div>
                  <span className="tag">Fleet</span>
                  <h3>Transport &amp; Distribution</h3>
                  <p>Proof-of-delivery, vehicle-mount computing, and dispatch visibility on the road.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section tint">
            <div className="container split">
              <div>
                <span className="eyebrow">Industry focus · Retail</span>
                <h2>Retailers are the fastest-moving floor we equip.</h2>
                <p className="lede" style={{ marginTop: 14 }}>
                  Electronic Shelf Labels and digital signage refresh pricing storewide in seconds, while RFID gives
                  loss prevention and stocktake teams item-level accuracy without a single manual count.
                </p>
                <div className="hero-cta">
                  <button type="button" className="btn btn-primary" onClick={() => goTab("retail")}>Visit Retail Stores</button>
                </div>
              </div>
              <div className="split-visual scan-panel" style={{ padding: 32, minHeight: 300, display: "flex", alignItems: "flex-end", position: "relative", overflow: "hidden" }}>
                <Image
                  src="https://images.pexels.com/photos/5868735/pexels-photo-5868735.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Retail RFID electronic shelf label management"
                  fill
                  sizes="(max-width: 880px) 100vw, 50vw"
                  style={{ objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.75) 60%, rgba(255, 255, 255, 0.4) 100%)" }} />
                <div style={{ position: "relative", zIndex: 2 }}>
                  <span className="pill">RETAIL RFID</span>
                  <p style={{ marginTop: 14, color: "var(--ink)", fontSize: 14.5, fontWeight: 500 }}>
                    Shelf-level read accuracy feeding straight into stock counts and loss-prevention alerts.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {tab === "retail" && (
        <>
          <section className="section">
            <div className="container">
              <div className="section-head">
                <span className="eyebrow">Retail Stores</span>
                <h2>The storefront, kept in sync with the stockroom.</h2>
                <p className="lede">
                  Electronic Shelf Labels, digital signage, and retail RFID work together so pricing, promotions, and
                  stock counts stay accurate without a single manual re-tag.
                </p>
              </div>
            </div>
          </section>

          <section className="section" style={{ paddingTop: 0 }}>
            <div className="container split">
              <div>
                <span className="eyebrow">Electronic Shelf Labels</span>
                <h2>Every price on the floor, changed from one screen.</h2>
                <ul className="checklist">
                  <li>{CHECK} Storewide price and promotion updates in seconds</li>
                  <li>{CHECK} Removes manual re-ticketing labour and pricing errors</li>
                  <li>{CHECK} Attention-grabbing colour tags for promotions</li>
                </ul>
              </div>
              <div className="split-visual scan-panel" style={{ padding: 28, minHeight: 260, display: "flex", alignItems: "center" }}>
                <div style={{ display: "grid", gap: 10, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-soft)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Aisle 3 · 214 labels</span><span style={{ color: "var(--indigo)", fontWeight: 600 }}>SYNCED</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Weekend promo push</span><span style={{ color: "var(--cyan)", fontWeight: 600 }}>LIVE</span></div>
                </div>
              </div>
            </div>
          </section>

          <section className="section tint">
            <div className="container split reverse">
              <div>
                <span className="eyebrow">Digital Signage</span>
                <h2>Screens that sell, without a content team behind every one.</h2>
                <ul className="checklist">
                  <li>{CHECK} Centrally managed displays across every store</li>
                  <li>{CHECK} Interactive and wireless collaboration options</li>
                  <li>{CHECK} Pairs with ESL for a single, coordinated storefront</li>
                </ul>
              </div>
              <div className="split-visual scan-panel" style={{ padding: 28, minHeight: 260, display: "flex", alignItems: "center" }}>
                <div>
                  <span className="pill">SIGNAGE NETWORK</span>
                  <p style={{ marginTop: 14, color: "var(--ink-soft)", fontSize: 14.5 }}>
                    One dashboard pushes content to every screen, storewide.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="container split">
              <div>
                <span className="eyebrow">Retail RFID</span>
                <h2>Stocktakes measured in minutes, not weekends.</h2>
                <ul className="checklist">
                  <li>{CHECK} Item-level accuracy across the entire shop floor</li>
                  <li>{CHECK} Faster loss-prevention response on shrinkage</li>
                  <li>{CHECK} Feeds shelf-availability data straight to the stockroom</li>
                </ul>
                <div className="hero-cta">
                  <Link href="/request?type=demo" className="btn btn-primary">Request a Demo</Link>
                </div>
              </div>
              <div className="split-visual scan-panel" style={{ padding: 28, minHeight: 260, display: "flex", alignItems: "center" }}>
                <div style={{ display: "grid", gap: 10, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-soft)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Full-store scan</span><span style={{ color: "var(--indigo)", fontWeight: 600 }}>4m 12s</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Items reconciled</span><span style={{ color: "var(--ink-soft)" }}>12,406</span></div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-banner">
            <div>
              <h2>Not sure where to start?</h2>
              <p>Tell us what you&apos;re scanning, tracking, or selling and we&apos;ll match it to the right category.</p>
            </div>
            <div className="cta-actions">
              <Link href="/request?type=demo" className="btn btn-primary">Request a Demo</Link>
              <Link href="/contact" className="btn btn-ghost">Talk to the Team</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
