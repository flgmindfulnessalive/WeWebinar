// Purely decorative background glow for the marketing hero. Two blurred,
// slowly-drifting circles in the brand colors — CSS-only (no JS, no new
// dependency) so it costs nothing on the page beyond a couple of divs.
export function GradientBlobs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="animate-marketing-blob absolute -top-24 left-1/4 size-[28rem] rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--brand)" }}
      />
      <div
        className="animate-marketing-blob absolute top-1/3 right-1/4 size-[24rem] rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--brand-2)", animationDelay: "-8s" }}
      />
    </div>
  );
}
