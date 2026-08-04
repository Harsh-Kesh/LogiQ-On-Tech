import type { Metadata } from "next";
import Link from "next/link";
import GsapSection from "@/components/GsapSection";
import { getAssetPath } from "@/lib/nav";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import { TextAnimate } from "@/components/ui/text-animate";

export const metadata: Metadata = {
  title: "Industries & Solutions",
  description: "Industry-specific supply chain and retail technology solutions from LogiQ-On.",
};

const SECTORS = [
  {
    num: "01",
    tag: "Fulfilment",
    title: "Warehousing",
    desc: "Real-time inventory precision through connected IoT arrays and automated fulfilment pathways.",
    icon: "warehouse",
    image: "/images/stitch/a96da3303d3c.png",
  },
  {
    num: "02",
    tag: "Distribution",
    title: "Logistics",
    desc: "End-to-end fleet tracking and predictive route optimisation across national corridors.",
    icon: "local_shipping",
    image: "/images/stitch/7fe79810162c.png",
  },
  {
    num: "03",
    tag: "Storefront",
    title: "Retail",
    desc: "Omnichannel inventory synchronisation bridging digital carts and physical shelves.",
    icon: "storefront",
    image: "/images/stitch/83668c91854a.png",
  },
  {
    num: "04",
    tag: "Production",
    title: "Manufacturing",
    desc: "Industry 4.0 infrastructure supporting high-uptime production lines and automated quality inspection.",
    icon: "precision_manufacturing",
    image: "/images/stitch/f6dfc18a68c6.png",
  },
];

const ECOSYSTEM = [
  {
    title: "Bespoke Automation",
    desc: "Custom robotics and PLC integration designed for unique facility layouts, eliminating bottlenecks with software-defined throughput.",
    icon: "precision_manufacturing",
    badge: "Optimized",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    points: ["Robotic Sortation Systems", "Autonomous Forklift Integration"],
    href: "/solutions",
  },
  {
    title: "Wireless Infrastructure",
    desc: "Private 5G and mesh networking for high-density metallic environments, with zero-latency links for thousands of IoT endpoints.",
    icon: "wifi_tethering",
    badge: "Scaling",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    points: ["Sub-10ms Latency Networks", "Ruggedized Access Points"],
    href: "/products/wireless-solutions",
  },
  {
    title: "Tracking & Visibility",
    desc: "Hyper-accurate RFID and UWB positioning systems that locate any asset within a 10cm margin of error, in real time.",
    icon: "analytics",
    badge: "Deployed",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    points: ["Global Satellite Tracking", "Inventory Predictive Modeling"],
    href: "/products/rfid-solutions",
  },
];

const STATS = [
  { value: "99.9%", label: "Network Uptime", icon: "signal_cellular_alt" },
  { value: "40%", label: "OPEX Reduction", icon: "trending_down" },
  { value: "12ms", label: "Global Latency", icon: "bolt" },
  { value: "500+", label: "Enterprise Clients", icon: "domain" },
];

export default function IndustriesPage() {
  return (
    <div>
      <PageHero
        eyebrow="Industrial Precision"
        title={
          <>
            Optimizing Supply Chains
            <br />
            With High-Density Logistics
          </>
        }
        lede="LogiQ-On delivers enterprise-grade infrastructure and bespoke automation for the most complex industrial environments — from autonomous warehousing to real-time retail visibility."
        image="/images/pexels/industries-cold-chain-dock.jpg"
        imageAlt="Cold chain loading dock with temperature-controlled freight"
      />

      <GsapSection id="sectors-header" className="bg-surface" fullScreen>
        <div className="container mx-auto px-margin-desktop flex flex-col items-center justify-center text-center">
          <SectionIntro
            eyebrow="Where we work"
            title="Sectors We Empower"
            lede="Our technology is built for the rigours of mission-critical operations. We specialise in four core sectors where precision and reliability are non-negotiable."
            ledeWidth="5xl"
          />
        </div>
      </GsapSection>

      <GsapSection
        id="sectors-cards"
        className="bg-surface border-t border-slate-100"
        fullScreen
        scrub={false}
        start="top 92%"
        stagger={0.06}
        duration={0.45}
      >
        <div className="container mx-auto px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SECTORS.map((sector) => (
              <div
                key={sector.title}
                className="gsap-animate group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
              >
                <div>
                  <div className="relative h-48 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={sector.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      src={getAssetPath(sector.image)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {sector.num}
                    </span>
                    <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                      <span className="material-symbols-outlined text-base text-slate-950 font-bold">
                        {sector.icon}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 pb-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">
                      {sector.tag}
                    </span>
                    <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">
                      {sector.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">{sector.desc}</p>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-0">
                  <Link
                    href="/solutions"
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
        id="ecosystem"
        className="bg-surface-container-low border-y border-outline-variant/30"
        fullScreen
      >
        <div className="container mx-auto px-margin-desktop">
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="gsap-animate">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-3 tracking-tight">
                Industrial Solutions Ecosystem
              </h2>
              <p className="text-base text-slate-600">Three capability stacks, deployed together or on their own.</p>
            </div>
            <Link
              href="/solutions"
              className="gsap-animate flex items-center gap-2 text-sm font-bold text-slate-950 hover:text-indigo-600 transition-colors"
            >
              View All Solutions <span className="material-symbols-outlined text-base">arrow_outward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ECOSYSTEM.map((item) => (
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
                <ul className="space-y-3 mb-7">
                  {item.points.map((point) => (
                    <li key={point} className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="material-symbols-outlined text-indigo-600 text-[18px]">check_circle</span>
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto border-t border-slate-200 pt-4">
                  <Link
                    href={item.href}
                    className="text-sm font-bold text-slate-950 flex items-center gap-2 group-hover:text-indigo-600 transition-colors"
                  >
                    Technical Specs <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GsapSection>

      <GsapSection id="industry-stats" className="bg-white py-14 border-y border-slate-200" fullScreen={false}>
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

      <GsapSection id="industries-cta" className="bg-surface border-t border-slate-100" fullScreen>
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
            Built for your sector, not a template.
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
            Tell us how your operation runs today and we&apos;ll map the scanning, RFID, and wireless coverage it actually needs.
          </TextAnimate>
          <Link
            href="/contact"
            className="gsap-animate inline-block bg-slate-950 hover:bg-slate-800 text-white font-bold text-base px-9 py-4 rounded-full shadow-md transition-all duration-300 hover:scale-105 mt-12"
            style={{ color: "#ffffff" }}
          >
            Contact Us
          </Link>
        </div>
      </GsapSection>
    </div>
  );
}
