"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { accountActivatedEmail } from "@/lib/platform-email";
import { sendEmail } from "@/lib/resend";

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
  const { data: before } = await supabase
    .from("accounts")
    .select("name, subscription_status")
    .eq("id", accountId)
    .maybeSingle();

  const { error } = await supabase
    .from("accounts")
    .update({ subscription_status: "active", suspended_at: null })
    .eq("id", accountId);

  revalidatePath("/admin/accounts");
  if (error) return { error: error.message };

  if (before && before.subscription_status !== "active") {
    // Best-effort: activation already succeeded above, so a failed
    // notification email shouldn't surface as an admin-facing error.
    try {
      const { data: owner } = await supabase
        .from("users")
        .select("email")
        .eq("account_id", accountId)
        .eq("role", "owner")
        .maybeSingle();
      if (owner?.email) {
        const { subject, html } = accountActivatedEmail(before.name);
        await sendEmail({ to: owner.email, subject, html });
      }
    } catch (err) {
      console.error("[admin] account activated email failed:", err);
    }
  }

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
