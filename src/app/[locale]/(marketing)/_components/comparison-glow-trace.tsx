"use client";

import { useEffect, useRef, useState } from "react";

// A comet of light chases twice around the WeWebinars card's border, then
// fades and stays off -- fired once when the comparison scrolls into view,
// not a standing decoration. An SVG <rect> stroke (not the live room's
// sliding-gradient-background trick used for GlowCtaBorder) because the
// ask is directional and path-accurate: start near the top badge, run
// clockwise (right along the top, down, left along the bottom, back up),
// which is exactly the path direction a plain rect draws.
export function ComparisonGlowTrace() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = svgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlay(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
    >
      <defs>
        <linearGradient id="comparison-glow-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--brand-2)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="calc(100% - 2px)"
        height="calc(100% - 2px)"
        rx="12"
        ry="12"
        fill="none"
        stroke="url(#comparison-glow-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={1000}
        strokeDasharray="150 1000"
        className={play ? "animate-comparison-glow-trace" : "opacity-0"}
      />
    </svg>
  );
}
