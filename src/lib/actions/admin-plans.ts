"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type AdminPlanActionState = { error: string } | null;

function parseNullableInt(value: FormDataEntryValue | null): number | null {
  const str = String(value ?? "").trim();
  if (str === "") return null;
  const n = Number(str);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export async function updatePlan(
  _prevState: AdminPlanActionState,
  formData: FormData
): Promise<AdminPlanActionState> {
  const planId = String(formData.get("plan_id") ?? "");
  const priceRaw = String(formData.get("price_annual_usd") ?? "").trim();
  const priceMonthlyRaw = String(formData.get("price_monthly_usd") ?? "").trim();
  const removeBranding = formData.get("remove_branding") === "on";
  const customDomain = formData.get("custom_domain") === "on";

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({
      price_annual_usd: priceRaw === "" ? null : Number(priceRaw),
      price_monthly_usd: priceMonthlyRaw === "" ? null : Number(priceMonthlyRaw),
      max_active_webinars: parseNullableInt(formData.get("max_active_webinars")),
      max_users: parseNullableInt(formData.get("max_users")),
      max_attendees_per_webinar: parseNullableInt(formData.get("max_attendees_per_webinar")),
      features: { remove_branding: removeBranding, custom_domain: customDomain },
    })
    .eq("id", planId);

  revalidatePath("/admin/plans");

  if (error) return { error: error.message };
  return null;
}
