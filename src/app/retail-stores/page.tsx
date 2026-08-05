import type { Metadata } from "next";
import Link from "next/link";
import GsapSection from "@/components/GsapSection";
import { getAssetPath } from "@/lib/nav";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import { TextAnimate } from "@/components/ui/text-animate";

export const metadata: Metadata = {
  title: "Retail Stores",
  description: "Retail technology and store solutions from LogiQ-On.",
};

const STATS = [
  { value: "99.9%", label: "Pricing Accuracy", icon: "price_check" },
  { value: "45%", label: "Efficiency Gain", icon: "trending_up" },
  { value: "2.4x", label: "Inventory Turn", icon: "sync" },
  { value: "100+", label: "Global Markets", icon: "public" },
];

const CAPABILITIES = [
  {
    num: "01",
    tag: "Dynamic Pricing",
    title: "Electronic Shelf Labels",
    desc: "Real-time price updates across thousands of SKUs — omnichannel consistency without a single paper ticket.",
    icon: "sell",
    image: "/images/stitch/c73a18ac711f.png",
    href: "/products/digital-signage",
  },
  {
    num: "02",
    tag: "Engagement",
    title: "Interactive Displays",
    desc: "Immersive touchpoints for product discovery, inventory lookup, and endless-aisle shopping journeys.",
    icon: "touch_app",
    image: "/images/stitch/ad72f7bcdad0.png",
    href: "/products/digital-signage",
  },
  {
    num: "03",
    tag: "Fulfilment",
    title: "gStore by GreyOrange",
    desc: "Retail execution that maximises store throughput — picking, packing, and sorting on the store floor.",
    icon: "inventory_2",
    image: "/images/stitch/a447b5774518.png",
    href: "/solutions/retail-rfid-solutions/gstore-greyorange",
  },
  {
    num: "04",
    tag: "Analytics",
    title: "Store Intelligence Hub",
    desc: "ESL, heatmap, and POS data aggregated into one live view of how each store is actually performing.",
    icon: "monitoring",
    image: "/images/stitch/2ffab7970a28.png",
    href: "/solutions",
  },
];

const HUMAN_BENEFITS = [
  {
    title: "Accelerated Fulfilment",
    desc: "gStore integration cuts associate walk-times by 30% through optimised picking routes.",
    icon: "speed",
    badge: "Optimized",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    stat: "-30%",
    statLabel: "Walk Time",
  },
  {
    title: "Precise Stock Visibility",
    desc: "Real-time SKU tracking makes 'out of stock' a relic. Staff always know what's on the shelf.",
    icon: "inventory",
    badge: "Live",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    stat: ">99%",
    statLabel: "Stock Accuracy",
  },
  {
    title: "Fewer Manual Tasks",
    desc: "Automating price labelling and manual counts frees your team to spend their shift with customers.",
    icon: "handshake",
    badge: "Upgrading",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    stat: "10 yr",
    statLabel: "Label Battery",
  },
];

