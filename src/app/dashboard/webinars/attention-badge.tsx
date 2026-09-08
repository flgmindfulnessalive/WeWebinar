import { Badge } from "@/components/ui/badge";

// Shared treatment for an attention reason ("Sin video", "Borrador hace N
// días") -- used on the webinars list and the dashboard's "Necesita tu
// atención" card, so the same signal always looks the same. Amber in light
// mode; indigo in dark mode, matching the rest of the backoffice's dark
// palette (amber-950 read as a reddish alarm against the near-black
// background instead of a neutral notification).
export function AttentionBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="border-amber-300 bg-amber-50 text-amber-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
    >
      {children}
    </Badge>
  );
}
