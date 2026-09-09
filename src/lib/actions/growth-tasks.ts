"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { requireGrowthOperator, canEditPartnerEngine } from "@/lib/data/growth";
import type { Database, Json } from "@/lib/supabase/database.types";

export type GrowthActionState = { error: string } | { success: string } | null;

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prospectId: string,
  type: Database["public"]["Tables"]["partner_activity_log"]["Row"]["type"],
  actorId: string,
  payload: Json = {}
) {
  await supabase.from("partner_activity_log").insert({ prospect_id: prospectId, type, actor_id: actorId, payload });
}

export async function createTask(
  _prevState: GrowthActionState,
  formData: FormData
): Promise<GrowthActionState> {
  const operator = await requireGrowthOperator();
  const t = await getTranslations("GrowthTasks");
  if (!canEditPartnerEngine(operator.role)) return { error: t("noPermission") };

  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const prospectId = String(formData.get("prospect_id") ?? "").trim();
  if (!title) return { error: t("missingFields") };

  const supabase = await createClient();
  const { error } = await supabase.from("partner_tasks").insert({
    title,
    due_date: dueDate || null,
    prospect_id: prospectId || null,
    owner_id: operator.userId,
  });
  if (error) return { error: error.message };

  if (prospectId) {
    await logActivity(supabase, prospectId, "task_created", operator.userId, { title });
    revalidatePath(`/growth/prospects/${prospectId}`);
  }
  revalidatePath("/growth/tasks");
  return { success: t("taskCreated") };
}

export async function completeTask(taskId: string, prospectId: string | null): Promise<void> {
  const operator = await requireGrowthOperator();
  if (!canEditPartnerEngine(operator.role)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId);

  if (!error && prospectId) {
    await logActivity(supabase, prospectId, "task_completed", operator.userId, { task_id: taskId });
    revalidatePath(`/growth/prospects/${prospectId}`);
  }
  revalidatePath("/growth/tasks");
}

export async function cancelTask(taskId: string, prospectId: string | null): Promise<void> {
  const operator = await requireGrowthOperator();
  if (!canEditPartnerEngine(operator.role)) return;

  const supabase = await createClient();
  await supabase.from("partner_tasks").update({ status: "cancelled" }).eq("id", taskId);

  if (prospectId) revalidatePath(`/growth/prospects/${prospectId}`);
  revalidatePath("/growth/tasks");
}
