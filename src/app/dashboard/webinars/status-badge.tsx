import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import type { WebinarStatus } from "@/lib/supabase/database.types";

const VARIANTS: Record<WebinarStatus, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

export async function StatusBadge({ status }: { status: WebinarStatus }) {
  const t = await getTranslations("WebinarStatusLabel");
  return <Badge variant={VARIANTS[status]}>{t(status)}</Badge>;
}
