"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { accountActivatedEmail } from "@/lib/platform-email";
import { sendEmail } from "@/lib/resend";

export type AdminActionState = { error: string } | null;

export type OwnerActionState = { error: string } | { success: true } | null;

// updateOwnerEmail uses the service-role client, which bypasses RLS
// entirely -- unlike the rest of this file, it can't rely on
// accounts_update_owner's is_platform_admin() check, so it has to verify
// admin status itself before touching auth.admin.
async function assertPlatformAdmin(): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) return { error: "No autorizado." };
  return null;
}

// Same flow the public "olvidé mi contraseña" form uses -- lets an admin
// trigger it on a host's behalf (e.g. they're locked out and can't find
// the link) without needing their password or a service-role bypass.
// Takes `email` as a bound leading arg (see OwnerActions) so the rest of
// the signature matches what useActionState expects from a form action.
/* eslint-disable @typescript-eslint/no-unused-vars -- useActionState requires this exact (state, formData) tail */
export async function resendOwnerPasswordReset(
  email: string,
  _prevState: OwnerActionState,
  _formData: FormData
): Promise<OwnerActionState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const unauthorized = await assertPlatformAdmin();
  if (unauthorized) return unauthorized;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/reset-password`,
    });
    if (error) return { error: error.message };
  } catch (err) {
    console.error("[admin] resendOwnerPasswordReset failed:", err);
    return { error: "No pudimos enviar el email. Prueba de nuevo en un momento." };
  }

  return { success: true };
}

// Sets the email directly and marks it confirmed -- the same end result as
// editing it by hand in the Supabase dashboard, just from inside the app.
// Skips the self-service double-opt-in flow (changeEmail in profile.ts) on
// purpose: this is for support cases where the host is locked out of both
// inboxes and can't complete that confirmation themselves.
// public.users.email syncs automatically via the on_auth_user_email_updated
// trigger (see migration 20260827000004) once this commits.
// Takes `userId` as a bound leading arg (see OwnerActions), same as
// resendOwnerPasswordReset above.
export async function updateOwnerEmail(
  userId: string,
  _prevState: OwnerActionState,
  formData: FormData
): Promise<OwnerActionState> {
  const unauthorized = await assertPlatformAdmin();
  if (unauthorized) return unauthorized;

  const trimmed = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { error: "Ingresa un email válido." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      email: trimmed,
      email_confirm: true,
    });
    if (error) return { error: error.message };
  } catch (err) {
    console.error("[admin] updateOwnerEmail failed:", err);
    return { error: "No pudimos actualizar el email. Prueba de nuevo en un momento." };
  }

  revalidatePath("/admin/accounts");
  return { success: true };
}

// These rely on RLS for the actual row access (`accounts_update_owner`
// includes `or is_platform_admin()`, so an admin can update any account
// through the normal, non-service-role client) plus an explicit
// assertPlatformAdmin() check here as defense in depth -- RLS is per-row,
// not per-column, so on its own it can't stop an account's own owner from
// writing these same billing columns directly (a raw supabase-js call
// bypassing this file entirely). The real backstop for that is the
// guard_account_billing_columns DB trigger (see migration
// 20260827000005); the checks below just turn that into a clean
// "No autorizado." here instead of a raw Postgres exception.

export async function suspendAccount(accountId: string): Promise<AdminActionState> {
  const unauthorized = await assertPlatformAdmin();
  if (unauthorized) return unauthorized;

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
  const unauthorized = await assertPlatformAdmin();
  if (unauthorized) return unauthorized;

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
  const unauthorized = await assertPlatformAdmin();
  if (unauthorized) return unauthorized;

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
