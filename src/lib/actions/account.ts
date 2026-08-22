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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const baseSlug = slugify(name) || "cuenta";
  let slug = baseSlug;
  let attempt = 0;

  // Rare race: two hosts pick the same name at the same moment. Retry a
  // few times with a numeric suffix before giving up.
  while (attempt < 5) {
    const { error } = await supabase.rpc("create_account_with_owner", {
      p_name: name,
      p_slug: slug,
      p_plan_key: planKey,
    });

    if (!error) {
      redirect("/dashboard");
    }

    if (error.code === "23505") {
      attempt += 1;
      slug = `${baseSlug}-${attempt + 1}`;
      continue;
    }

    return { error: error.message };
  }

  return { error: "No se pudo generar un slug disponible, probá con otro nombre." };
}
