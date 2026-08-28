"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { clockToSeconds, secondsToClock } from "@/lib/time";
import type { ChatMessageType } from "@/lib/supabase/database.types";

export type ChatActionState = { error: string } | null;

export async function addChatMessage(
  _prevState: ChatActionState,
  formData: FormData
): Promise<ChatActionState> {
  const webinarId = String(formData.get("webinar_id") ?? "");
  const clock = String(formData.get("timestamp") ?? "");
  const fakeName = String(formData.get("fake_name") ?? "").trim();
  const messageText = String(formData.get("message_text") ?? "").trim();
  const messageType = String(formData.get("message_type") ?? "message") as ChatMessageType;

  const timestampSeconds = clockToSeconds(clock);
  if (timestampSeconds === null) {
    return { error: "El timestamp debe tener formato mm:ss." };
  }
  if (!fakeName || !messageText) {
    return { error: "Nombre y mensaje son obligatorios." };
  }

  const supabase = await createClient();

  // Without this, a message timed past the video's own length just sits
  // in the list looking active but never fires in the live room (it's
  // filtered by elapsed video time) -- easy to end up with silently
  // after replacing the video with a shorter one.
  const { data: webinar } = await supabase
    .from("webinars")
    .select("duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();
  if (webinar?.duration_seconds && timestampSeconds > webinar.duration_seconds) {
    return {
      error: `El video dura ${secondsToClock(webinar.duration_seconds)} -- elige un momento dentro de ese rango.`,
    };
  }

  const { error } = await supabase.from("chat_messages").insert({
    webinar_id: webinarId,
    timestamp_seconds: timestampSeconds,
    fake_name: fakeName,
    message_text: messageText,
    message_type: messageType,
  });

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) return { error: error.message };
  return null;
}

export async function removeChatMessage(
  messageId: string,
  webinarId: string
): Promise<ChatActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) return { error: error.message };
  return null;
}

// webinars already has an UPDATE RLS policy for account owners/editors, so
// this needs no dedicated RPC -- same pattern as updateSchedulingMode.
export async function updateAiChatEnabled(
  webinarId: string,
  enabled: boolean
): Promise<ChatActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("webinars")
    .update({ ai_chat_enabled: enabled })
    .eq("id", webinarId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) {
    if (error.message.includes("plan_feature_blocked")) {
      return {
        error:
          "El agente AI de respuestas está disponible en los planes Pro y Business. Actualiza tu plan desde Facturación para activarlo.",
      };
    }
    return { error: error.message };
  }
  return null;
}

export async function updateAiTrainingInfo(
  _prevState: ChatActionState,
  formData: FormData
): Promise<ChatActionState> {
  const webinarId = String(formData.get("webinar_id") ?? "");
  const trainingInfo = String(formData.get("ai_agent_training_info") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("webinars")
    .update({ ai_agent_training_info: trainingInfo || null })
    .eq("id", webinarId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) return { error: error.message };
  return null;
}
