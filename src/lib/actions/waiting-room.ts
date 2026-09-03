"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type WaitingRoomActionState = { error: string } | null;

// Sane guardrails on the manual override -- not the DB check constraint's
// job to also cap the upper end, since 0..N is otherwise a valid range.
const FAKE_VIEWER_HARD_CAP = 5000;

export async function upsertWaitingRoom(
  _prevState: WaitingRoomActionState,
  formData: FormData
): Promise<WaitingRoomActionState> {
  const webinarId = String(formData.get("webinar_id") ?? "");
  const headline = String(formData.get("headline") ?? "").trim();
  const subheadline = String(formData.get("subheadline") ?? "").trim();
  const backgroundUrl = String(formData.get("background_url") ?? "").trim();
  const backgroundTypeRaw = String(formData.get("background_type") ?? "image");
  const backgroundType: "image" | "video" =
    backgroundTypeRaw === "video" ? "video" : "image";
  // Deliberately light validation, same reasoning as parseDirectVideoUrl --
  // any https URL is accepted here, and PromoVideoEmbed sorts out at render
  // time whether it's YouTube, Vimeo, or a direct file.
  const promoVideoUrlRaw = String(formData.get("promo_video_url") ?? "").trim();
  const promoVideoUrl = /^https:\/\//.test(promoVideoUrlRaw) ? promoVideoUrlRaw : "";
  const showCalendarButton = formData.get("show_calendar_button") === "on";
  const showFakeCounter = formData.get("show_fake_counter") === "on";

  const bullets = String(formData.get("bullets") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const testimonials = String(formData.get("testimonials") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(":");
      return rest.length > 0
        ? { name: name.trim(), text: rest.join(":").trim() }
        : { name: "", text: line };
    });

  // Manual override of the fake viewer range (webinars table, not
  // waiting_room_config) -- lives in this same form since it's the natural
  // neighbor of "mostrar contador falso" above. Falls back to clamping
  // rather than rejecting the save outright: a blank/garbled number field
  // shouldn't block saving the rest of the waiting room.
  const rawMin = Number(formData.get("fake_viewer_min"));
  const rawMax = Number(formData.get("fake_viewer_max"));
  const fakeViewerMin = Number.isFinite(rawMin)
    ? Math.min(FAKE_VIEWER_HARD_CAP, Math.max(0, Math.round(rawMin)))
    : 0;
  const fakeViewerMax = Number.isFinite(rawMax)
    ? Math.min(FAKE_VIEWER_HARD_CAP, Math.max(fakeViewerMin, Math.round(rawMax)))
    : Math.max(fakeViewerMin, 1);

  const supabase = await createClient();
  const [{ error }, { error: webinarError }] = await Promise.all([
    supabase.from("waiting_room_config").upsert(
      {
        webinar_id: webinarId,
        headline: headline || null,
        subheadline: subheadline || null,
        background_url: backgroundUrl || null,
        background_type: backgroundUrl ? backgroundType : null,
        promo_video_url: promoVideoUrl || null,
        show_calendar_button: showCalendarButton,
        show_fake_counter: showFakeCounter,
        bullets,
        testimonials,
      },
      { onConflict: "webinar_id" }
    ),
    supabase
      .from("webinars")
      .update({ fake_viewer_min: fakeViewerMin, fake_viewer_max: fakeViewerMax })
      .eq("id", webinarId),
  ]);

  revalidatePath(`/dashboard/webinars/${webinarId}`);
  revalidatePath(`/dashboard/webinars/${webinarId}/edit`);

  if (error) return { error: error.message };
  if (webinarError) return { error: webinarError.message };
  return null;
}
