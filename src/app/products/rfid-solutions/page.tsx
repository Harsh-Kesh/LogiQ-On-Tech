import type { Metadata } from "next";
import Link from "next/link";
import ProductGrid from "@/components/products/ProductGrid";
import { RFID_PRODUCTS } from "@/lib/data/rfid-products";
import { getAssetPath } from "@/lib/nav";

export const metadata: Metadata = {
  title: "RFID Solutions",
  description:
    "Fixed and mobile RFID readers, RFID printers, and tags from Zebra and Honeywell for item-level inventory visibility across Australian retail and warehouse operations.",
};

export default function RfidSolutionsPage() {
  return (
    <div>
      <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-950 pt-36 pb-16 w-full">
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url('${getAssetPath("/images/products/rfid/zebra-atr7000.jpg")}')` }}
          />
          <div className="absolute inset-0 bg-on-background/90" />
        </div>
        <div className="container mx-auto px-margin-desktop relative z-10">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 bg-primary text-on-primary text-label-sm font-label-sm mb-6 rounded-sm tracking-widest uppercase">
              Hardware Category
            </span>
            <h1 className="text-display-lg font-display-lg text-white mb-4 leading-tight">RFID Solutions</h1>
            <p className="text-body-lg text-surface-variant max-w-xl">
              Mobile and fixed RFID readers, printers, and tags for item-level visibility end to end.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-margin-desktop">
        <div className="max-w-7xl mx-auto">
          <nav aria-label="Breadcrumb" className="text-body-sm text-on-surface-variant mb-10">
            <Link href="/" className="hover:text-primary">Home</Link> <span className="mx-1">&rsaquo;</span>
            <Link href="/products" className="hover:text-primary">Products</Link> <span className="mx-1">&rsaquo;</span>
            <span className="text-on-background font-bold">RFID Solutions</span>
          </nav>
          <ProductGrid products={RFID_PRODUCTS} />
        </div>
      </section>
    </div>
  );
}
