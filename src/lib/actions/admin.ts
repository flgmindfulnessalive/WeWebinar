"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type AdminActionState = { error: string } | null;

// All of these rely on RLS: `accounts_update_owner` already includes
// `or is_platform_admin()`, so a platform admin can update any account
// through the normal (non-service-role) client — no extra plumbing needed.

export async function suspendAccount(accountId: string): Promise<AdminActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ subscription_status: "suspended", suspended_at: new Date().toISOString() })
    .eq("id", accountId);

  revalidatePath("/admin/accounts");
  if (error) return { error: error.message };
  return null;
}

export async function reactivateAccount(accountId: string): Promise<AdminActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ subscription_status: "active", suspended_at: null })
    .eq("id", accountId);

  revalidatePath("/admin/accounts");
  if (error) return { error: error.message };
  return null;
}

export async function changeAccountPlan(
  accountId: string,
  planId: string
): Promise<AdminActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ plan_id: planId }).eq("id", accountId);

  revalidatePath("/admin/accounts");

  if (error) {
    if (error.message.includes("plan_downgrade_blocked")) {
      return {
        error:
          "No se puede bajar de plan: la cuenta supera los límites del plan nuevo (webinars publicados o usuarios). Pedile al host que archive/reduzca primero.",
      };
    }
    return { error: error.message };
  }
  return null;
}
