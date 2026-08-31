import type { getTranslations } from "next-intl/server";

// Shared by the Webinars list (badge per row) and the dashboard's "Necesita
// tu atención" card -- one source of truth for what counts as needing a
// host's attention, so the two screens never disagree about it.
export const STALE_DRAFT_DAYS = 3;

type AttentionWebinar = {
  status: string;
  video_source: string | null;
  created_at: string;
};

export function attentionReason(
  webinar: AttentionWebinar,
  t: Awaited<ReturnType<typeof getTranslations<"WebinarAttention">>>
): string | null {
  if (webinar.status !== "draft") return null;
  if (!webinar.video_source) return t("noVideo");
  const days = Math.floor((Date.now() - new Date(webinar.created_at).getTime()) / 86_400_000);
  if (days >= STALE_DRAFT_DAYS) return t("staleDraft", { days });
  return null;
}
