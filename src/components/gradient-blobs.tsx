// Purely decorative background glow -- two blurred, slowly-drifting circles
// in the given brand colors. CSS-only (no JS, no new dependency). Shared by
// the marketing hero and any other page that wants the same atmosphere
// (registration, waiting room) with its own two colors, e.g. an account's
// branding.color_primario/color_secundario instead of the fixed default.
export function GradientBlobs({
  colorA = "#4f46e5",
  colorB = "#c026d3",
}: {
  colorA?: string;
  colorB?: string;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="animate-marketing-blob absolute -top-24 left-1/4 size-[28rem] rounded-full opacity-30 blur-3xl"
        style={{ background: colorA }}
      />
      <div
        className="animate-marketing-blob absolute top-1/3 right-1/4 size-[24rem] rounded-full opacity-20 blur-3xl"
        style={{ background: colorB, animationDelay: "-8s" }}
      />
    </div>
  );
}
