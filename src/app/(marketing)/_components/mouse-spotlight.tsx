"use client";

import { useEffect, useRef } from "react";

// A soft brand-colored light that follows the cursor across the hero
// section -- layered above the static GradientBlobs, purely decorative.
// Tracks the pointer via a CSS custom property set directly on the node
// (no React state/re-render per mouse move) and stays invisible (opacity
// 0) until the pointer actually enters the section, so there's no flash
// at a default position on load.
//
// Expects to be rendered as a direct child of the positioned section it
// should track (matches how GradientBlobs is used) -- it reads that
// parent to size/scope the pointer listener.
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
      node.style.setProperty("--spotlight-opacity", "1");
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
        background:
          "radial-gradient(500px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), color-mix(in srgb, var(--brand) 25%, transparent), transparent 70%)",
      }}
    />
  );
}
