"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { clockToSeconds, secondsToClock } from "@/lib/time";
import type { CtaType, Json } from "@/lib/supabase/database.types";

export type CtaActionState = { error: string } | null;

type ParsedCta = {
  type: CtaType;
  timestampStart: number;
  timestampEnd: number | null;
  config: Json;
};

// Shared by addCta and updateCta -- same fields, same validation, the only
// difference is insert vs. update. Keeping one copy means a validation rule
// added for "add" can't silently go missing from "edit".
async function parseCtaFormData(
  formData: FormData,
  durationSeconds: number | null,
  t: Awaited<ReturnType<typeof getTranslations<"CtaActions">>>
): Promise<{ error: string } | ParsedCta> {
  const type = String(formData.get("type") ?? "") as CtaType;
  const startClock = String(formData.get("timestamp_start") ?? "");
  const endClock = String(formData.get("timestamp_end") ?? "").trim();

  const timestampStart = clockToSeconds(startClock);
  if (timestampStart === null) {
    return { error: t("invalidStartFormat") };
  }

  let timestampEnd: number | null = null;
  if (endClock) {
    timestampEnd = clockToSeconds(endClock);
    if (timestampEnd === null) {
      return { error: t("invalidEndFormat") };
    }
    if (timestampEnd <= timestampStart) {
      return { error: t("endAfterStart") };
    }
  }

  // A CTA timed past the video's own length never fires in the live room
  // (filtered by elapsed video time), but sits in the list looking active --
  // easy to end up with silently after replacing the video with a shorter one.
  if (durationSeconds) {
    const maxTimestamp = timestampEnd ?? timestampStart;
    if (maxTimestamp > durationSeconds) {
      return { error: t("timestampBeyondVideo", { duration: secondsToClock(durationSeconds) }) };
    }
  }

  let config: Json;
  if (type === "link") {
    const text = String(formData.get("link_text") ?? "").trim();
    const url = String(formData.get("link_url") ?? "").trim();
    const style = String(formData.get("link_style") ?? "banner");
    if (!text || !url) {
      return { error: t("linkTextAndUrlRequired") };
    }
    // The live room renders this straight into an <a href> for every
    // attendee (live-room-client.tsx) -- without this, a "javascript:" (or
    // similar) URL saved here would execute in each viewer's session on
    // click.
    if (!/^https?:\/\//i.test(url)) {
      return { error: t("urlMustBeHttp") };
    }
    const scarcityRaw = String(formData.get("link_scarcity_minutes") ?? "").trim();
    let scarcityMinutes: number | null = null;
    if (scarcityRaw) {
      scarcityMinutes = Number(scarcityRaw);
      if (!Number.isInteger(scarcityMinutes) || scarcityMinutes < 1) {
        return { error: t("invalidScarcityMinutes") };
      }
    }
    config = { text, url, style, scarcity_minutes: scarcityMinutes };
  } else if (type === "overlay") {
    const text = String(formData.get("overlay_text") ?? "").trim();
    const imageUrl = String(formData.get("overlay_image_url") ?? "").trim();
    const linkUrl = String(formData.get("overlay_link_url") ?? "").trim();
    if (!text && !imageUrl) {
      return { error: t("overlayNeedsContent") };
    }
    // Same reasoning as the link CTA's URL check -- this also renders
    // straight into an <a href> for every attendee.
    if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
      return { error: t("urlMustBeHttp") };
    }
    config = { text: text || null, image_url: imageUrl || null, url: linkUrl || null };
  } else if (type === "poll") {
    const question = String(formData.get("poll_question") ?? "").trim();
    const options = String(formData.get("poll_options") ?? "")
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (!question || options.length < 2) {
      return { error: t("pollNeedsQuestionAndOptions") };
    }
    config = { question, options };
  } else {
    return { error: t("invalidCtaType") };
  }

  return { type, timestampStart, timestampEnd, config };
}

export async function addCta(
  _prevState: CtaActionState,
  formData: FormData
): Promise<CtaActionState> {
  const t = await getTranslations("CtaActions");
  const webinarId = String(formData.get("webinar_id") ?? "");
  const supabase = await createClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();

  const parsed = await parseCtaFormData(formData, webinar?.duration_seconds ?? null, t);
  if ("error" in parsed) return parsed;

  const { error } = await supabase.from("ctas").insert({
    webinar_id: webinarId,
    type: parsed.type,
    timestamp_start_seconds: parsed.timestampStart,
    timestamp_end_seconds: parsed.timestampEnd,
    config: parsed.config,
  });

  revalidatePath(`/dashboard/webinars/${webinarId}`);
  revalidatePath(`/dashboard/webinars/${webinarId}/edit`);

  if (error) return { error: error.message };
  return null;
}

// Updates the existing row in place (same id) instead of the old
// delete-then-add "edit" workflow -- that path silently orphaned every past
// click on the CTA: viewer_events stores the click against the CTA's id, so
// a delete+recreate left the click history with no live CTA to attach to
// (still counted in the webinar-wide funnel, invisible in the per-CTA
// breakdown). Editing in place keeps the id, so accumulated clicks stay
// attributed to the CTA even as its copy/timing changes.
export async function updateCta(
  _prevState: CtaActionState,
  formData: FormData
): Promise<CtaActionState> {
  const t = await getTranslations("CtaActions");
  const webinarId = String(formData.get("webinar_id") ?? "");
  const ctaId = String(formData.get("cta_id") ?? "");
  const supabase = await createClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();

  const parsed = await parseCtaFormData(formData, webinar?.duration_seconds ?? null, t);
  if ("error" in parsed) return parsed;

  const { error } = await supabase
    .from("ctas")
    .update({
      type: parsed.type,
      timestamp_start_seconds: parsed.timestampStart,
      timestamp_end_seconds: parsed.timestampEnd,
      config: parsed.config,
    })
    .eq("id", ctaId)
    .eq("webinar_id", webinarId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);
  revalidatePath(`/dashboard/webinars/${webinarId}/edit`);

  if (error) return { error: error.message };
  return null;
}

export async function removeCta(ctaId: string, webinarId: string): Promise<CtaActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("ctas").delete().eq("id", ctaId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);
  revalidatePath(`/dashboard/webinars/${webinarId}/edit`);

  if (error) return { error: error.message };
  return null;
}
