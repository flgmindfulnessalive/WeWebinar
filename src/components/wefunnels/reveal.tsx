"use client";

import { useEffect } from "react";

// Turns the scroll reveal on. Nothing renders: the component exists so that
// the page stays a server component and so that the markup, read on its own,
// is a complete page -- [data-reveal] is hidden only once .wf-js is on the
// root, which only happens here. Without JavaScript nothing is hidden and
// nothing has to be revealed.
export function Reveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".wf");
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (targets.length === 0) return;

    root.classList.add("wf-js");

    // The hero carries no [data-reveal] on purpose, so the first thing a
    // visitor sees is never waiting on this observer. Everything below it
    // arrives as it is scrolled to, once each.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
    );

    for (const target of targets) observer.observe(target);

    return () => {
      observer.disconnect();
      root.classList.remove("wf-js");
    };
  }, []);

  return null;
}
