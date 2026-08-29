"use client";

import { useEffect, useRef } from "react";

// A small, soft turquoise light that follows the cursor across the hero
// section -- layered above the static GradientBlobs, purely decorative.
// Deliberately a color of its own (not var(--brand), which is the
// indigo/magenta used for buttons, gradient text, and the blobs) so it
// reads as a distinct accent rather than more of the same brand wash.
// Tight radius + a blur filter so it reads as a fine, modern glow
// "behind" the content rather than a flat colored disc. Tracks the
// pointer via a CSS custom property set directly on the node (no React
// state/re-render per mouse move) and stays invisible (opacity 0) until
// the pointer actually enters the section, so there's no flash at a
// default position on load.
//
// Expects to be rendered as a direct child of the positioned section it
// should track (matches how GradientBlobs is used) -- it reads that
// parent to size/scope the pointer listener.
const SPOTLIGHT_COLOR = "#2dd4bf"; // turquoise (Tailwind teal-400)

export function MouseSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = ref.current?.parentElement;
    if (!section) return;

    function handleMove(e: PointerEvent) {
      const rect = section!.getBoundingClientRect();
      const node = ref.current;
      if (!node) return;
      node.style.setProperty("--spotlight-x", `${e.clientX - rect.left}px`);
      node.style.setProperty("--spotlight-y", `${e.clientY - rect.top}px`);
      node.style.setProperty("--spotlight-opacity", "0.7");
    }
    function handleLeave() {
      ref.current?.style.setProperty("--spotlight-opacity", "0");
    }

    section.addEventListener("pointermove", handleMove);
    section.addEventListener("pointerleave", handleLeave);
    return () => {
      section.removeEventListener("pointermove", handleMove);
      section.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300"
      style={{
        opacity: "var(--spotlight-opacity, 0)",
        background: `radial-gradient(220px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), color-mix(in srgb, ${SPOTLIGHT_COLOR} 14%, transparent), transparent 60%)`,
        filter: "blur(30px)",
      }}
    />
  );
}
