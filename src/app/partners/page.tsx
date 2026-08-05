import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PARTNER_LOGOS } from "@/lib/data/partners";
import GsapSection from "@/components/GsapSection";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import { TextAnimate } from "@/components/ui/text-animate";
import { getAssetPath } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Partners",
  description: "Strategic technology partners behind LogiQ-On's hardware and software ecosystem.",
};

const ALLIANCES = [
  {
    num: "01",
    tag: "Integration",
    title: "Premier Integration",
    desc: "Deep-level API synchronisation between LogiQ-On software and partner hardware for zero-latency operations.",
    icon: "verified",
    points: ["Direct Firmware Support", "Certified Device Management"],
  },
  {
    num: "02",
    tag: "Support",
    title: "Unified Support",
    desc: "A single point of contact for both hardware and software troubleshooting, cutting downtime by up to 40%.",
    icon: "support_agent",
    points: ["24/7 Global NOC Access", "Expedited RMA Processing"],
  },
  {
    num: "03",
    tag: "R&D",
    title: "Co-Engineering",
    desc: "Joint R&D to develop custom ruggedised solutions built specifically for high-density warehouse environments.",
    icon: "precision_manufacturing",
    points: ["Early Access to Tech", "Custom Solution Lab"],
  },
];

const FEATURED = [
  {
    name: "Zebra Technologies",
    tier: "Elite Partner",
    category: "AIDC / Mobility",
    desc: "Global leader in barcoding and mobility. We're a certified integration partner across the full MC and TC series rugged range.",
    logo: "zebra_technologies-a1.png",
  },
  {
    name: "Honeywell",
    tier: "Strategic Tier",
    category: "Automation",
    desc: "Industrial automation and safety. We specialise in Honeywell's voice-directed picking systems and advanced sensing.",
    logo: "honeywell-a2.png",
  },
  {
    name: "Cambium Networks",
    tier: "Wireless Specialist",
    category: "Wireless Infrastructure",
    desc: "Multi-gigabit wireless fabric. We deploy Cambium for high-density outdoor yard coverage and point-to-point backhaul.",
    logo: "cambium_networks-a.png",
  },
  {
    name: "Ruckus Wireless",
    tier: "Enterprise Tier",
    category: "Indoor Networking",
    desc: "High-performance Wi-Fi for dense warehouses. BeamFlex+ keeps connectivity reliable through steel-heavy racking.",
    logo: "ruckus-a1.png",
  },
  {
    name: "Extreme Networks",
    tier: "Cloud-Driven",
    category: "Cloud Networking",
    desc: "Cloud-managed networking. We integrate ExtremeCloud IQ for remote-first management of multi-site operations.",
    logo: "extreme_networks-a.png",
  },
  {
    name: "GreyOrange",
    tier: "Retail Platform",
    category: "Retail Software",
    desc: "gStore turns RFID-enabled stores autonomous — unified inventory, fulfilment, and associate workflows in one app.",
    logo: "GreyOrange-logo-R.png",
  },
];

const REASONS = [
  {
    title: "99.9% Operational Uptime",
    desc: "Pre-validated hardware stacks mean zero configuration errors during deployment.",
    icon: "speed",
  },
  {
    title: "End-to-End Security",
    desc: "Deep integration allows hardware-level encryption management from a single dashboard.",
    icon: "security",
  },
  {
    title: "Advanced Telemetry",
    desc: "Direct access to battery health, signal strength, and device location across every partner brand.",
    icon: "query_stats",
  },
];

const STATS = [
  { value: "15+", label: "Year Alliances", icon: "handshake" },
  { value: "500k", label: "Devices Managed", icon: "devices" },
  { value: "100%", label: "QA Certified", icon: "verified" },
  { value: "24/7", label: "Support Relay", icon: "support_agent" },
];

