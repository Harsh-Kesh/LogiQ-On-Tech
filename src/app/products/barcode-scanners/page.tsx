import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ProductGrid from "@/components/products/ProductGrid";
import { BARCODE_SCANNERS } from "@/lib/data/barcode-scanners";
import { getAssetPath } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Barcode Scanners",
  description:
    "General purpose, rugged, fixed-mount, and portable barcode scanners from Zebra, CipherLab, and Denso — specified for Australian retail, warehouse, and logistics operations.",
};

export default function BarcodeScannersPage() {
  return (
    <div>
      <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-950 pt-36 pb-16 w-full">
        <div className="absolute inset-0 z-0">
          <Image
            src={getAssetPath("/images/pexels/products-barcode-scan.jpg")}
            alt="Barcode Scanners"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/65 to-slate-950/30 pointer-events-none" />
        </div>
        <div className="container mx-auto px-margin-desktop relative z-10">
          <div className="max-w-2xl">
            <span
              className="inline-block px-4 py-1.5 bg-white/20 border border-white/40 text-white text-xs font-bold mb-6 rounded-full tracking-widest uppercase backdrop-blur-md"
              style={{ color: "#ffffff" }}
            >
              Hardware Category
            </span>
            <h1
              className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight drop-shadow-xl tracking-tight"
              style={{ color: "#ffffff" }}
            >
              Barcode Scanners
            </h1>
            <p
              className="text-lg text-white/90 max-w-xl font-medium leading-relaxed drop-shadow-md"
              style={{ color: "rgba(255, 255, 255, 0.9)" }}
            >
              General purpose, rugged, fixed-mount, and portable scanning for any read distance and environment.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-margin-desktop">
        <div className="max-w-7xl mx-auto">
          <nav aria-label="Breadcrumb" className="text-body-sm text-on-surface-variant mb-10">
            <Link href="/" className="hover:text-primary">Home</Link> <span className="mx-1">&rsaquo;</span>
            <Link href="/products" className="hover:text-primary">Products</Link> <span className="mx-1">&rsaquo;</span>
            <span className="text-on-background font-bold">Barcode Scanners</span>
          </nav>
          <ProductGrid products={BARCODE_SCANNERS} />
        </div>
      </section>
    </div>
  );
}
