"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import type { ScheduleMode } from "@/lib/supabase/database.types";

export type SchedulingActionState = { error: string } | null;

export async function updateSchedulingMode(
  _prevState: SchedulingActionState,
  formData: FormData
): Promise<SchedulingActionState> {
  const t = await getTranslations("SchedulingActions");
  const webinarId = String(formData.get("webinar_id") ?? "");
  const scheduleMode = String(formData.get("schedule_mode") ?? "") as ScheduleMode;
  const offsetsRaw = String(formData.get("offsets") ?? "");

  if (scheduleMode !== "fixed" && scheduleMode !== "just_in_time" && scheduleMode !== "both") {
    return { error: t("invalidMode") };
  }

  const update: { schedule_mode: ScheduleMode; just_in_time_offsets_minutes?: number[] } = {
    schedule_mode: scheduleMode,
  };

  // A pure fixed-schedule webinar doesn't use offsets — leave the column
  // as-is instead of overwriting it with a throwaway value. "both" needs
  // offsets same as "just_in_time" since either path has to work.
  if (scheduleMode === "just_in_time" || scheduleMode === "both") {
    const offsets = offsetsRaw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (offsets.length === 0) {
      return { error: t("offsetsRequired") };
    }
    update.just_in_time_offsets_minutes = offsets;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("webinars").update(update).eq("id", webinarId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);
  revalidatePath(`/dashboard/webinars/${webinarId}/edit`);

  if (error) return { error: error.message };
  return null;
}

export async function addSchedule(
  _prevState: SchedulingActionState,
  formData: FormData
): Promise<SchedulingActionState> {
  const t = await getTranslations("SchedulingActions");
  const webinarId = String(formData.get("webinar_id") ?? "");
  const dayOfWeekRaw = String(formData.get("day_of_week") ?? "");
  const timeOfDay = String(formData.get("time_of_day") ?? "");
  const timezone = String(formData.get("timezone") ?? "");

  if (!timeOfDay || !timezone) {
    return { error: t("timeAndTimezoneRequired") };
  }

  const dayOfWeek = dayOfWeekRaw === "" ? null : Number(dayOfWeekRaw);
  // Only meaningful for "Todos los días" — a specific weekday is already a
  // single day, weekend or not.
  const excludeWeekends = dayOfWeek === null && formData.get("exclude_weekends") === "on";

  const supabase = await createClient();
  const { error } = await supabase.from("webinar_schedules").insert({
    webinar_id: webinarId,
    day_of_week: dayOfWeek,
    time_of_day: timeOfDay,
    timezone,
    exclude_weekends: excludeWeekends,
  });

  revalidatePath(`/dashboard/webinars/${webinarId}`);
  revalidatePath(`/dashboard/webinars/${webinarId}/edit`);

  if (error) return { error: error.message };
  return null;
}

export async function removeSchedule(
  scheduleId: string,
  webinarId: string
): Promise<SchedulingActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("webinar_schedules")
    .delete()
    .eq("id", scheduleId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);
  revalidatePath(`/dashboard/webinars/${webinarId}/edit`);

  if (error) return { error: error.message };
  return null;
}
