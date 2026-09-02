"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

// Same scroll-linked transform technique as ParallaxBand (progress-based,
// rAF-throttled, no React state per tick), applied to a photo instead of a
// gradient/grid/blob stack: the image sits oversized in an overflow-hidden
// wrapper so it has room to drift without exposing its edges, and a dark
// scrim over it guarantees the (light) text stays readable regardless of
// how bright any given region of the photo is. Respects
// prefers-reduced-motion by never starting the scroll listener -- the
// image still renders, just static.
export function ImageParallaxSection({
  children,
  src,
  alt,
  className,
}: {
  children: React.ReactNode;
  src: string;
  alt: string;
  className?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    function update() {
      raf = 0;
      const section = sectionRef.current;
      const image = imageRef.current;
      if (!section || !image) return;
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      image.style.transform = `translateY(${(progress - 0.5) * 120 * 0.35}px)`;
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={sectionRef} className={cn("relative overflow-hidden py-24", className)}>
      <div ref={imageRef} aria-hidden className="absolute -inset-y-[18%] inset-x-0 will-change-transform">
        <Image src={src} alt={alt} fill sizes="100vw" className="object-cover" priority={false} />
      </div>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,10,26,.72) 0%, rgba(15,13,33,.8) 55%, rgba(11,10,26,.72) 100%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
