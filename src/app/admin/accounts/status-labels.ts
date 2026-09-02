import type { SubscriptionStatus, UserRole } from "@/lib/supabase/database.types";

export const STATUS_VARIANT: Record<
  SubscriptionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  trialing: "outline",
  active: "default",
  past_due: "destructive",
  suspended: "destructive",
  canceled: "secondary",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

// Customer Health Score tiers (get_account_health_scores) -- a high score
// means low churn risk, so the colors run the opposite direction from
// lead-scoring's caliente/tibio/frio chips: red is bad here, not hot/good.
export const HEALTH_TIER_CLASSES: Record<string, string> = {
  riesgo:
    "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  atencion:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  saludable:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export const HEALTH_TIER_LABEL_KEYS: Record<string, "healthRiesgo" | "healthAtencion" | "healthSaludable"> = {
  riesgo: "healthRiesgo",
  atencion: "healthAtencion",
  saludable: "healthSaludable",
};
