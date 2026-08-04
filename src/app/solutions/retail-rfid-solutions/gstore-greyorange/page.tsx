import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";

export const metadata: Metadata = {
  title: "gStore Retail RFID Solutions | GreyOrange",
  description:
    "Streamline your retail operations with gStore RFID by GreyOrange. Smarter inventory, real-time tracking & faster fulfilment across Australian retail stores.",
};

const AI_POINTS = [
  {
    title: "AI-powered decisioning",
    desc: "Smart tasking and intelligent replenishment that keep shelves full, associates focused and sales climbing.",
    icon: "psychology",
  },
  {
    title: "Real-time optimization",
    desc: "Always-on visibility and pick-pathing to ensure on-time fulfilment and smooth store execution.",
    icon: "bolt",
  },
  {
    title: "Human and digital orchestration",
    desc: "Virtual store associates and digital stylists for real-time clienteling that elevates the customer experience.",
    icon: "diversity_3",
  },
];

const FEATURE_ROWS = [
  {
    stat: ">99%",
    title: "Inventory accuracy with real-time visibility",
    desc: "gStore doesn't just show what you have. Store maps pinpoint exactly where it is, down to the aisle and shelf.",
    video: "/images/gstore/videos/visibility-mobile.mp4",
  },
  {
    stat: "40%",
    title: "Boost in on-floor availability with intelligent replenishment",
    desc: "Inventory that thinks for itself. gStore uses real-time shelf data and threshold-based task triggers to alert associates before stock runs out.",
    video: "/images/gstore/videos/replenishment-mobile.mp4",
  },
  {
    stat: "2x",
    title: "Associate productivity",
    desc: "Give your team a mobile app that matches their pace. With guided pick/stock paths and live inventory updates, gStore turns every associate into a sales expert.",
    video: "/images/gstore/videos/tasks-mobile.mp4",
  },
  {
    stat: "50%",
    title: "Fewer cancellations with accurate omnichannel fulfilment",
    desc: "From BOPIS to ship-from-store, gStore orchestrates fulfilment tasks to ensure orders are picked fast and delivered on time.",
    video: "/images/gstore/videos/bopis-mobile.mp4",
  },
];

const INSIGHT_PILLS = [
  "AI-driven recommendations",
  "Drill-down analytics from country to store level",
  "Compliance alerts",
  "Stock management analytics",
  "Visual merchandising insights",
];

const MANAGER_PILLS = [
  "Shop floor compliance",
  "Customer walk-in overview",
  "Live inventory view and heatmaps",
  "Task allocation and workforce insights",
  "AI-driven merchandising",
];

const ENTERPRISE_FEATURES = [
  {
    title: "Hybrid overhead + handheld RFID",
    desc: "gStore is the only platform to support both types of RFID for unmatched accuracy and operational flexibility in a single store.",
    image: "/images/gstore/feature-hybrid-rfid.webp",
  },
  {
    title: "Modular, scalable and hardware-agnostic",
    desc: "Deploy across regions, formats or tech maturity levels. Works in RFID and non-RFID environments, integrating seamlessly with POS, ERP and OMS systems.",
    image: "/images/gstore/feature-modular-scalable.jpg",
  },
  {
    title: "Rapid deployment, instant adoption",
    desc: "Go live in less than 4 weeks. Train associates in 1 hour with a mobile-first design and one-click actions. Scale on your schedule and connect hundreds of stores without disruption.",
    image: "/images/gstore/feature-rapid-deployment.jpg",
  },
];

const STATS = [
  { value: "99%", image: "/images/gstore/stat-99.png", caption: "inventory accuracy across 200+ stores for a leading specialty retailer" },
  { value: "20%", image: "/images/gstore/stat-20.png", caption: "sales uplift just weeks after go-live at a global fashion brand's flagship store" },
  { value: "45%", image: "/images/gstore/stat-45.png", caption: "immediate boost in operational productivity for a top U.S. retailer" },
];

const RESOURCES = [
  { tag: "Blog", title: "The Retail Revolution: What will shopping look like in 2030?" },
  { tag: "Customer Story", title: "Fabletics drives 20% sales lift with 97% on-floor availability" },
  { tag: "Podcast", title: "Omni Talk Podcast: How RFID & GreyOrange's gStore Are Transforming Retail" },
];

