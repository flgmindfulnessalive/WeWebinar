"use client";

import { useEffect, useRef } from "react";

// The lit perspective grid behind the hero. The drawing itself is CSS
// (wefunnels.css); this component only decides where the light is.
//
// Two reasons it is a component rather than a few lines in the page: the
// page is a server component and has to stay one, and the pointer loop
// needs a ref to the element it lights -- reading the pointer on window and
// writing a variable on :root would light every page that happens to use
// the same names.
export function HeroGrid() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    // Asked not to be moved: the CSS already drops every animation, and
    // starting a rAF loop that writes custom properties sixty times a
    // second would be moving it anyway.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) {
      el.style.setProperty("--wf-glow", "0.5");
      return;
    }

    // Where the pointer is, and where the light actually is. They are not
    // the same number on purpose: the light eases towards the pointer each
    // frame, which is the difference between a halo that snaps and one that
    // follows.
    let targetX = 78;
    let targetY = 42;
    let x = targetX;
    let y = targetY;
    let frame = 0;
    let running = false;

    const step = () => {
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;
      el.style.setProperty("--wf-x", `${x.toFixed(2)}%`);
      el.style.setProperty("--wf-y", `${y.toFixed(2)}%`);

      // Settled on the pointer: stop burning frames until it moves again.
      if (Math.abs(targetX - x) < 0.05 && Math.abs(targetY - y) < 0.05) {
        running = false;
        return;
      }
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      // A finger is not a pointer that hovers: it arrives only where it
      // taps, so following it would make the light jump across the hero on
      // every scroll. Touch keeps the ambient drift instead.
      if (event.pointerType === "touch") return;

      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;

      targetX = ((event.clientX - box.left) / box.width) * 100;
      targetY = ((event.clientY - box.top) / box.height) * 100;

      // Hands the variables over from the drift animation to this loop.
      el.dataset.idle = "false";
      el.style.setProperty("--wf-glow", "1");
      start();
    };

    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      el.dataset.idle = "true";
      el.style.removeProperty("--wf-x");
      el.style.removeProperty("--wf-y");
      el.style.setProperty("--wf-glow", "0.5");
    };

    // The section, not the grid: the grid has pointer-events none so that it
    // never swallows a click on the button in front of it.
    const section = el.parentElement ?? el;
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);

    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="wf-grid -z-10"
      data-idle="true"
      style={{ "--wf-glow": 0.5 } as React.CSSProperties}
    >
      <div className="wf-grid__layer wf-grid__base" />
      <div className="wf-grid__bloom" />
      <div className="wf-grid__glow">
        <div className="wf-grid__layer" />
      </div>
    </div>
  );
}
