import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PARTNER_LOGOS } from "@/lib/data/partners";
import GsapSection from "@/components/GsapSection";
import { getAssetPath } from "@/lib/nav";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import { TextAnimate } from "@/components/ui/text-animate";

export const metadata: Metadata = {
  title: "Solutions Hub",
  description: "Core infrastructure and solutions built by LogiQ-On for modern supply chains.",
};

const PILLARS = [
  {
    num: "01",
    tag: "Infrastructure",
    title: "Wireless Infrastructure",
    desc: "Mission-critical connectivity for extreme industrial environments — surveyed, designed, and deployed.",
    icon: "settings_input_antenna",
    image: "/images/stitch/1def1fdfd3c7.png",
    href: "/products/wireless-solutions",
  },
  {
    num: "02",
    tag: "Visibility",
    title: "RFID & Asset Tracking",
    desc: "Zero-touch data capture that turns inventory into insight with pinpoint accuracy.",
    icon: "sensors",
    image: "/images/stitch/a7063679e413.png",
    href: "/products/rfid-solutions",
  },
  {
    num: "03",
    tag: "Hardware",
    title: "Warehouse Hardware",
    desc: "Industrial-grade portables and fixed stations built for 24/7 high-volume operations.",
    icon: "devices",
    image: "/images/stitch/f326a775b6d0.png",
    href: "/products",
  },
  {
    num: "04",
    tag: "Services",
    title: "Enterprise Services",
    desc: "Configuration, security, and lifecycle management across your whole technology fleet.",
    icon: "settings_suggest",
    image: "/images/stitch/e82c1ac54180.png",
    href: "/contact",
  },
];

const DETAILS = [
  {
    id: "wireless",
    icon: "wifi_tethering",
    title: "Wireless Infrastructure",
    lede: "Mission-critical connectivity for extreme industrial environments. We design, survey, and deploy high-density networks that never drop a packet.",
    image: "/images/stitch/1def1fdfd3c7.png",
    imageAlt: "Industrial data centre supporting a warehouse wireless network",
    cta: { label: "Explore Wireless Systems", href: "/products/wireless-solutions" },
    features: [
      {
        title: "Predictive Surveys",
        desc: "RF heatmapping, spectrum analysis, and site-readiness assessments before a single cable is pulled.",
      },
      {
        title: "Hardware Partners",
        desc: "Cambium, Ruckus, and Extreme access points specified to the density your racking actually creates.",
      },
    ],
  },
  {
    id: "rfid",
    icon: "sensors",
    title: "RFID & Asset Tracking",
    lede: "Zero-touch data capture that turns inventory into insights. Automate tracking across your entire supply chain with pinpoint accuracy.",
    image: "/images/stitch/a7063679e413.png",
    imageAlt: "RFID portal reading tagged stock at a warehouse dock door",
    cta: { label: "View RFID Solutions", href: "/solutions/retail-rfid-solutions/gstore-greyorange" },
    features: [
      { title: "Fixed Readers", desc: "Portals and overhead arrays for dock door and choke-point tracking." },
      { title: "Specialized Tags", desc: "Ruggedized tags rated for metal, liquid, and high-heat assets." },
      { title: "Tracking Logic", desc: "Middleware that cleans the read data and integrates with ERP and WMS." },
    ],
  },
  {
    id: "hardware",
    icon: "inventory_2",
    title: "Warehouse Hardware",
    lede: "The tools of the trade. Industrial-grade portables and fixed stations built for the rigours of 24/7 high-volume operations.",
    image: "/images/stitch/f326a775b6d0.png",
    imageAlt: "Rugged warehouse mobile computer in use on a picking run",
    cta: { label: "Hardware Catalog", href: "/products" },
    features: [
      { title: "Handheld", desc: "Rugged mobiles, ring scanners, and industrial tablets." },
      { title: "Vehicle-Mount", desc: "Forklift computers and in-cab displays, vibration tested." },
      { title: "Display", desc: "Kiosk systems, wall terminals, and picking screens." },
    ],
  },
  {
    id: "services",
    icon: "settings_suggest",
    title: "Enterprise Services",
    lede: "Beyond the hardware. We make sure your entire technology fleet is configured, secured, and managed throughout its lifecycle.",
    image: "/images/stitch/e82c1ac54180.png",
    imageAlt: "Engineers integrating warehouse software with enterprise systems",
    cta: { label: "Talk to Services", href: "/contact" },
    features: [
      { title: "Software Deployment", desc: "Expert integration with ERP, WMS, and bespoke operational software." },
      { title: "MDM Solutions", desc: "Managed device management (SOTI, Ivanti) for global fleet control." },
      { title: "24/7 Support", desc: "A managed support portal with a single accountable escalation path." },
    ],
  },
];

const MARQUEE_LOGOS = PARTNER_LOGOS.slice(0, 15);

