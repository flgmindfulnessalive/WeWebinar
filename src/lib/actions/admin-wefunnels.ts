"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

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
