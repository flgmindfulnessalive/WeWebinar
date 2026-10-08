"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/wefunnels/slug";

export type ReportState = { error: string } | { success: true } | null;

export async function submitWeFunnelReport(
  _prev: ReportState,
  formData: FormData
): Promise<ReportState> {
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const rule = String(formData.get("rule") ?? "").trim().slice(0, 80);
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);

  if (!slug) {
    return { error: "No pudimos identificar la página que estás reportando." };
  }
  if (!rule) {
    return { error: "Elige qué regla crees que incumple." };
  }

  const supabase = await createClient();

  // Definer function: it decides whether the page exists, caps the flood
  // and tells the caller nothing either way. A failure here is ours, not
  // something the reporter can act on, so the screen says the same thing in
  // both cases -- the alternative leaks which names are taken.
  const { error } = await supabase.rpc("wefunnel_report_site", {
    p_slug: slug,
    p_note: `${rule}${note ? ` — ${note}` : ""}`,
  });

  if (error) {
    console.error("[wefunnel] report failed:", error.message);
  }

  return { success: true };
}
