import { cn } from "@/lib/utils";

// Classic "fixed background" parallax: the photo is pinned to the viewport
// (background-attachment: fixed) instead of scrolling with the page, so as
// the section's content passes over it the image itself stays completely
// still -- no scroll listener or transform needed, just CSS. Scoped to
// md+: iOS Safari (and some older Android browsers) don't honor a fixed
// attachment on a background image once it's inside a scrolling container
// -- it silently falls back to scroll behavior there anyway, so bg-scroll
// on mobile is the correct, deliberate default rather than a broken fixed
// attempt.
// Darkens the photo just enough for white text to stay legible over it --
// the multiplier below (applied to the three stops) is how each call site
// tunes that tradeoff without every section having to redo the gradient.
const BASE_OVERLAY_STOPS = [0.72, 0.8, 0.72] as const;

export function ImageParallaxSection({
  children,
  src,
  className,
  overlayOpacity = 1,
}: {
  children: React.ReactNode;
  src: string;
  className?: string;
  /** Multiplier (0-1) on the default overlay darkness -- lower shows more of the photo through. Defaults to 1 (unchanged). */
  overlayOpacity?: number;
}) {
  const [top, mid, bottom] = BASE_OVERLAY_STOPS.map((stop) => stop * overlayOpacity);
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-scroll bg-cover bg-center bg-no-repeat py-24 md:bg-fixed",
        className
      )}
      style={{ backgroundImage: `url(${src})` }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(11,10,26,${top}) 0%, rgba(15,13,33,${mid}) 55%, rgba(11,10,26,${bottom}) 100%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
