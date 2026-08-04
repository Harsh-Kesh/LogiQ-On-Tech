import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PARTNER_LOGOS } from "@/lib/data/partners";
import HeroVideo from "@/components/HeroVideo";
import GsapSection from "@/components/GsapSection";
import { TextAnimate } from "@/components/ui/text-animate";
import ContactEmailForm from "@/components/ContactEmailForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAssetPath } from "@/lib/nav";

export const metadata: Metadata = {
  description:
    "LogiQ-On Tech orchestrates the world's most complex supply chains with real-time AI insights, seamless connectivity, and industrial-grade reliability.",
};

export default function HomePage() {
  return (
    <div>
      <Header />

      <section className="relative min-h-screen flex items-end overflow-hidden bg-slate-950 pt-36 pb-12 md:pb-16">
        <div className="absolute inset-0 z-0">
          <HeroVideo />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20 pointer-events-none" />
        </div>
        <div className="w-full px-6 sm:px-10 md:px-16 lg:px-20 relative z-20">
          <div className="max-w-3xl">
            <div className="mb-8 md:mb-10">
              <span className="inline-block font-label-md text-label-md text-white bg-white/20 border border-white/40 px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest backdrop-blur-md shadow-sm" style={{ color: "#ffffff" }}>Industrial Precision At Scale</span>
              <h1 className="font-display-lg text-display-lg text-white leading-tight drop-shadow-xl" style={{ color: "#ffffff" }}>
                The Intelligent Pulse of <br/><span style={{ color: "#ffffff" }}>Modern Logistics</span>
              </h1>
              <p className="font-body-md text-base md:text-lg text-white max-w-lg drop-shadow-lg" style={{ color: "rgba(255, 255, 255, 0.9)", marginTop: "36px" }}>
                LogiQ-On Tech orchestrates the world&apos;s most complex supply chains with real-time AI insights, seamless connectivity, and industrial-grade reliability.
              </p>
            </div>
            <div className="mt-8 md:mt-12">
              <div className="flex flex-wrap gap-4">
                <Link href="/auth/login" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl border border-indigo-400/50 shadow-xl transition-all flex items-center gap-2" style={{ color: "#ffffff" }}>
                  Request Demo <span className="material-symbols-outlined text-lg text-white" data-icon="arrow_forward">arrow_forward</span>
                </Link>
                <Link href="/solutions" className="px-8 py-4 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl border border-white/40 backdrop-blur-md transition-all flex items-center gap-2" style={{ color: "#ffffff" }}>
                  Explore Solutions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GsapSection id="pillars-header" className="bg-surface" fullScreen={true}>
        <div className="container mx-auto px-margin-desktop flex flex-col items-center justify-center text-center">
          <TextAnimate
            by="word"
            animation="wavy"
            as="span"
            startOnView={true}
            once={false}
            duration={0.25}
            className="text-xs md:text-sm font-bold uppercase tracking-[0.25em] text-indigo-600 mb-4 block text-center"
          >
            Expertise Centers
          </TextAnimate>
          <TextAnimate
            by="word"
            animation="wavy"
            as="h2"
            startOnView={true}
            once={false}
            duration={0.3}
            className="text-4xl md:text-5xl font-extrabold text-slate-950 mb-8 text-center tracking-tight leading-tight"
          >
            Core Business Pillars
          </TextAnimate>
          <TextAnimate
            by="word"
            animation="wavy"
            as="p"
            startOnView={true}
            once={false}
            delay={0.05}
            duration={0.35}
            className="text-lg md:text-xl text-slate-600 leading-[2.2] max-w-5xl mx-auto text-center font-normal"
          >
            Four capabilities, one accountable partner — delivering specialized end-to-end solutions that bridge the gap between physical operations and digital intelligence.
          </TextAnimate>
        </div>
      </GsapSection>

      <GsapSection id="pillars-cards" className="bg-surface border-t border-slate-100" fullScreen={true} scrub={false} start="top 92%" stagger={0.06} duration={0.45}>
        <div className="container mx-auto px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <div className="gsap-animate group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img alt="Wireless Infrastructure" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={getAssetPath("/images/stitch/e4da613a9de1.png")}/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"/>
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">01</span>
                  <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <span className="material-symbols-outlined text-base text-slate-950 font-bold">settings_input_antenna</span>
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">Infrastructure</span>
                  <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">Wireless Data &amp; Infrastructure</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">Mission-critical connectivity engineered for the toughest industrial environments.</p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link href="/solutions" className="w-fit flex items-center gap-2 text-xs font-bold text-slate-950 hover:text-indigo-600 transition-colors">
                  Explore 
                  <span className="w-7 h-7 rounded-full bg-white text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">
                    <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                  </span>
                </Link>
              </div>
            </div>

            <div className="gsap-animate group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img alt="RFID Tracking" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={getAssetPath("/images/stitch/87e3e6a9b1e0.png")}/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"/>
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">02</span>
                  <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <span className="material-symbols-outlined text-base text-slate-950 font-bold">sensors</span>
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">Visibility</span>
                  <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">RFID &amp; Asset Tracking</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">Automated, real-time inventory visibility that eliminates blind spots on the floor.</p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link href="/products/rfid-solutions" className="w-fit flex items-center gap-2 text-xs font-bold text-slate-950 hover:text-indigo-600 transition-colors">
                  Explore 
                  <span className="w-7 h-7 rounded-full bg-white text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">
                    <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                  </span>
                </Link>
              </div>
            </div>

            <div className="gsap-animate group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img alt="Supply Chain Hardware" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={getAssetPath("/images/stitch/ea517d840311.png")}/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"/>
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">03</span>
                  <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <span className="material-symbols-outlined text-base text-slate-950 font-bold">devices</span>
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">Hardware</span>
                  <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">Supply Chain Hardware</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">Ruggedized, enterprise-grade equipment built for the harshest industrial edge.</p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link href="/products" className="w-fit flex items-center gap-2 text-xs font-bold text-slate-950 hover:text-indigo-600 transition-colors">
                  Explore 
                  <span className="w-7 h-7 rounded-full bg-white text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">
                    <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                  </span>
                </Link>
              </div>
            </div>

            <div className="gsap-animate group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img alt="Integration &amp; Enterprise Services" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={getAssetPath("/images/pexels/partners-server-hardware.jpg")}/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"/>
                  <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">04</span>
                  <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                    <span className="material-symbols-outlined text-base text-slate-950 font-bold">integration_instructions</span>
                  </div>
                </div>
                <div className="p-6 pb-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">Services</span>
                  <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">Integration &amp; Enterprise Services</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">Seamless software orchestration between edge data capture and core systems.</p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-0">
                <Link href="/solutions" className="w-fit flex items-center gap-2 text-xs font-bold text-slate-950 hover:text-indigo-600 transition-colors">
                  Explore 
                  <span className="w-7 h-7 rounded-full bg-white text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">
                    <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                  </span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </GsapSection>

      <Footer />
    </div>
  );
}
