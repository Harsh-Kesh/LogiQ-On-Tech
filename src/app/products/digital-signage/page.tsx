import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Digital Display Solutions",
  description:
    "Interactive displays, wireless collaboration, digital signage, and mounting solutions from LogiQ-On for retail, corporate, and hospitality environments.",
};

const CATEGORIES = [
  {
    title: "Smart Signage Series",
    desc: "Commercial-grade digital signage displays for storefronts, menu boards, and wayfinding.",
    image: "/images/products/digital-signage/smart-signage-series.jpg",
  },
  {
    title: "Super Narrow Bezel Series",
    desc: "Seamless video wall displays with ultra-thin bezels for control rooms and immersive retail experiences.",
    image: "/images/products/digital-signage/super-narrow-bezel.jpg",
  },
  {
    title: "Smart Projectors",
    desc: "Wireless, cable-free projection for meeting rooms and collaborative spaces.",
    image: "/images/products/digital-signage/smart-projectors.jpg",
  },
  {
    title: "BenQ InstaShow WDC10",
    desc: "One-touch wireless presentation system for fast, cable-free screen sharing in meeting rooms.",
    image: "/images/products/digital-signage/benq-wdc10.jpg",
  },
  {
    title: "BenQ InstaShow WDC20",
    desc: "Enterprise wireless collaboration with multi-user sharing and centralised device management.",
    image: "/images/products/digital-signage/benq-wdc20.jpg",
  },
  {
    title: "Mounting & Display Stands",
    desc: "Wall mounts, ceiling mounts, and mobile carts engineered for secure, professional display installs.",
    image: "/images/products/digital-signage/wall-mounts.jpg",
  },
];

export default function DigitalSignagePage() {
  return (
    <div>
      <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-950 pt-36 pb-16 w-full">
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url('${getAssetPath("/images/products/digital-signage/smart-signage-series.jpg")}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/65 to-slate-950/30" />
        </div>
        <div className="container mx-auto px-margin-desktop relative z-10">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 bg-primary text-on-primary text-label-sm font-label-sm mb-6 rounded-sm tracking-widest uppercase">
              Hardware Category
            </span>
            <h1 className="text-display-lg font-display-lg text-white mb-4 leading-tight">Digital Display Solutions</h1>
            <p className="text-body-lg text-surface-variant max-w-xl">
              Interactive displays, wireless collaboration, digital signage, and projectors.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-margin-desktop">
        <div className="max-w-7xl mx-auto">
          <nav aria-label="Breadcrumb" className="text-body-sm text-on-surface-variant mb-10">
            <Link href="/" className="hover:text-primary">Home</Link> <span className="mx-1">&rsaquo;</span>
            <Link href="/products" className="hover:text-primary">Products</Link> <span className="mx-1">&rsaquo;</span>
            <span className="text-on-background font-bold">Digital Display Solutions</span>
          </nav>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((c) => (
              <div key={c.title} className="bg-white border border-outline-variant rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all">
                <div className="relative h-44">
                  <Image src={getAssetPath(c.image)} alt={c.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="text-headline-sm font-headline-sm text-on-background mb-2">{c.title}</h3>
                  <p className="text-body-sm text-on-surface-variant mb-4">{c.desc}</p>
                  <Link href="/request-quote" className="text-label-sm font-bold text-primary flex items-center gap-1 w-fit hover:gap-2 transition-all">
                    Request a Quote <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
