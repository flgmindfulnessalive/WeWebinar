import type { SubscriptionStatus, UserRole, WebinarStatus } from "@/lib/supabase/database.types";

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "Trial",
  active: "Activa",
  past_due: "Vencida",
  suspended: "Suspendida",
  canceled: "Cancelada",
};

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

export const WEBINAR_STATUS_LABEL: Record<WebinarStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};
