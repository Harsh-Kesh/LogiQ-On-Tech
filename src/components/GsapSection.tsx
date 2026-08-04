"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface GsapSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  fullScreen?: boolean;
  scrub?: boolean | number;
  stagger?: number;
  duration?: number;
  start?: string;
  end?: string;
}

export default function GsapSection({
  children,
  className = "",
  id,
  fullScreen = true,
  scrub = false,
  stagger = 0.06,
  duration = 0.45,
  start = "top 92%",
  end = "bottom 15%",
}: GsapSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const items = el.querySelectorAll(".gsap-animate");
    const targets = items.length > 0 ? Array.from(items) : [el];

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        {
          opacity: 0,
          y: 24,
          scale: 0.98,
          filter: "blur(4px)",
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration,
          stagger,
          ease: "power2.out",
          overwrite: "auto",
          scrollTrigger: {
            trigger: el,
            start,
            end,
            scrub: scrub ? (typeof scrub === "number" ? scrub : 0.5) : false,
            toggleActions: scrub ? undefined : "play none none reverse",
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [scrub, stagger, duration, start, end]);

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`${fullScreen ? "min-h-screen flex flex-col justify-center py-20" : "py-20"} ${className}`}
    >
      {children}
    </section>
  );
}
