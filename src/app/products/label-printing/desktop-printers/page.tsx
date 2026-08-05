import type { Metadata } from "next";
import { Suspense } from "react";
import HeroArt from "@/components/HeroArt";
import DesktopPrintersClient from "@/components/products/DesktopPrintersClient";

export const metadata: Metadata = {
  title: "Compact Desktop Label Printers for All Industries | LogiQ-On Tech",
  description:
    "Find compact, reliable desktop label printers perfect for retail, healthcare, logistics, and manufacturing. Browse direct thermal and thermal transfer models from Bixolon, Honeywell, and Zebra.",
  openGraph: {
    title: "Compact Desktop Label Printers | LogiQ-On Tech",
    description:
      "Explore desktop barcode and label printers from top manufacturers. Specified for Australian businesses with direct thermal and thermal transfer options.",
    url: "https://logiqon.com.au/products/label-printing/desktop-printers",
    type: "website",
  },
};

export default function DesktopPrintersPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-grid">
          <div>
            <span className="eyebrow">Label Printing &middot; Hardware Category</span>
            <h1>Compact Desktop Label Printers</h1>
            <p className="lede">
              High-performance direct thermal and thermal transfer desktop printers from Bixolon, Honeywell, and Zebra. Compact footprints, high label throughput, and seamless connectivity specified for your operational environment.
            </p>
          </div>
          <HeroArt variant="products" className="page-hero-art" />
        </div>
      </section>

      <Suspense fallback={<div className="container" style={{ padding: "40px 0" }}>Loading printer catalog...</div>}>
        <DesktopPrintersClient />
      </Suspense>
    </>
  );
}
