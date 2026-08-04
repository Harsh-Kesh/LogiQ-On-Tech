import { TextAnimate } from "@/components/ui/text-animate";

interface SectionIntroProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  /** Narrower measure for short ledes; the home page uses 4xl–5xl. */
  ledeWidth?: "4xl" | "5xl" | "3xl";
  dark?: boolean;
}

const LEDE_WIDTH = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
} as const;

/**
 * Centred, word-by-word animated section header — the home page's signature
 * rhythm for statement sections.
 */
export default function SectionIntro({
  eyebrow,
  title,
  lede,
  ledeWidth = "4xl",
  dark = false,
}: SectionIntroProps) {
  return (
    <>
      {eyebrow && (
        <TextAnimate
          by="word"
          animation="wavy"
          as="span"
          startOnView
          once={false}
          duration={0.25}
          className={`text-xs md:text-sm font-bold uppercase tracking-[0.25em] mb-4 block text-center ${
            dark ? "text-indigo-300" : "text-indigo-600"
          }`}
        >
          {eyebrow}
        </TextAnimate>
      )}
      <TextAnimate
        by="word"
        animation="wavy"
        as="h2"
        startOnView
        once={false}
        duration={0.3}
        className={`text-4xl md:text-5xl font-extrabold mb-8 text-center tracking-tight leading-tight ${
          dark ? "text-white" : "text-slate-950"
        }`}
        // globals.css sets an unlayered `h1–h4 { color: var(--ink) }`, which
        // outranks Tailwind's layered utilities — headings need inline colour.
        style={dark ? { color: "#ffffff" } : undefined}
      >
        {title}
      </TextAnimate>
      {lede && (
        <TextAnimate
          by="word"
          animation="wavy"
          as="p"
          startOnView
          once={false}
          delay={0.05}
          duration={0.35}
          className={`text-lg md:text-xl leading-[2.2] ${LEDE_WIDTH[ledeWidth]} mx-auto text-center font-normal ${
            dark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {lede}
        </TextAnimate>
      )}
    </>
  );
}
