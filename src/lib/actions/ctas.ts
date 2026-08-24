"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { clockToSeconds } from "@/lib/time";
import type { CtaType, Json } from "@/lib/supabase/database.types";

export type CtaActionState = { error: string } | null;

export async function addCta(
  _prevState: CtaActionState,
  formData: FormData
): Promise<CtaActionState> {
  const webinarId = String(formData.get("webinar_id") ?? "");
  const type = String(formData.get("type") ?? "") as CtaType;
  const startClock = String(formData.get("timestamp_start") ?? "");
  const endClock = String(formData.get("timestamp_end") ?? "").trim();

  const timestampStart = clockToSeconds(startClock);
  if (timestampStart === null) {
    return { error: "El inicio debe tener formato mm:ss." };
  }

  let timestampEnd: number | null = null;
  if (endClock) {
    timestampEnd = clockToSeconds(endClock);
    if (timestampEnd === null) {
      return { error: "El fin debe tener formato mm:ss." };
    }
    if (timestampEnd <= timestampStart) {
      return { error: "El fin debe ser posterior al inicio." };
    }
  }

  let config: Json;
  if (type === "link") {
    const text = String(formData.get("link_text") ?? "").trim();
    const url = String(formData.get("link_url") ?? "").trim();
    const style = String(formData.get("link_style") ?? "banner");
    if (!text || !url) {
      return { error: "El texto y la URL del botón son obligatorios." };
    }
    config = { text, url, style };
  } else if (type === "overlay") {
    const text = String(formData.get("overlay_text") ?? "").trim();
    const imageUrl = String(formData.get("overlay_image_url") ?? "").trim();
    if (!text && !imageUrl) {
      return { error: "Agrega un texto o una imagen para el overlay." };
    }
    config = { text: text || null, image_url: imageUrl || null };
  } else if (type === "poll") {
    const question = String(formData.get("poll_question") ?? "").trim();
    const options = String(formData.get("poll_options") ?? "")
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (!question || options.length < 2) {
      return { error: "La encuesta necesita una pregunta y al menos 2 opciones." };
    }
    config = { question, options };
  } else {
    return { error: "Tipo de CTA inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ctas").insert({
    webinar_id: webinarId,
    type,
    timestamp_start_seconds: timestampStart,
    timestamp_end_seconds: timestampEnd,
    config,
  });

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) return { error: error.message };
  return null;
}

export async function removeCta(ctaId: string, webinarId: string): Promise<CtaActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("ctas").delete().eq("id", ctaId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) return { error: error.message };
  return null;
}
