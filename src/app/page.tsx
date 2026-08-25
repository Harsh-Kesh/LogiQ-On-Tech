import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PARTNER_LOGOS } from "@/lib/data/partners";
import HeroVideo from "@/components/HeroVideo";
import GsapSection from "@/components/GsapSection";
import { TextAnimate } from "@/components/ui/text-animate";
import ContactEmailForm from "@/components/ContactEmailForm";
import { getAssetPath } from "@/lib/nav";

export const metadata: Metadata = {
  description:
    "LogiQ-On Tech orchestrates the world's most complex supply chains with real-time AI insights, seamless connectivity, and industrial-grade reliability.",
};

export default function HomePage() {
  return (
    <div className="">

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
<Link href="/request-demo" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl border border-indigo-400/50 shadow-xl transition-all flex items-center gap-2" style={{ color: "#ffffff" }}>
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

<GsapSection id="about" className="bg-surface" fullScreen={true}>
<div className="container mx-auto px-margin-desktop flex flex-col items-center justify-center text-center">
<TextAnimate
  by="word"
  animation="wavy"
  as="h2"
  startOnView={true}
  once={false}
  duration={0.3}
  className="text-4xl md:text-5xl font-extrabold text-slate-950 mb-8 text-center tracking-tight leading-tight"
>
  About Us
</TextAnimate>
<TextAnimate
  by="word"
  animation="wavy"
  as="p"
  startOnView={true}
  once={false}
  delay={0.05}
  duration={0.35}
  className="text-lg md:text-xl text-slate-600 leading-[2.2] max-w-4xl mx-auto text-center font-normal"
>
  Who we are, our mission, and how we work with clients. LogiQ-On has been sourcing, installing, and supporting the barcode, RFID, wireless, and signage technology that keep Australian warehouses, retailers, and logistics operators moving since 2020.
</TextAnimate>
</div>
</GsapSection>

<GsapSection id="sector-solutions" className="bg-surface-container-low border-y border-outline-variant/30" fullScreen={true}>
<div className="container mx-auto px-margin-desktop">
<div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
<div className="gsap-animate">
<h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-3 tracking-tight">Sector Solutions</h2>
<p className="text-base text-slate-600">Tailored logistics logic for industry-specific demands.</p>
</div>
<Link href="/industries" className="gsap-animate flex items-center gap-2 text-sm font-bold text-slate-950 hover:text-indigo-600 transition-colors">
          View All Industries <span className="material-symbols-outlined text-base">arrow_outward</span>
</Link>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

<div className="gsap-animate group flex flex-col bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
<div className="flex items-start justify-between mb-7">
<div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-xl text-white">precision_manufacturing</span>
</div>
<span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">Optimized</span>
</div>
<h3 className="text-xl font-bold text-slate-950 leading-snug mb-2 min-h-[56px]">Automotive Manufacturing</h3>
<p className="text-sm text-slate-600 leading-relaxed mb-7 min-h-[40px]">Rugged hardware &amp; JIT components</p>
<div className="mt-auto">
<div className="text-4xl font-extrabold text-slate-950 leading-none tracking-tight">+28%</div>
<div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">Efficiency Gain</div>
<div className="border-t border-slate-200 mt-5 pt-4">
<button className="text-sm font-bold text-slate-950 flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
              Case Study <span className="material-symbols-outlined text-base">arrow_forward</span>
</button>
</div>
</div>
</div>

<div className="gsap-animate group flex flex-col bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
<div className="flex items-start justify-between mb-7">
<div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-xl text-white">ac_unit</span>
</div>
<span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">Scaling</span>
</div>
<h3 className="text-xl font-bold text-slate-950 leading-snug mb-2 min-h-[56px]">Pharmaceutical Cold Chain</h3>
<p className="text-sm text-slate-600 leading-relaxed mb-7 min-h-[40px]">RFID sensors &amp; infrastructure</p>
<div className="mt-auto">
<div className="text-4xl font-extrabold text-slate-950 leading-none tracking-tight">+15%</div>
<div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">Efficiency Gain</div>
<div className="border-t border-slate-200 mt-5 pt-4">
<button className="text-sm font-bold text-slate-950 flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
              Case Study <span className="material-symbols-outlined text-base">arrow_forward</span>
</button>
</div>
</div>
</div>

<div className="gsap-animate group flex flex-col bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
<div className="flex items-start justify-between mb-7">
<div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-xl text-white">memory</span>
</div>
<span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">Optimized</span>
</div>
<h3 className="text-xl font-bold text-slate-950 leading-snug mb-2 min-h-[56px]">Consumer Electronics</h3>
<p className="text-sm text-slate-600 leading-relaxed mb-7 min-h-[40px]">WMS integration &amp; peak scaling</p>
<div className="mt-auto">
<div className="text-4xl font-extrabold text-slate-950 leading-none tracking-tight">+42%</div>
<div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">Efficiency Gain</div>
<div className="border-t border-slate-200 mt-5 pt-4">
<button className="text-sm font-bold text-slate-950 flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
              Case Study <span className="material-symbols-outlined text-base">arrow_forward</span>
</button>
</div>
</div>
</div>

<div className="gsap-animate group flex flex-col bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
<div className="flex items-start justify-between mb-7">
<div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-xl text-white">storefront</span>
</div>
<span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">Upgrading</span>
</div>
<h3 className="text-xl font-bold text-slate-950 leading-snug mb-2 min-h-[56px]">Global Retail Chains</h3>
<p className="text-sm text-slate-600 leading-relaxed mb-7 min-h-[40px]">Handheld scanners &amp; omni-channel</p>
<div className="mt-auto">
<div className="text-4xl font-extrabold text-slate-950 leading-none tracking-tight">+33%</div>
<div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">Efficiency Gain</div>
<div className="border-t border-slate-200 mt-5 pt-4">
<button className="text-sm font-bold text-slate-950 flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
              Case Study <span className="material-symbols-outlined text-base">arrow_forward</span>
</button>
</div>
</div>
</div>

</div>
</div>
</GsapSection>

<GsapSection id="partners" className="bg-surface" fullScreen={true}>
<div className="container mx-auto px-margin-desktop">
<div className="max-w-3xl mx-auto text-center mb-12">
<TextAnimate
  by="word"
  animation="wavy"
  as="span"
  startOnView={true}
  once={false}
  duration={0.5}
  className="text-xs md:text-sm font-bold uppercase tracking-[0.25em] text-indigo-600 mb-4 block text-center"
>
  Our Ecosystem
</TextAnimate>
<TextAnimate
  by="word"
  animation="wavy"
  as="h2"
  startOnView={true}
  once={false}
  duration={0.6}
  className="text-4xl md:text-5xl font-extrabold text-slate-950 mb-6 text-center tracking-tight leading-tight"
>
  Backed by the hardware makers who set the standard.
</TextAnimate>
</div>
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
{PARTNER_LOGOS.slice(0, 15).map((partner) => (
<div key={partner.file} className="gsap-animate bg-white border border-outline-variant rounded-xl h-24 flex items-center justify-center p-4 grayscale opacity-75 hover:grayscale-0 hover:opacity-100 hover:border-primary/40 transition-all">
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
<div className="text-center mt-10 gsap-animate">
<Link href="/partners" className="flex items-center gap-2 text-primary font-label-md hover:underline w-fit mx-auto">
          View all {PARTNER_LOGOS.length} partners <span className="material-symbols-outlined">arrow_forward</span>
</Link>
</div>
</div>
</GsapSection>

<GsapSection id="gstore" className="relative overflow-hidden bg-on-background" fullScreen={true}>
<div className="container mx-auto px-margin-desktop">
<div className="grid md:grid-cols-2 gap-12 items-center">
<div className="gsap-animate">
<Image
  src={getAssetPath("/images/gstore/greyorange-logo-white.png")}
  alt="GreyOrange"
  width={160}
  height={36}
  className="mb-6 opacity-90"
  style={{ width: "auto", height: 28 }}
/>
<span className="text-primary-fixed-dim font-label-md tracking-wider uppercase mb-4 block">Featured Platform</span>
<h2 className="font-headline-lg text-headline-lg text-white mb-4 leading-tight">
              Your inventory is about to get way more <span className="text-primary-fixed-dim">intelligent.</span>
</h2>
<p className="text-body-lg text-white/70 mb-8 max-w-lg">
              gStore by GreyOrange is the unified retail SaaS app that makes inventory self-aware and RFID-enabled
              stores autonomous &mdash; live in your stores in under 4 weeks.
            </p>
<div className="grid grid-cols-3 gap-4 mb-10">
<div>
<div className="text-headline-lg font-headline-lg text-primary-fixed-dim">&gt;99%</div>
<div className="text-label-sm text-white/60 uppercase tracking-widest mt-1">Inventory Accuracy</div>
</div>
<div>
<div className="text-headline-lg font-headline-lg text-primary-fixed-dim">40%</div>
<div className="text-label-sm text-white/60 uppercase tracking-widest mt-1">More Availability</div>
</div>
<div>
<div className="text-headline-lg font-headline-lg text-primary-fixed-dim">2x</div>
<div className="text-label-sm text-white/60 uppercase tracking-widest mt-1">Associate Output</div>
</div>
</div>
<Link
  href="/solutions/retail-rfid-solutions/gstore-greyorange"
  className="inline-block bg-primary text-on-primary px-8 py-4 rounded-lg font-headline-sm text-headline-sm hover:shadow-lg hover:shadow-primary/20 transition-all"
>
              Explore gStore
            </Link>
</div>
<div className="gsap-animate relative flex justify-center">
<Image
  src={getAssetPath("/images/gstore/phone-zoom.png")}
  alt="gStore mobile app showing real-time inventory"
  width={380}
  height={500}
  className="w-full max-w-xs h-auto object-contain"
/>
</div>
</div>
</div>
</GsapSection>

<GsapSection id="products-hub" className="bg-surface border-t border-slate-100" fullScreen={true}>
<div className="container mx-auto px-margin-desktop flex flex-col items-center justify-center text-center">
<TextAnimate
  by="word"
  animation="wavy"
  as="h2"
  startOnView={true}
  once={false}
  duration={0.3}
  className="text-4xl md:text-5xl font-extrabold text-slate-950 mb-8 text-center tracking-tight leading-tight"
>
  Products
</TextAnimate>
<TextAnimate
  by="word"
  animation="wavy"
  as="p"
  startOnView={true}
  once={false}
  delay={0.05}
  duration={0.35}
  className="text-lg md:text-xl text-slate-600 leading-[2.2] max-w-4xl mx-auto text-center font-normal"
>
  Rugged barcode scanners, RFID readers, mobile computers, industrial printers, mission-critical wireless networks, and digital signage built for demanding environments.
</TextAnimate>
<Link href="/products" className="gsap-animate inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors mt-8">
  Explore All Products &rarr;
</Link>
</div>
</GsapSection>

<GsapSection id="solutions-hub" className="bg-surface border-t border-slate-100" fullScreen={true}>
<div className="container mx-auto px-margin-desktop flex flex-col items-center justify-center text-center">
<TextAnimate
  by="word"
  animation="wavy"
  as="h2"
  startOnView={true}
  once={false}
  duration={0.3}
  className="text-4xl md:text-5xl font-extrabold text-slate-950 mb-8 text-center tracking-tight leading-tight"
>
  Solutions
</TextAnimate>
<TextAnimate
  by="word"
  animation="wavy"
  as="p"
  startOnView={true}
  once={false}
  delay={0.05}
  duration={0.35}
  className="text-lg md:text-xl text-slate-600 leading-[2.2] max-w-4xl mx-auto text-center font-normal"
>
  End-to-end enterprise solution engineering combining mission-critical wireless infrastructure, automated RFID asset tracking, and seamless software integration services.
</TextAnimate>
<Link href="/solutions" className="gsap-animate inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors mt-8">
  Explore All Solutions &rarr;
</Link>
</div>
</GsapSection>

<GsapSection id="contact-hub" className="bg-surface" fullScreen={true}>
<div className="container mx-auto px-margin-desktop max-w-3xl text-center flex flex-col items-center justify-center">
<TextAnimate
  by="word"
  animation="wavy"
  as="h2"
  startOnView={true}
  once={false}
  duration={0.3}
  className="text-4xl md:text-5xl font-extrabold text-slate-950 mb-6 text-center tracking-tight leading-tight"
>
  Ready to scale with LogiQ-On?
</TextAnimate>
<TextAnimate
  by="word"
  animation="wavy"
  as="p"
  startOnView={true}
  once={false}
  delay={0.05}
  duration={0.35}
  className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-xl mx-auto text-center font-normal mt-4 mb-10 block"
>
  Talk to the team, book a demo, or request a quote. Connect with our technical specialists to optimize your barcode, RFID, and wireless operations.
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
