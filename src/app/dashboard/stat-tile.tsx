import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Same accent treatment as the per-webinar Analytics StatTile (indigo top
// bar + colored value, every tile the same accent -- no red/green
// semaphore semantics here either) -- this version also carries an
// optional icon, tinted the same color, since Resumen's tiles predate
// that pattern.
export function StatTile({
  label,
  value,
  sublabel,
  icon: Icon,
  accentColor = "#4f46e5",
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: LucideIcon;
  accentColor?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: accentColor }}
      />
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon && <Icon className="size-4" style={{ color: accentColor }} />}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums" style={{ color: accentColor }}>
          {value}
        </p>
        {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
