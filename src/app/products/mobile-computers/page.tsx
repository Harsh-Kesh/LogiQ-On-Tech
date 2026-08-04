import type { Metadata } from "next";
import Link from "next/link";
import ProductGrid from "@/components/products/ProductGrid";
import { MOBILE_COMPUTERS } from "@/lib/data/mobile-computers";
import { getAssetPath } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Rugged Mobile Computers",
  description:
    "Rugged handhelds, tablets, and wearable computers from Honeywell, CipherLab, and Zebra for warehouse, transport, and field operations across Australia.",
};

export default function MobileComputersPage() {
  return (
    <div>
      <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-950 pt-36 pb-16 w-full">
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url('${getAssetPath("/images/stitch/8e6fd312e52b.png")}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/65 to-slate-950/30" />
        </div>
        <div className="container mx-auto px-margin-desktop relative z-10">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 bg-primary text-on-primary text-label-sm font-label-sm mb-6 rounded-sm tracking-widest uppercase">
              Hardware Category
            </span>
            <h1 className="text-display-lg font-display-lg text-white mb-4 leading-tight">Rugged Mobile Computers</h1>
            <p className="text-body-lg text-surface-variant max-w-xl">
              Rugged handhelds, wearables, and tablets built for the floor, not the office.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-margin-desktop">
        <div className="max-w-7xl mx-auto">
          <nav aria-label="Breadcrumb" className="text-body-sm text-on-surface-variant mb-10">
            <Link href="/" className="hover:text-primary">Home</Link> <span className="mx-1">&rsaquo;</span>
            <Link href="/products" className="hover:text-primary">Products</Link> <span className="mx-1">&rsaquo;</span>
            <span className="text-on-background font-bold">Mobile Computers</span>
          </nav>
          <ProductGrid products={MOBILE_COMPUTERS} />
        </div>
      </section>
    </div>
  );
}
