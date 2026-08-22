import { Badge } from "@/components/ui/badge";
import type { WebinarStatus } from "@/lib/supabase/database.types";

const LABELS: Record<WebinarStatus, string> = {
  draft: "Borrador",
  published: "Activo",
  archived: "Archivado",
};

const VARIANTS: Record<WebinarStatus, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

export function StatusBadge({ status }: { status: WebinarStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
