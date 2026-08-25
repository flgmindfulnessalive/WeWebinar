import { cn } from "@/lib/utils";

// Brand mark used next to the "WeWebinars" wordmark in the dashboard/admin
// nav. Same gradient as the branded loading cover in
// locked-youtube-player.tsx, kept as one small reusable piece instead of
// duplicating the style in every nav.
export function Logo({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-xs font-bold text-white",
        className
      )}
    >
      W
    </div>
  );
}
