import { Logo } from "@/components/logo";
import { GradientBlobs } from "@/components/gradient-blobs";

// Shown while a route redirects the visitor somewhere else (the marketing
// "Demo" link) or while the destination page's own Supabase queries are
// still in flight (the public registration page has several: account,
// webinar, schedule, presenter, custom domain). Next.js streams this as
// the route's Suspense fallback, so it appears instantly instead of a
// blank white tab during that gap. Same visual language as the rest of
// marketing (grid + brand-color blobs, see opengraph-image.tsx and
// ParallaxBand) so a mid-navigation flash still reads as WeWebinars, not
// as the app breaking.
export function RedirectLoadingScreen({ message }: { message: string }) {
  return (
    <div className="marketing-theme relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#fcfcfd]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(24,24,27,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(24,24,27,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 60% 55% at 50% 50%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 50%, black, transparent)",
        }}
      />
      <GradientBlobs />

      <div className="relative flex flex-col items-center gap-5">
        <Logo variant="badge" className="size-14 shadow-lg" />
        <div
          aria-hidden
          className="size-8 animate-spin rounded-full border-[3px] border-gray-200"
          style={{ borderTopColor: "var(--brand)" }}
        />
        <p className="text-sm font-medium text-gray-500">{message}</p>
      </div>
    </div>
  );
}