export default function RetailStoresPage() {
  return (
    <div>
      <PageHero
        eyebrow="Future-Ready Commerce"
        title={
          <>
            Digital Orchestration
            <br />
            for the Modern Storefront
          </>
        }
        lede="Transforming brick-and-mortar locations into data-driven, hyper-efficient fulfilment hubs with industrial-grade reliability and seamless customer journeys."
        image="/images/pexels/retail-store-aisle.jpg"
        imageAlt="Modern retail store aisle with electronic shelf labelling"
      />

      <GsapSection id="retail-stats" className="bg-white py-14 border-y border-slate-200" fullScreen={false}>
        <div className="container mx-auto px-margin-desktop">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="gsap-animate rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 text-slate-900">
                  <span className="material-symbols-outlined text-[24px] text-slate-900">{stat.icon}</span>
                </div>
                <div className="text-4xl md:text-5xl font-extrabold text-slate-950 tracking-tight leading-none">
                  {stat.value}
                </div>
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mt-4">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </GsapSection>

      <GsapSection id="retail-header" className="bg-surface" fullScreen>
        <div className="container mx-auto px-margin-desktop flex flex-col items-center justify-center text-center">
          <SectionIntro
            eyebrow="In-store technology"
            title="Precision Retail Ecosystem"
            lede="We bridge the gap between physical shelves and digital backends, giving store operators real-time visibility and dynamic control over every location."
            ledeWidth="5xl"
          />
        </div>
      </GsapSection>

      <GsapSection
        id="retail-cards"
        className="bg-surface border-t border-slate-100"
        fullScreen
        scrub={false}
        start="top 92%"
        stagger={0.06}
        duration={0.45}
      >
        <div className="container mx-auto px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="gsap-animate group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
              >
                <div>
                  <div className="relative h-48 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={cap.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      src={getAssetPath(cap.image)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {cap.num}
                    </span>
                    <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                      <span className="material-symbols-outlined text-base text-slate-950 font-bold">{cap.icon}</span>
                    </div>
                  </div>
                  <div className="p-6 pb-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">
                      {cap.tag}
                    </span>
                    <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">{cap.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">{cap.desc}</p>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-0">
                  <Link
                    href={cap.href}
                    className="w-fit flex items-center gap-2 text-xs font-bold text-slate-950 hover:text-indigo-600 transition-colors"
                  >
                    Explore
                    <span className="w-7 h-7 rounded-full bg-white text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">
                      <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GsapSection>

      <GsapSection
        id="human-element"
        className="bg-surface-container-low border-y border-outline-variant/30"
        fullScreen
      >
        <div className="container mx-auto px-margin-desktop">
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="gsap-animate max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-3 tracking-tight">
                Enhancing the Human Element
              </h2>
              <p className="text-base text-slate-600">
                Technology shouldn&apos;t replace the store experience — it should give your staff their shift back.
              </p>
            </div>
            <Link
              href="/request-demo"
              className="gsap-animate flex items-center gap-2 text-sm font-bold text-slate-950 hover:text-indigo-600 transition-colors"
            >
              See It In A Store <span className="material-symbols-outlined text-base">arrow_outward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HUMAN_BENEFITS.map((item) => (
              <div
                key={item.title}
                className="gsap-animate group flex flex-col bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-7">
                  <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl text-white">{item.icon}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${item.badgeClass}`}
                  >
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-950 leading-snug mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-7">{item.desc}</p>
                <div className="mt-auto">
                  <div className="text-4xl font-extrabold text-slate-950 leading-none tracking-tight">{item.stat}</div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                    {item.statLabel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GsapSection>

      <GsapSection id="retail-cta" className="bg-surface border-t border-slate-100" fullScreen>
        <div className="container mx-auto px-margin-desktop max-w-3xl text-center flex flex-col items-center justify-center">
          <TextAnimate
            by="word"
            animation="wavy"
            as="h2"
            startOnView
            once={false}
            duration={0.3}
            className="text-4xl md:text-5xl font-extrabold text-slate-950 mb-6 text-center tracking-tight leading-tight"
          >
            Ready to modernize your retail operation?
          </TextAnimate>
          <TextAnimate
            by="word"
            animation="wavy"
            as="p"
            startOnView
            once={false}
            delay={0.05}
            duration={0.35}
            className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-xl mx-auto text-center font-normal mt-4 mb-10 block"
          >
            LogiQ-On brings the industrial precision that a digital-first retail floor needs — from shelf edge to back-of-house.
          </TextAnimate>
          <Link
            href="/contact"
            className="gsap-animate inline-block bg-slate-950 hover:bg-slate-800 text-white font-bold text-base px-9 py-4 rounded-full shadow-md transition-all duration-300 hover:scale-105 mt-12"
            style={{ color: "#ffffff" }}
          >
            Schedule a Consultation
          </Link>
        </div>
      </GsapSection>
    </div>
  );
}
