import type { Metadata } from "next";
import Link from "next/link";
import GsapSection from "@/components/GsapSection";
import { getAssetPath } from "@/lib/nav";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import { TextAnimate } from "@/components/ui/text-animate";

export const metadata: Metadata = {
  title: "Products & Solutions",
  description: "Browse LogiQ-On's full hardware and solutions catalogue.",
};

const CATEGORIES = [
  {
    num: "01",
    tag: "Data Capture",
    title: "Barcode Scanners",
    desc: "Rugged handhelds and hands-free wearables holding 99.9% read rates in extreme industrial conditions.",
    icon: "barcode_scanner",
    image: "/images/stitch/faa7265242c3.png",
    href: "/products/barcode-scanners",
  },
  {
    num: "02",
    tag: "Labelling",
    title: "Label Printing",
    desc: "Thermal transfer and direct thermal printing for high-throughput labelling and shipping lanes.",
    icon: "print",
    image: "/images/stitch/ea517d840311.png",
    href: "/products/label-printing/desktop-printers",
  },
  {
    num: "03",
    tag: "Mobility",
    title: "Mobile Computers",
    desc: "Rugged handhelds and tablets running enterprise-grade OS for real-time fleet and asset management.",
    icon: "devices",
    image: "/images/stitch/8e6fd312e52b.png",
    href: "/products/mobile-computers",
  },
  {
    num: "04",
    tag: "Visibility",
    title: "RFID Solutions",
    desc: "Passive and active RFID ecosystems tracking thousands of items at once, with zero line-of-sight required.",
    icon: "sensors",
    image: "/images/stitch/87e3e6a9b1e0.png",
    href: "/products/rfid-solutions",
  },
];

const INFRASTRUCTURE = [
  {
    title: "Wireless Solutions",
    desc: "Predictive RF surveys, high-density access points, and mesh networks engineered for steel-heavy sites.",
    icon: "settings_input_antenna",
    stat: "99.9%",
    statLabel: "Network Uptime",
    badge: "Infrastructure",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    href: "/products/wireless-solutions",
  },
  {
    title: "Digital Signage",
    desc: "Electronic shelf labels and in-store displays that keep pricing and stock messaging accurate everywhere.",
    icon: "digital_out_of_home",
    stat: "10 yr",
    statLabel: "Label Battery Life",
    badge: "Retail",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    href: "/products/digital-signage",
  },
];

const SOFTWARE = [
  {
    title: "Stock Taking AI",
    desc: "Automated inventory reconciliation using computer vision and sensor fusion to eliminate human error during cycle counts.",
    icon: "inventory",
  },
  {
    title: "RTLS Asset Tracking",
    desc: "Real-Time Location System tracking for high-value machinery, forklifts, and pallets across multi-site facilities.",
    icon: "location_on",
  },
  {
    title: "Ops Intelligence",
    desc: "Integrated BI dashboards with heatmaps, bottleneck alerts, and predictive maintenance schedules for hardware fleets.",
    icon: "analytics",
  },
];

export default function ProductsPage() {
  return (
    <div>
      <PageHero
        eyebrow="Industrial Precision"
        title={
          <>
            Precision Hardware &amp;
            <br />
            Software for Modern Logistics
          </>
        }
        lede="End-to-end operational clarity powered by ruggedized hardware and cloud-native software ecosystems. Built for global scale."
        image="/images/pexels/products-barcode-scan.jpg"
        imageAlt="Warehouse operator scanning a shipping label with a rugged barcode scanner"
      />

      <GsapSection id="products-header" className="bg-surface" fullScreen>
        <div className="container mx-auto px-margin-desktop flex flex-col items-center justify-center text-center">
          <SectionIntro
            eyebrow="Hardware Catalogue"
            title="Core Product Categories"
            lede="Industrial-grade instrumentation for the high-density supply chain — every category specified, supplied, installed, and supported by one team."
            ledeWidth="5xl"
          />
        </div>
      </GsapSection>

      <GsapSection
        id="products-cards"
        className="bg-surface border-t border-slate-100"
        fullScreen
        scrub={false}
        start="top 92%"
        stagger={0.06}
        duration={0.45}
      >
        <div className="container mx-auto px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.title}
                className="gsap-animate group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
              >
                <div>
                  <div className="relative h-48 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={cat.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      src={getAssetPath(cat.image)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {cat.num}
                    </span>
                    <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                      <span className="material-symbols-outlined text-base text-slate-950 font-bold">{cat.icon}</span>
                    </div>
                  </div>
                  <div className="p-6 pb-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">
                      {cat.tag}
                    </span>
                    <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">{cat.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">{cat.desc}</p>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-0">
                  <Link
                    href={cat.href}
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
        id="infrastructure"
        className="bg-surface-container-low border-y border-outline-variant/30"
        fullScreen
      >
        <div className="container mx-auto px-margin-desktop">
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="gsap-animate">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-3 tracking-tight">
                Infrastructure &amp; In-Store
              </h2>
              <p className="text-base text-slate-600">The layers that carry the data once it&apos;s captured.</p>
            </div>
            <Link
              href="/solutions"
              className="gsap-animate flex items-center gap-2 text-sm font-bold text-slate-950 hover:text-indigo-600 transition-colors"
            >
              View All Solutions <span className="material-symbols-outlined text-base">arrow_outward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {INFRASTRUCTURE.map((item) => (
              <Link
                key={item.title}
                href={item.href}
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
                  <div className="border-t border-slate-200 mt-5 pt-4">
                    <span className="text-sm font-bold text-slate-950 flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                      Explore Range <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </GsapSection>

      <GsapSection id="software" className="bg-surface border-t border-slate-100" fullScreen>
        <div className="container mx-auto px-margin-desktop">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <SectionIntro
              eyebrow="Software Layer"
              title="Cloud-native intelligence on top of the hardware."
              lede="The layer that turns hardware telemetry into operational ROI — reconciliation, location, and the dashboards your floor managers actually open."
              ledeWidth="3xl"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SOFTWARE.map((item) => (
              <div
                key={item.title}
                className="gsap-animate group rounded-2xl border border-slate-200 bg-white p-8 hover:border-slate-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center mb-7">
                  <span className="material-symbols-outlined text-xl text-white">{item.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-950 leading-snug mb-3">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </GsapSection>

      <GsapSection id="products-cta" className="bg-surface border-t border-slate-100" fullScreen>
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
            Request a hardware audit.
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
            Work with our systems engineers to evaluate your current scanning and printing infrastructure for efficiency gaps.
          </TextAnimate>
          <Link
            href="/contact"
            className="gsap-animate inline-block bg-slate-950 hover:bg-slate-800 text-white font-bold text-base px-9 py-4 rounded-full shadow-md transition-all duration-300 hover:scale-105 mt-12"
            style={{ color: "#ffffff" }}
          >
            Schedule an Audit
          </Link>
        </div>
      </GsapSection>
    </div>
  );
}
