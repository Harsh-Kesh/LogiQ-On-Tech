import type { Metadata } from "next";
import Link from "next/link";
import GsapSection from "@/components/GsapSection";
import { getAssetPath } from "@/lib/nav";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import { TextAnimate } from "@/components/ui/text-animate";

export const metadata: Metadata = {
  title: "LogiQ-On Buzz",
  description:
    "Notes from LogiQ-On on barcode, RFID, wireless, and retail technology trends across Australian supply chains.",
};

const FEATURE = {
  tag: "Whitepaper",
  title: "Unlocking 5G in the Warehouse: The Future of Latency-Free Logistics",
  desc: "How private 5G networks are changing real-time inventory tracking and remote robotics in modern distribution centres.",
  image: "/images/stitch/7fe79810162c.png",
  date: "Nov 26, 2024",
};

const POSTS = [
  {
    num: "01",
    tag: "Company Update",
    title: "LogiQ-On Expansion: New Hub in Singapore",
    desc: "Strengthening our presence in the APAC region to support growing demand for smart logistics.",
    icon: "public",
    image: "/images/stitch/92d2a61c2543.png",
    date: "Nov 12, 2024",
    cta: "Ask Us About This",
  },
  {
    num: "02",
    tag: "Sustainability",
    title: "Path to Net Zero: Carbon-Free Freight",
    desc: "Our roadmap to reducing scope 3 emissions by 40% across all primary routes by 2030.",
    icon: "eco",
    image: "/images/stitch/ea517d840311.png",
    date: "Oct 28, 2024",
    cta: "Ask Us About This",
  },
  {
    num: "03",
    tag: "Technology",
    title: "Edge Computing 101",
    desc: "Why processing data at the edge is critical for cross-docking operations that can't wait on the cloud.",
    icon: "memory",
    image: "/images/stitch/2ffab7970a28.png",
    date: "Oct 14, 2024",
    cta: "Ask Us About This",
  },
  {
    num: "04",
    tag: "Case Study",
    title: "AI-Driven Forecasting",
    desc: "How predictive analytics reduced overstocking by 22% across a national distribution network.",
    icon: "insights",
    image: "/images/stitch/60af055db964.png",
    date: "Sep 30, 2024",
    cta: "Ask Us About This",
  },
];

export default function BuzzPage() {
  return (
    <div>
      <PageHero
        eyebrow="Latest Insights"
        title={
          <>
            LogiQ-On Buzz
            <br />
            Field Notes From The Floor
          </>
        }
        lede="Stay updated with the pulse of Australian logistics — from deep-dive whitepapers to high-velocity company milestones."
        image="/images/pexels/buzz-blog-workspace.jpg"
        imageAlt="Logistics team reviewing supply chain data in a workspace"
      />

      <GsapSection id="buzz-header" className="bg-surface" fullScreen>
        <div className="container mx-auto px-margin-desktop flex flex-col items-center justify-center text-center">
          <SectionIntro
            eyebrow="What we're writing about"
            title="Notes, Research & Milestones"
            lede="Practical writing on barcode, RFID, wireless, and retail technology — published when we have something worth saying, not on a content calendar."
            ledeWidth="5xl"
          />
        </div>
      </GsapSection>

      <GsapSection id="buzz-feature" className="bg-surface border-t border-slate-100" fullScreen>
        <div className="container mx-auto px-margin-desktop">
          <div className="gsap-animate group relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-950 hover:shadow-xl transition-all duration-300">
            <div className="relative h-[480px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Automated warehouse running on a private 5G network"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                src={getAssetPath(FEATURE.image)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 max-w-3xl">
                <span className="inline-block text-[10px] font-bold text-white uppercase tracking-widest bg-indigo-600 px-3 py-1 rounded-full mb-5">
                  {FEATURE.tag}
                </span>
                <h3
                  className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4"
                  style={{ color: "#ffffff" }}
                >
                  {FEATURE.title}
                </h3>
                <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-7 max-w-xl">{FEATURE.desc}</p>
                <div className="flex items-center gap-6">
                  <Link
                    href="/contact"
                    className="flex items-center gap-2 text-sm font-bold text-white hover:text-indigo-300 transition-colors"
                  >
                    Download Whitepaper
                    <span className="w-7 h-7 rounded-full bg-white text-slate-950 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                    </span>
                  </Link>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{FEATURE.date}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GsapSection>

      <GsapSection
        id="buzz-posts"
        className="bg-surface-container-low border-y border-outline-variant/30"
        fullScreen
        scrub={false}
        start="top 92%"
        stagger={0.06}
        duration={0.45}
      >
        <div className="container mx-auto px-margin-desktop">
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="gsap-animate">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-3 tracking-tight">Recent Posts</h2>
              <p className="text-base text-slate-600">Company updates, field research, and customer results.</p>
            </div>
            <Link
              href="/contact"
              className="gsap-animate flex items-center gap-2 text-sm font-bold text-slate-950 hover:text-indigo-600 transition-colors"
            >
              Get in Touch <span className="material-symbols-outlined text-base">arrow_outward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {POSTS.map((post) => (
              <div
                key={post.title}
                className="gsap-animate group relative flex flex-col justify-between rounded-3xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
              >
                <div>
                  <div className="relative h-48 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={post.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      src={getAssetPath(post.image)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <span className="absolute top-4 left-4 text-[11px] font-bold text-white/90 tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {post.num}
                    </span>
                    <div className="absolute bottom-3 left-4 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md border border-white">
                      <span className="material-symbols-outlined text-base text-slate-950 font-bold">{post.icon}</span>
                    </div>
                  </div>
                  <div className="p-6 pb-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">
                      {post.tag}
                    </span>
                    <h3 className="text-lg font-bold text-slate-950 leading-snug mb-2.5 min-h-[52px]">{post.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4 min-h-[44px]">{post.desc}</p>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-0 flex items-center justify-between gap-2">
                  <Link
                    href="/contact"
                    className="w-fit flex items-center gap-2 text-xs font-bold text-slate-950 hover:text-indigo-600 transition-colors"
                  >
                    {post.cta}
                    <span className="w-7 h-7 rounded-full bg-white text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">
                      <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
                    </span>
                  </Link>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{post.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GsapSection>

      <GsapSection id="buzz-cta" className="bg-surface" fullScreen>
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
            Want these notes in your inbox?
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
            Product updates and field notes from LogiQ-On, sent occasionally and never spammy.
          </TextAnimate>
          <Link
            href="/contact"
            className="gsap-animate inline-block bg-slate-950 hover:bg-slate-800 text-white font-bold text-base px-9 py-4 rounded-full shadow-md transition-all duration-300 hover:scale-105 mt-12"
            style={{ color: "#ffffff" }}
          >
            Subscribe via Contact
          </Link>
        </div>
      </GsapSection>
    </div>
  );
}
