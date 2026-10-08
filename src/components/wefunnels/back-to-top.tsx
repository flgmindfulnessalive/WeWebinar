"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

// The way back up. The landing's header does not follow the page, so once
// somebody jumps to Precio or Preguntas from the menu the only way back is
// scrolling the whole way -- which on a phone is most of the page.
//
// It appears after the hero rather than straight away: at the top it would
// be a button offering to take you where you already are.
const APPEARS_AFTER = 620;

export function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Passive and rAF-throttled: this runs on every scroll frame of every
    // visit, and it only ever compares one number.
    let frame = 0;
    const read = () => {
      frame = 0;
      setShown(window.scrollY > APPEARS_AFTER);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const toTop = () => {
    // Asked not to be moved: jump instead of gliding. The CSS turns the
    // anchor links' smooth scrolling off for the same reason, and a button
    // that ignored it would be the one thing on the page still sliding.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Volver arriba"
      // Out of the tab order and out of the accessibility tree while it is
      // invisible: a button nobody can see should not be the next thing the
      // keyboard lands on.
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      className={`wf-top ${shown ? "is-shown" : ""}`}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
