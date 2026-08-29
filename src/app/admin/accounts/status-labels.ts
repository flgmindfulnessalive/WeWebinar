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
