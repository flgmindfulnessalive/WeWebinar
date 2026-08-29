"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";
import {
  registerVercelDomain,
  checkVercelDomainStatus,
  removeVercelDomain,
} from "@/lib/domains/vercel";

export type CustomDomainActionState = { error: string } | { success: true } | null;

const HOSTNAME_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

function ownAppHostname(): string | null {
  try {
    return process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : null;
  } catch {
    return null;
  }
}

async function requireOwner() {
  const current = await getCurrentAccount();
  if (!current || current.user.role !== "owner") return null;
  const planFeatures = (current.plan.features as Record<string, boolean> | null) ?? {};
  if (!planFeatures.custom_domain) return null;
  return current;
}

export async function addCustomDomain(
  _prevState: CustomDomainActionState,
  formData: FormData
): Promise<CustomDomainActionState> {
  const t = await getTranslations("CustomDomainActions");
  const current = await requireOwner();
  if (!current) return { error: t("notAllowed") };

  const hostname = String(formData.get("hostname") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  if (!HOSTNAME_RE.test(hostname)) return { error: t("invalidHostname") };
  if (hostname === ownAppHostname()) return { error: t("invalidHostname") };

  const supabase = await createClient();
  const { error } = await supabase.from("custom_domains").insert({
    account_id: current.account.id,
    hostname,
  });
  if (error) {
    // unique_violation on hostname (someone else already claimed it) or
    // on account_id (this account already has one -- remove it first).
    return { error: error.code === "23505" ? t("hostnameTaken") : error.message };
  }

  // Register with Vercel right away so DNS propagation isn't the only
  // thing standing between "saved" and "verified" -- if Vercel is
  // unreachable or not configured on this deployment, the row still
  // exists as "pending" and the owner can retry from "Verificar".
  const result = await registerVercelDomain(hostname);
  await supabase
    .from("custom_domains")
    .update({
      status: result.ok ? "verifying" : "pending",
      last_error: result.ok ? null : result.error,
    })
    .eq("account_id", current.account.id);

  revalidatePath("/dashboard/settings/domain");
  return { success: true };
}

export async function verifyCustomDomain(
  _prevState: CustomDomainActionState,
  formData: FormData
): Promise<CustomDomainActionState> {
  const t = await getTranslations("CustomDomainActions");
  const current = await requireOwner();
  if (!current) return { error: t("notAllowed") };

  const hostname = String(formData.get("hostname") ?? "").trim().toLowerCase();
  if (!hostname) return { error: t("invalidHostname") };

  const supabase = await createClient();

  // Idempotent -- re-registering recovers a domain that was added before
  // DNS finished propagating the first time.
  const registration = await registerVercelDomain(hostname);
  if (!registration.ok) {
    await supabase
      .from("custom_domains")
      .update({ status: "pending", last_error: registration.error, last_checked_at: new Date().toISOString() })
      .eq("account_id", current.account.id)
      .eq("hostname", hostname);
    revalidatePath("/dashboard/settings/domain");
    return { error: t("verifyFailed") };
  }

  const status = await checkVercelDomainStatus(hostname);
  await supabase
    .from("custom_domains")
    .update({
      status: status.verified ? "active" : "verifying",
      last_error: status.verified ? null : status.reason,
      last_checked_at: new Date().toISOString(),
    })
    .eq("account_id", current.account.id)
    .eq("hostname", hostname);

  revalidatePath("/dashboard/settings/domain");
  if (!status.verified) return { error: t("notVerifiedYet") };
  return { success: true };
}

export async function removeCustomDomain(
  _prevState: CustomDomainActionState,
  formData: FormData
): Promise<CustomDomainActionState> {
  const t = await getTranslations("CustomDomainActions");
  const current = await requireOwner();
  if (!current) return { error: t("notAllowed") };

  const hostname = String(formData.get("hostname") ?? "").trim().toLowerCase();

  await removeVercelDomain(hostname);

  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_domains")
    .delete()
    .eq("account_id", current.account.id)
    .eq("hostname", hostname);

  revalidatePath("/dashboard/settings/domain");
  if (error) return { error: error.message };
  return { success: true };
}
