import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Wireless Solutions",
  description:
    "Site surveys and wireless infrastructure hardware engineered for warehouse conditions — Cambium, Ruckus, and Extreme partnerships from LogiQ-On.",
};

const FEATURES = [
  {
    title: "Predictive Site Surveys",
    desc: "RF heatmapping and spectrum analysis before a single access point is installed, so coverage is right the first time.",
    image: "/images/products/wireless/site-survey.png",
  },
  {
    title: "Access Point Design",
    desc: "High-density access point placement engineered for racking, concrete, and metal shelving interference.",
    image: "/images/products/wireless/access-points.png",
  },
  {
    title: "Wireless Site Survey Services",
    desc: "End-to-end survey, design, and validation services delivered by our own field engineers, Australia-wide.",
    image: "/images/products/wireless/site-survey-services.jpg",
  },
];

export default function WirelessSolutionsPage() {
  return (
    <div>
      <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-950 pt-36 pb-16 w-full">
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url('${getAssetPath("/images/products/wireless/wireless-hardware.jpg")}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/65 to-slate-950/30" />
        </div>
        <div className="container mx-auto px-margin-desktop relative z-10">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 bg-primary text-on-primary text-label-sm font-label-sm mb-6 rounded-sm tracking-widest uppercase">
              Hardware Category
            </span>
            <h1 className="text-display-lg font-display-lg text-white mb-4 leading-tight">Wireless Solutions</h1>
            <p className="text-body-lg text-surface-variant max-w-xl">
              Site surveys and wireless infrastructure hardware engineered for warehouse conditions.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-margin-desktop">
        <div className="max-w-7xl mx-auto">
          <nav aria-label="Breadcrumb" className="text-body-sm text-on-surface-variant mb-10">
            <Link href="/" className="hover:text-primary">Home</Link> <span className="mx-1">&rsaquo;</span>
            <Link href="/products" className="hover:text-primary">Products</Link> <span className="mx-1">&rsaquo;</span>
            <span className="text-on-background font-bold">Wireless Solutions</span>
          </nav>

          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-outline-variant rounded-2xl overflow-hidden">
                <div className="relative h-48">
                  <Image src={getAssetPath(f.image)} alt={f.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="text-headline-sm font-headline-sm text-on-background mb-2">{f.title}</h3>
                  <p className="text-body-sm text-on-surface-variant">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-widest">Strategic Partners:</span>
            {["Cambium Networks", "Ruckus", "Extreme Networks"].map((p) => (
              <span key={p} className="px-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-label-sm font-bold text-on-background">
                {p}
              </span>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/request-quote"
              className="inline-block bg-primary text-on-primary px-8 py-4 rounded-lg font-headline-sm text-headline-sm hover:shadow-lg hover:shadow-primary/20 transition-all"
            >
              Book a Site Survey
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