export default function SolutionsPage() {
  return (
    <div>
      <PageHero
        eyebrow="Our Ecosystem"
        title={
          <>
            Bespoke Tech &amp; Automation
            <br />
            for the Modern Supply Chain
          </>
        }
        lede="LogiQ-On Tech sources and supplies high-performance hardware, intelligent software, and wireless infrastructure to unlock peak operational efficiency."
        image="/images/pexels/solutions-robotic-arm.jpg"
        imageAlt="Industrial robotic arm on a warehouse automation line"
      />

      <GsapSection id="pillars-header" className="bg-surface" fullScreen>
        <div className="container mx-auto px-margin-desktop flex flex-col items-center justify-center text-center">
          <SectionIntro
            eyebrow="Comprehensive Directory"
            title="The Four Business Pillars"
            lede="Tailored end-to-end technology solutions designed to integrate seamlessly into your industrial workflow — deployed together, or one at a time."
            ledeWidth="5xl"
          />
        </div>
      </GsapSection>

      <GsapSection
        id="pillars-cards"
        className="bg-surface border-t border-slate-100"
        fullScreen
        scrub={false}
        start="top 92%"
        stagger={0.06}
        duration={0.45}
      >
        <div className="container mx-auto px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="gsap-animate group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
              >
                <div>
                  <div className="relative h-48 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={pillar.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      src={getAssetPath(pillar.image)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {pillar.num}
                    </span>
                    <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                      <span className="material-symbols-outlined text-base text-slate-950 font-bold">
                        {pillar.icon}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 pb-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">
                      {pillar.tag}
                    </span>
                    <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">{pillar.desc}</p>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-0">
                  <Link
                    href={pillar.href}
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

      {DETAILS.map((detail, i) => (
        <GsapSection
          key={detail.id}
          id={detail.id}
          className={i % 2 === 0 ? "bg-surface-container-low border-y border-outline-variant/30" : "bg-surface"}
          fullScreen
        >
          <div className="container mx-auto px-margin-desktop">
            <div className="grid md:grid-cols-12 gap-10 items-center">
              <div className={`md:col-span-5 gsap-animate ${i % 2 === 0 ? "md:order-1" : "md:order-2"}`}>
                <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={detail.imageAlt}
                    className="w-full h-[420px] object-cover group-hover:scale-105 transition-transform duration-700"
                    src={getAssetPath(detail.image)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                </div>
              </div>

              <div className={`md:col-span-7 gsap-animate ${i % 2 === 0 ? "md:order-2" : "md:order-1"}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl text-white">{detail.icon}</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight">{detail.title}</h2>
                </div>
                <p className="text-base md:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl">{detail.lede}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {detail.features.map((feature) => (
                    <div
                      key={feature.title}
                      className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-400 hover:shadow-lg transition-all duration-300"
                    >
                      <h3 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href={detail.cta.href}
                  className="flex items-center gap-2 text-sm font-bold text-slate-950 hover:text-indigo-600 transition-colors w-fit"
                >
                  {detail.cta.label} <span className="material-symbols-outlined text-base">arrow_outward</span>
                </Link>
              </div>
            </div>
          </div>
        </GsapSection>
      ))}

      <GsapSection id="tech-partners" className="bg-surface border-t border-slate-100 overflow-hidden" fullScreen>
        <div className="container mx-auto px-margin-desktop">
          <div className="gsap-animate max-w-3xl mx-auto text-center mb-12">
            <SectionIntro
              eyebrow="Our Ecosystem"
              title="Our Technology Partners"
              lede="We collaborate with world-leading technology providers so our clients get the most robust solution available, not the one with the best margin."
              ledeWidth="3xl"
            />
          </div>
        </div>

        {/* The GSAP entrance transform lives on this wrapper, never on the
            marquee track itself — both would write to the same transform. */}
        <div className="gsap-animate relative marquee-mask">
          <div className="marquee-track">
            {[...MARQUEE_LOGOS, ...MARQUEE_LOGOS].map((partner, i) => (
              <div
                key={`${partner.file}-${i}`}
                aria-hidden={i >= MARQUEE_LOGOS.length}
                className="marquee-item bg-white border border-slate-200 rounded-xl h-24 flex items-center justify-center p-4 grayscale opacity-75 hover:grayscale-0 hover:opacity-100 hover:border-indigo-300 transition-all"
              >
                <Image
                  src={getAssetPath(`/images/partners/${partner.file}`)}
                  alt={i < MARQUEE_LOGOS.length ? partner.name : ""}
                  width={120}
                  height={48}
                  style={{ width: "auto", height: "auto", maxHeight: 40, maxWidth: "100%" }}
                />
              </div>
            ))}
          </div>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes infinite-scroll {
                from { transform: translateX(0); }
                to { transform: translateX(-50%); }
              }
              .marquee-track {
                display: flex;
                width: max-content;
                animation: infinite-scroll 60s linear infinite;
              }
              /* Spacing comes from per-item margins, not flex gap: a gap adds an
                 extra half-gap at the wrap point, so -50% no longer lands on a
                 whole set and the loop visibly jumps. */
              .marquee-item {
                flex: none;
                width: 200px;
                margin-inline: 12px;
              }
              .marquee-mask {
                -webkit-mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
                mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
              }
              .marquee-track:hover { animation-play-state: paused; }
              @media (prefers-reduced-motion: reduce) {
                .marquee-track { animation: none; }
              }
            `,
          }}
        />
      </GsapSection>

      <GsapSection id="solutions-cta" className="bg-surface border-t border-slate-100" fullScreen>
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
            Ready to innovate your operation?
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
            Schedule a discovery session with our engineers and see first-hand how we can transform your logistics and supply chain operations.
          </TextAnimate>
          <Link
            href="/contact"
            className="gsap-animate inline-block bg-slate-950 hover:bg-slate-800 text-white font-bold text-base px-9 py-4 rounded-full shadow-md transition-all duration-300 hover:scale-105 mt-12"
            style={{ color: "#ffffff" }}
          >
            Contact Our Experts
          </Link>
        </div>
      </GsapSection>
    </div>
  );
}
