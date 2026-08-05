import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";

type HeroAction = {
  label: string;
  href: string;
};

interface PageHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  lede: string;
  image: string;
  imageAlt: string;
  primary?: HeroAction;
  secondary?: HeroAction;
}

/**
 * Full-bleed dark hero matching the home page: the fixed translucent header
 * sits over the top of it, so pages using this must not add their own top pad.
 */
export default function PageHero({
  eyebrow,
  title,
  lede,
  image,
  imageAlt,
  primary,
  secondary,
}: PageHeroProps) {
  return (
    <section className="relative min-h-screen flex items-end overflow-hidden bg-slate-950 pt-36 pb-12 md:pb-16">
      <div className="absolute inset-0 z-0">
        <Image
          src={getAssetPath(image)}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/25 pointer-events-none" />
      </div>

      <div className="w-full px-6 sm:px-10 md:px-16 lg:px-20 relative z-20">
        <div className="max-w-3xl">
          <div className="mb-8 md:mb-10">
            <span
              className="inline-block font-label-md text-label-md text-white bg-white/20 border border-white/40 px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest backdrop-blur-md shadow-sm"
              style={{ color: "#ffffff" }}
            >
              {eyebrow}
            </span>
            <h1
              className="font-display-lg text-display-lg text-white leading-tight drop-shadow-xl"
              style={{ color: "#ffffff" }}
            >
              {title}
            </h1>
            <p
              className="font-body-md text-base md:text-lg text-white max-w-lg drop-shadow-lg"
              style={{ color: "rgba(255, 255, 255, 0.9)", marginTop: "36px" }}
            >
              {lede}
            </p>
          </div>

          {(primary || secondary) && (
            <div className="mt-8 md:mt-12">
              <div className="flex flex-wrap gap-4">
                {primary && (
                  <Link
                    href={primary.href}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl border border-indigo-400/50 shadow-xl transition-all flex items-center gap-2"
                    style={{ color: "#ffffff" }}
                  >
                    {primary.label}
                    <span className="material-symbols-outlined text-lg text-white">arrow_forward</span>
                  </Link>
                )}
                {secondary && (
                  <Link
                    href={secondary.href}
                    className="px-8 py-4 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl border border-white/40 backdrop-blur-md transition-all flex items-center gap-2"
                    style={{ color: "#ffffff" }}
                  >
                    {secondary.label}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
