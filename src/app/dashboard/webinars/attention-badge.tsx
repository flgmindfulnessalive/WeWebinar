import { Badge } from "@/components/ui/badge";

// Shared amber treatment for an attention reason ("Sin video", "Borrador
// hace N días") -- used on the webinars list and the dashboard's "Necesita
// tu atención" card, so the same signal always looks the same.
export function AttentionBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
    >
      {children}
    </Badge>
  );
}
