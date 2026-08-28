import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// accentColor defaults to the brand indigo -- every tile carries the same
// accent (no red/green/amber "semaphore" semantics here, by design: a tile
// needing more attention than another is a judgment call for the host to
// make from the number itself, not something the color should pre-decide).
export function StatTile({
  label,
  value,
  sublabel,
  accentColor = "#4f46e5",
}: {
  label: string;
  value: string;
  sublabel?: string;
  accentColor?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: accentColor }}
      />
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums" style={{ color: accentColor }}>
          {value}
        </p>
        {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
