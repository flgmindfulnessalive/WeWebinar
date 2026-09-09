import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PartnerStage } from "@/lib/supabase/database.types";

// Agrupa las 12 etapas en 4 familias visuales -- no un color por etapa
// (ilegible), pero sí suficiente para escanear la lista de un vistazo.
const STAGE_GROUP: Record<PartnerStage, "new" | "engaged" | "won" | "closed"> = {
  discovered: "new",
  qualified: "new",
  high_fit: "engaged",
  ready_to_contact: "engaged",
  contacted: "engaged",
  replied: "engaged",
  interested: "engaged",
  negotiating: "engaged",
  agreed: "won",
  active_partner: "won",
  inactive: "closed",
  rejected: "closed",
};

const GROUP_CLASS: Record<string, string> = {
  new: "border-muted-foreground/30 text-muted-foreground",
  engaged: "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300",
  won: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed: "border-transparent bg-muted text-muted-foreground",
};

export function StageBadge({ stage, label }: { stage: PartnerStage; label: string }) {
  return <Badge variant="outline" className={cn(GROUP_CLASS[STAGE_GROUP[stage]])}>{label}</Badge>;
}
