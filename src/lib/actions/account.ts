"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export type CreateAccountState = { error: string } | null;

const SELF_SERVE_PLAN_KEYS = new Set(["core", "pro", "business"]);

export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const name = String(formData.get("name") ?? "").trim();
  const planKey = String(formData.get("plan_key") ?? "core");

  if (!name) {
    return { error: "El nombre de la cuenta es obligatorio." };
  }
  if (!SELF_SERVE_PLAN_KEYS.has(planKey)) {
    return { error: "Plan inválido." };
  }

  // redirect() throws internally to navigate, so it can never be called
  // from inside this try block -- we just record where to go and redirect
  // once, after the try/catch is fully resolved.
  let redirectTo: string | null = null;
  let result: CreateAccountState = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirectTo = "/login?next=/onboarding";
    } else {
      const baseSlug = slugify(name) || "cuenta";
      let slug = baseSlug;
      let attempt = 0;
      let resolved = false;

      // Rare race: two hosts pick the same name at the same moment. Retry
      // a few times with a numeric suffix before giving up.
      while (attempt < 5 && !resolved) {
        const { error } = await supabase.rpc("create_account_with_owner", {
          p_name: name,
          p_slug: slug,
          p_plan_key: planKey,
        });

        if (!error) {
          redirectTo = "/dashboard";
          resolved = true;
        } else if (error.code === "23505") {
          attempt += 1;
          slug = `${baseSlug}-${attempt + 1}`;
        } else {
          result = { error: error.message };
          resolved = true;
        }
      }

      if (!resolved) {
        result = { error: "No se pudo generar un slug disponible, probá con otro nombre." };
      }
    }
  } catch (err) {
    console.error("[account] createAccount failed:", err);
    result = { error: "No pudimos conectar con el servidor. Probá de nuevo en un momento." };
  }

  if (redirectTo) redirect(redirectTo);
  return result;
}
