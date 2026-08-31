"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

// Full-bleed brand-gradient section used at the two conversion moments
// (pricing teaser, final CTA) -- a grid layer and a blob layer drift at
// different speeds as the section crosses the viewport, with a dark
// translucent overlay so the content stays readable over the texture.
// Plain CSS custom properties driven directly on the layer nodes (no React
// state per scroll tick), same approach as MouseSpotlight. Respects
// prefers-reduced-motion by simply never starting the scroll listener --
// the layers still render, just static.
export function ParallaxBand({
  children,
  accent = "#ffd166",
  className,
}: {
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    function update() {
      raf = 0;
      const section = sectionRef.current;
      const grid = gridRef.current;
      const blob = blobRef.current;
      if (!section || !grid || !blob) return;
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      grid.style.transform = `translateY(${(progress - 0.5) * 120 * 0.12}px)`;
      blob.style.transform = `translateY(${(progress - 0.5) * 120 * 0.25}px)`;
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className={cn("relative overflow-hidden py-24 text-white", className)}
      style={{ background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 45%, var(--brand-2) 100%)" }}
    >
      <div
        ref={gridRef}
        aria-hidden
        className="pointer-events-none absolute -inset-x-[10%] -inset-y-[15%] will-change-transform"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.14) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
        }}
      />
      <div ref={blobRef} aria-hidden className="pointer-events-none absolute -inset-x-[10%] -inset-y-[15%] will-change-transform">
        <div
          className="absolute -top-24 left-[6%] size-[26rem] rounded-full opacity-[0.16] blur-3xl"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 right-[8%] size-[22rem] rounded-full opacity-[0.18] blur-3xl"
          style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
        />
      </div>
      <div aria-hidden className="absolute inset-0" style={{ background: "rgba(11,10,26,.28)" }} />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
