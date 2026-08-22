"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type WaitingRoomActionState = { error: string } | null;

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

  const supabase = await createClient();
  const { error } = await supabase.from("waiting_room_config").upsert(
    {
      webinar_id: webinarId,
      headline: headline || null,
      subheadline: subheadline || null,
      background_url: backgroundUrl || null,
      background_type: backgroundUrl ? backgroundType : null,
      show_calendar_button: showCalendarButton,
      show_fake_counter: showFakeCounter,
      bullets,
      testimonials,
    },
    { onConflict: "webinar_id" }
  );

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) return { error: error.message };
  return null;
}
