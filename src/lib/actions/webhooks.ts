"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";
import { sendTestWebhookEvent } from "@/lib/webhooks";
import type { Database } from "@/lib/supabase/database.types";

export type WebhookActionState = { error: string } | null;

export const WEBHOOK_EVENT_TYPES = [
  "registration",
  "attendance",
  "cta_click",
  "completion",
] as const;

export type WebhookEventTypeOption = (typeof WEBHOOK_EVENT_TYPES)[number];

export async function createWebhookEndpoint(
  _prevState: WebhookActionState,
  formData: FormData
): Promise<WebhookActionState> {
  const t = await getTranslations("WebhookActions");
  const current = await getCurrentAccount();
  if (!current) return { error: t("sessionNotFound") };

  const url = String(formData.get("url") ?? "").trim();
  if (!/^https:\/\//i.test(url)) {
    return { error: t("urlMustBeHttps") };
  }

  const eventTypes = WEBHOOK_EVENT_TYPES.filter((et) => formData.get(`event_${et}`) === "on");
  if (eventTypes.length === 0) {
    return { error: t("chooseEvent") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("webhook_endpoints").insert({
    account_id: current.account.id,
    url,
    event_types: [...eventTypes],
  } satisfies Database["public"]["Tables"]["webhook_endpoints"]["Insert"]);

  revalidatePath("/dashboard/settings/integrations");
  if (error) {
    if (error.message.includes("plan_feature_blocked")) {
      return { error: t("planBlocked") };
    }
    return { error: error.message };
  }
  return null;
}

export async function deleteWebhookEndpoint(id: string): Promise<WebhookActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);

  revalidatePath("/dashboard/settings/integrations");
  if (error) return { error: error.message };
  return null;
}

export async function sendTestWebhook(id: string): Promise<WebhookActionState> {
  const t = await getTranslations("WebhookActions");
  const supabase = await createClient();
  // Goes through the regular RLS-scoped client first -- confirms the
  // caller can actually see this endpoint (account membership) before
  // handing it to the admin-client delivery path.
  const { data: endpoint, error } = await supabase
    .from("webhook_endpoints")
    .select("id, account_id, url, secret")
    .eq("id", id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!endpoint) return { error: t("notFound") };

  await sendTestWebhookEvent(endpoint);
  revalidatePath("/dashboard/settings/integrations");
  return null;
}

export async function toggleWebhookEndpoint(
  id: string,
  isActive: boolean
): Promise<WebhookActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("webhook_endpoints")
    .update({ is_active: isActive })
    .eq("id", id);

  revalidatePath("/dashboard/settings/integrations");
  if (error) return { error: error.message };
  return null;
}
