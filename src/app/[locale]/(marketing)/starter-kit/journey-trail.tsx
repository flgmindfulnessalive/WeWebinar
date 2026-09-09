"use client";

import { useEffect, useRef } from "react";

// "Tu recorrido" timeline -- deliberately not the hero benefit icons'
// hover-triggered gradient fill (that's already the trick used right above
// this section). Here the connector line draws itself in as the list
// scrolls into view, like a route being traced, and each step's circle
// emits a one-time signal ring when reached instead of swapping to a solid
// color. Different trigger (scroll vs. hover) and a different visual
// (a sharpening outline + a pulse, not a color-inverted badge).
//
// One shared IntersectionObserver (not one per <li>) mutates the DOM
// directly via refs/attributes rather than React state, since re-rendering
// on every step crossing the viewport buys nothing here.
export function JourneyTrail({
  children,
  stepCount,
}: {
  children: React.ReactNode;
  stepCount: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const steps = Array.from(container.querySelectorAll<HTMLElement>("[data-journey-step]"));
    if (steps.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      steps.forEach((step) => step.setAttribute("data-journey-active", "true"));
      container.style.setProperty("--journey-progress", "100%");
      return;
    }

    let visited = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          visited += 1;
          container.style.setProperty("--journey-progress", `${(visited / stepCount) * 100}%`);
          el.setAttribute("data-journey-active", "true");
          observer.unobserve(el);
        }
      },
      { threshold: 0.55 }
    );
    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, [stepCount]);

  return (
    <div ref={containerRef} className="relative mx-auto max-w-2xl">
      <div aria-hidden className="absolute top-2 bottom-2 left-6 w-px" style={{ background: "var(--border)" }} />
      <div
        aria-hidden
        className="absolute top-2 left-6 w-px transition-[height] duration-700 ease-out"
        style={{
          height: "var(--journey-progress, 0%)",
          background: "linear-gradient(180deg, var(--brand), var(--brand-2))",
          boxShadow: "0 0 8px 0 color-mix(in srgb, var(--brand) 55%, transparent)",
        }}
      />
      {children}
    </div>
  );
}