export default function PartnersPage() {
  return (
    <div>
      <PageHero
        eyebrow="Ecosystem of Excellence"
        title={
          <>
            Precision Partners
            <br />
            for Global Supply Chains
          </>
        }
        lede="We collaborate with the world's most trusted technology providers to deliver industrial-grade reliability — bridging complex hardware and intelligent software orchestration."
        image="/images/pexels/partners-server-hardware.jpg"
        imageAlt="Enterprise network server hardware in a data centre rack"
      />

      <GsapSection id="alliances-header" className="bg-surface" fullScreen>
        <div className="container mx-auto px-margin-desktop flex flex-col items-center justify-center text-center">
          <SectionIntro
            eyebrow="How we partner"
            title="Strategic Alliances"
            lede="Unified support and specialised integration services across every core hardware and software partner in our network."
            ledeWidth="5xl"
          />
        </div>
      </GsapSection>

      <GsapSection
        id="alliances-cards"
        className="bg-surface border-t border-slate-100"
        fullScreen
        scrub={false}
        start="top 92%"
        stagger={0.06}
        duration={0.45}
      >
        <div className="container mx-auto px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ALLIANCES.map((item) => (
              <div
                key={item.title}
                className="gsap-animate group flex flex-col bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-7">
                  <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl text-white">{item.icon}</span>
                  </div>
                  <span className="text-3xl font-extrabold text-slate-200 leading-none tracking-tight">{item.num}</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">
                  {item.tag}
                </span>
                <h3 className="text-xl font-bold text-slate-950 leading-snug mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-7">{item.desc}</p>
                <ul className="mt-auto space-y-3 border-t border-slate-200 pt-5">
                  {item.points.map((point) => (
                    <li key={point} className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="material-symbols-outlined text-indigo-600 text-[18px]">check_circle</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </GsapSection>

      <GsapSection
        id="directory"
        className="bg-surface-container-low border-y border-outline-variant/30"
        fullScreen
      >
        <div className="container mx-auto px-margin-desktop">
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="gsap-animate">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-3 tracking-tight">
                Technology Directory
              </h2>
              <p className="text-base text-slate-600">World-class infrastructure for global operations.</p>
            </div>
            <Link
              href="/products"
              className="gsap-animate flex items-center gap-2 text-sm font-bold text-slate-950 hover:text-indigo-600 transition-colors"
            >
              Browse Their Hardware <span className="material-symbols-outlined text-base">arrow_outward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURED.map((partner) => (
              <div
                key={partner.name}
                className="gsap-animate group flex flex-col bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-7">
                  <div className="w-20 h-14 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-2">
                    <Image
                      src={getAssetPath(`/images/partners/${partner.logo}`)}
                      alt={partner.name}
                      width={110}
                      height={40}
                      className="grayscale group-hover:grayscale-0 transition-all"
                      style={{ width: "auto", height: "auto", maxHeight: 32, maxWidth: "100%" }}
                    />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                    {partner.tier}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-950 leading-snug mb-2">{partner.name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-7">{partner.desc}</p>
                <div className="mt-auto border-t border-slate-200 pt-4 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    {partner.category}
                  </span>
                  <span className="w-7 h-7 rounded-full bg-white text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">
                    <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GsapSection>

      <GsapSection id="full-network" className="bg-surface" fullScreen>
        <div className="container mx-auto px-margin-desktop">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <SectionIntro
              eyebrow="The full network"
              title="Every vendor we're accountable for."
              lede="We stay vendor-agnostic on purpose — the recommendation you get is about fit, not backroom deals."
              ledeWidth="3xl"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {PARTNER_LOGOS.map((partner) => (
              <div
                key={partner.file}
                className="gsap-animate bg-white border border-outline-variant rounded-xl h-24 flex items-center justify-center p-4 grayscale opacity-75 hover:grayscale-0 hover:opacity-100 hover:border-primary/40 transition-all"
              >
                <Image
                  src={getAssetPath(`/images/partners/${partner.file}`)}
                  alt={partner.name}
                  width={120}
                  height={48}
                  style={{ width: "auto", height: "auto", maxHeight: 40, maxWidth: "100%" }}
                />
              </div>
            ))}
          </div>
        </div>
      </GsapSection>

      <GsapSection id="why-alliances" className="bg-white py-16 border-y border-slate-200" fullScreen>
        <div className="container mx-auto px-margin-desktop">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <SectionIntro
              eyebrow="Why it matters"
              title="Why These Alliances Matter"
              lede="Certification isn't a logo on a page — it's what lets us stand behind the whole stack when something goes wrong at 3am."
              ledeWidth="3xl"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {REASONS.map((reason) => (
              <div
                key={reason.title}
                className="gsap-animate rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center mb-7">
                  <span className="material-symbols-outlined text-xl text-blue-600">{reason.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-950 leading-snug mb-3">
                  {reason.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{reason.desc}</p>
              </div>
            ))}
          </div>
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

      <GsapSection id="partners-cta" className="bg-surface border-t border-slate-100" fullScreen>
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
            Join our ecosystem.
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
            Become a certified LogiQ-On Tech partner and help define how Australian supply chains capture their data.
          </TextAnimate>
          <Link
            href="/contact"
            className="gsap-animate inline-block bg-slate-950 hover:bg-slate-800 text-white font-bold text-base px-9 py-4 rounded-full shadow-md transition-all duration-300 hover:scale-105 mt-12"
            style={{ color: "#ffffff" }}
          >
            Apply for Partnership
          </Link>
        </div>
      </GsapSection>
    </div>
  );
}