export default function GstoreGreyOrangePage() {
  return (
    <div className="pt-top-nav-height bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-on-background py-24 px-margin-desktop">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <Image
              src={getAssetPath("/images/gstore/greyorange-logo-white.png")}
              alt="GreyOrange"
              width={180}
              height={40}
              className="mb-8 opacity-90"
              style={{ width: "auto", height: 32 }}
            />
            <span className="text-primary-fixed-dim font-label-md tracking-wider uppercase mb-4 block">Meet gStore</span>
            <h1 className="text-display-lg font-display-lg text-white leading-tight mb-6">
              Your inventory is about to get way more <span className="text-primary-fixed-dim">intelligent.</span>
            </h1>
            <p className="text-body-lg text-white/70 max-w-xl mb-8">
              The unified retail SaaS app that makes inventory self-aware and RFID-enabled stores autonomous.
            </p>
            <Link href="/request-demo" className="inline-block bg-primary text-on-primary px-8 py-4 rounded-lg font-headline-sm text-headline-sm hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
              Request a Demo
            </Link>
          </div>
          <div className="relative flex justify-center">
            <Image
              src={getAssetPath("/images/gstore/phone-zoom.png")}
              alt="gStore mobile app showing real-time inventory"
              width={420}
              height={560}
              className="w-full max-w-sm h-auto object-contain"
            />
          </div>
        </div>
      </section>

      {/* AI you can see */}
      <section className="py-24 px-margin-desktop bg-surface">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-headline-lg font-headline-lg text-on-background mb-2">This is the AI you can see.</h2>
            <p className="text-headline-sm font-headline-sm text-primary mb-6">This is hyper-intelligent inventory with gStore.</p>
            <p className="text-body-md text-on-surface-variant mb-8">
              Built by GreyOrange, the global leader in AI-driven warehouse orchestration, gStore enables:
            </p>
            <div className="space-y-6">
              {AI_POINTS.map((p) => (
                <div key={p.title} className="flex gap-4">
                  <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined">{p.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-headline-sm font-headline-sm text-on-background mb-1">{p.title}</h3>
                    <p className="text-body-sm text-on-surface-variant">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-outline-variant bg-white p-8 flex items-center justify-center">
            <Image
              src={getAssetPath("/images/gstore/collection.png")}
              alt="gStore inventory collection view"
              width={480}
              height={480}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </section>

      {/* Feature rows */}
      <section className="py-24 px-margin-desktop bg-surface-container-low border-y border-outline-variant/30">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <h2 className="text-headline-lg font-headline-lg text-on-background mb-4">What happens when your store runs on gStore</h2>
            <p className="text-body-md text-on-surface-variant">
              Real-time inventory data, guided workflows and AI-powered recommendations come together to change how work
              gets done on the sales floor.
            </p>
          </div>
          <div className="grid gap-16">
            {FEATURE_ROWS.map((row, i) => (
              <div
                key={row.title}
                className={`grid md:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
              >
                <div className="relative rounded-2xl overflow-hidden border border-outline-variant bg-on-background aspect-[9/16] max-w-[260px] mx-auto">
                  <video
                    src={getAssetPath(row.video)}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-display-lg font-display-lg text-primary mb-2">{row.stat}</div>
                  <h3 className="text-headline-md font-headline-md text-on-background mb-3">{row.title}</h3>
                  <p className="text-body-md text-on-surface-variant">{row.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Insights row */}
      <section className="relative py-24 px-margin-desktop overflow-hidden bg-on-background">
        <video
          src={getAssetPath("/images/gstore/videos/insights-bg.mp4")}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-on-background via-on-background/90 to-on-background/60" />
        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="text-headline-lg font-headline-lg text-white mb-3">40% lift in sales per associate with actionable insights</h2>
          <p className="text-body-md text-white/70 mb-8 max-w-xl">
            gStore gives you the store&apos;s &ldquo;pulse&rdquo; in real time, from sales to compliance to merchandising.
          </p>
          <div className="flex flex-wrap gap-3">
            {INSIGHT_PILLS.map((p) => (
              <span key={p} className="px-4 py-2 bg-white/10 backdrop-blur border border-white/20 text-white text-label-sm rounded-full">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Manager view row */}
      <section className="relative py-24 px-margin-desktop overflow-hidden bg-on-background">
        <video
          src={getAssetPath("/images/gstore/videos/manager-view-bg.mp4")}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-on-background via-on-background/90 to-on-background/60" />
        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="text-headline-lg font-headline-lg text-white mb-3">360&deg; real-time view for store managers</h2>
          <p className="text-body-md text-white/70 mb-8 max-w-xl">
            From customers to inventory to associates, managers know exactly what&apos;s going on where.
          </p>
          <div className="flex flex-wrap gap-3">
            {MANAGER_PILLS.map((p) => (
              <span key={p} className="px-4 py-2 bg-white/10 backdrop-blur border border-white/20 text-white text-label-sm rounded-full">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise-grade */}
      <section className="py-24 px-margin-desktop bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <h2 className="text-headline-lg font-headline-lg text-on-background mb-4">Enterprise-grade and store-ready by design</h2>
            <p className="text-body-md text-on-surface-variant">
              Real-time inventory data, guided workflows and AI-powered recommendations come together to change how work
              gets done on the sales floor.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {ENTERPRISE_FEATURES.map((f) => (
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
        </div>
      </section>

      {/* YouTube embed */}
      <section className="px-margin-desktop py-16 bg-surface-container-low">
        <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden border border-outline-variant aspect-video">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/-uJI-yQG3Ow"
            title="gStore by GreyOrange"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      {/* Proven performance stats */}
      <section className="py-24 px-margin-desktop bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <span className="text-primary font-label-md tracking-wider uppercase mb-4 block">Proven performance</span>
            <h2 className="text-headline-lg font-headline-lg text-on-background">Results retailers can see on day one.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {STATS.map((s) => (
              <div key={s.value} className="bg-white border border-outline-variant rounded-2xl p-8">
                <div className="text-display-lg font-display-lg text-primary mb-4">{s.value}</div>
                <p className="text-body-sm text-on-surface-variant">{s.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 px-margin-desktop bg-surface-container-low border-y border-outline-variant/30">
        <div className="max-w-3xl mx-auto text-center">
          <Image
            src={getAssetPath("/images/gstore/fabletics-logo.png")}
            alt="Fabletics"
            width={160}
            height={48}
            className="mx-auto mb-8 opacity-80"
            style={{ width: "auto", height: 32 }}
          />
          <p className="text-headline-sm font-headline-sm text-on-background leading-relaxed mb-6">
            &ldquo;Our teams instantly know what&apos;s missing, and where, so we always have the right stock in the right
            place to generate the most sales. It all adds up to smoother operations and a better customer
            experience.&rdquo;
          </p>
          <p className="text-body-sm text-on-surface-variant font-bold">Ron Harries, Senior Vice President, Head of Retail</p>
        </div>
      </section>

      {/* Resources */}
      <section className="py-24 px-margin-desktop bg-surface">
        <div className="max-w-7xl mx-auto">
          <span className="text-primary font-label-md tracking-wider uppercase mb-8 block text-center">Resources</span>
          <div className="grid md:grid-cols-3 gap-6">
            {RESOURCES.map((r) => (
              <div key={r.title} className="bg-white border border-outline-variant rounded-2xl p-6 hover:border-primary/40 transition-colors">
                <span className="text-label-sm font-bold text-primary uppercase tracking-widest block mb-3">{r.tag}</span>
                <h3 className="text-headline-sm font-headline-sm text-on-background">{r.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-margin-desktop bg-on-background">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-headline-lg font-headline-lg text-white mb-4">Make your inventory intelligent with gStore.</h2>
          <p className="text-body-md text-white/70 mb-10">
            Elevate the in-store experience and go live in less than 4 weeks.
          </p>
          <Link href="/request-demo" className="inline-block bg-primary text-on-primary px-8 py-4 rounded-lg font-headline-sm text-headline-sm hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
            Request a Demo
          </Link>
        </div>
      </section>
    </div>
  );
}
