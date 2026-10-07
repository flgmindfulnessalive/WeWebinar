"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { courseTemplateWebinarId } from "@/lib/wefunnels/course-room";

export type ModerationState = { error: string } | { success: true } | null;

// Both RPCs check is_platform_admin() themselves. That check lives in the
// database rather than only here because these are the calls that take a
// stranger's page off the internet: the authority to make them should not
// depend on which route happened to invoke them.

export async function setSiteSuspended(
  _prev: ModerationState,
  formData: FormData
): Promise<ModerationState> {
  const siteId = String(formData.get("siteId") ?? "");
  const suspended = formData.get("suspended") === "true";
  const rule = String(formData.get("rule") ?? "manual").trim().slice(0, 80);
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);

  if (!siteId) return { error: "Falta la página." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_set_suspended", {
    p_site_id: siteId,
    p_suspended: suspended,
    p_rule: rule || "manual",
    p_note: note || undefined,
  });

  if (error) {
    console.error("[wefunnel/admin] suspend failed:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/wefunnels");
  return { success: true };
}

export async function clearReview(
  _prev: ModerationState,
  formData: FormData
): Promise<ModerationState> {
  const reviewId = String(formData.get("reviewId") ?? "");
  if (!reviewId) return { error: "Falta el aviso." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_clear_review", {
    p_review_id: reviewId,
  });

  if (error) {
    console.error("[wefunnel/admin] clear failed:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/wefunnels");
  return { success: true };
}

export type MountRoomsState = { error: string } | { mounted: number } | null;

// Mounts the course room for every distributor who still has none.
//
// It exists because the tier shipped before the course was recorded: those
// buyers' webhooks have already come and gone, and nothing else will ever
// fire for them. Run it once after publishing the course, and again after
// any stretch where the template id was unset. Safe to repeat -- the RPC
// returns the existing room rather than making a second one, so the count
// it reports is rooms actually created, not distributors looked at.
export async function mountMissingCourseRooms(): Promise<MountRoomsState> {
  const sourceId = courseTemplateWebinarId();
  if (!sourceId) {
    return { error: "Falta WEFUNNELS_COURSE_WEBINAR_ID: no hay curso que copiar." };
  }

  // The user's own client, not the service role: the RPC checks
  // is_platform_admin() itself, the same way the moderation ones do.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("wefunnel_mount_missing_course_rooms", {
    p_source_webinar_id: sourceId,
  });

  if (error) {
    console.error("[wefunnel/admin] course room backfill failed:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/wefunnels");
  return { mounted: data ?? 0 };
}
