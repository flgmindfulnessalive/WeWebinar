"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { normalizeSlug, proposeSlug } from "@/lib/wefunnels/slug";

export type ModerationState = { error: string } | { success: true } | null;

// Both RPCs check is_platform_admin() themselves. That check lives in the
// database rather than only here because these are the calls that take a
// stranger's page off the internet: the authority to make them should not
// depend on which route happened to invoke them.

export async function setSiteSuspended(
  _prev: ModerationState,
  formData: FormData
): Promise<ModerationState> {
  const siteId = String(formData.get("siteId") ?? "");
  const suspended = formData.get("suspended") === "true";
  const rule = String(formData.get("rule") ?? "manual").trim().slice(0, 80);
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);

  if (!siteId) return { error: "Falta la página." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_set_suspended", {
    p_site_id: siteId,
    p_suspended: suspended,
    p_rule: rule || "manual",
    p_note: note || undefined,
  });

  if (error) {
    console.error("[wefunnel/admin] suspend failed:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/wefunnels");
  return { success: true };
}

export async function clearReview(
  _prev: ModerationState,
  formData: FormData
): Promise<ModerationState> {
  const reviewId = String(formData.get("reviewId") ?? "");
  if (!reviewId) return { error: "Falta el aviso." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_clear_review", {
    p_review_id: reviewId,
  });

  if (error) {
    console.error("[wefunnel/admin] clear failed:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/wefunnels");
  return { success: true };
}

// =========================================================================
// La consola: crear cuentas y regalar licencias
//
// wefunnel_admin_create_site y wefunnel_grant_distributor comprueban
// is_platform_admin() por su cuenta, igual que las dos de arriba. Lo que no
// puede comprobarlo es auth.admin.createUser, que corre con la clave de
// servicio y no pasa por la base: por eso aquí se verifica a mano antes de
// tocarla, y no solo en el layout de /admin.
// =========================================================================

export type ConsoleState = { error: string } | { success: string } | null;

async function assertAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  return isAdmin ? null : "No autorizado.";
}

// Contra public.users y no contra auth.admin.listUsers: aquella pagina y
// buscar un correo entre páginas deja de encontrarlo en cuanto haya más
// usuarios que la primera. Esta tabla tiene el email indexado y un trigger
// lo mantiene al día con auth (20260827000004).
async function findUserByEmail(
  email: string
): Promise<{ id: string; accountId: string | null } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, account_id")
    .ilike("email", email.trim())
    .maybeSingle();
  return data ? { id: data.id, accountId: data.account_id } : null;
}

export async function createWeFunnelAccount(
  _prev: ConsoleState,
  formData: FormData
): Promise<ConsoleState> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const slug = normalizeSlug(String(formData.get("slug") ?? "") || proposeSlug(name));
  const grant = formData.get("grant") === "on";
  const months = Number(formData.get("months") ?? 2);

  if (!name) return { error: "Escribe el nombre." };
  if (!email.includes("@")) return { error: "Escribe un email válido." };
  if (!slug) return { error: "No se pudo proponer una dirección a partir del nombre." };
  if (password && password.length < 8) {
    return { error: "La contraseña necesita al menos 8 caracteres." };
  }

  const admin = createAdminClient();

  // Si ya existe se reutiliza su identidad en vez de fallar: lo normal es
  // que alguien ya se haya registrado y lo que le falte sea la página.
  const existing = await findUserByEmail(email);
  let userId = existing?.id ?? null;
  let created = false;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: password || undefined,
      // Confirmado de entrada: lo crea un administrador, no hay nada que
      // verificar, y sin esto no podría publicar su página (20261007000012).
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error || !data.user) {
      console.error("[wefunnel/admin] createUser failed:", error?.message);
      return { error: error?.message ?? "No se pudo crear el usuario." };
    }
    userId = data.user.id;
    created = true;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_admin_create_site", {
    p_user_id: userId,
    p_display_name: name,
    p_slug: slug,
    p_grant_license: grant,
    p_included_months: Number.isFinite(months) ? months : 2,
  });

  if (error) {
    console.error("[wefunnel/admin] create site failed:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/wefunnels");
  return {
    success: `${name}: ${WEFUNNELS_HOST}/${slug}${grant ? " · con licencia" : ""}${
      created ? "" : " · se reutilizó su usuario"
    }`,
  };
}

export async function grantDistributorLicense(
  _prev: ConsoleState,
  formData: FormData
): Promise<ConsoleState> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const months = Number(formData.get("months") ?? 2);
  if (!email.includes("@")) return { error: "Escribe un email válido." };

  const user = await findUserByEmail(email);
  if (!user) return { error: "No hay ningún usuario con ese email." };
  if (!user.accountId) {
    return { error: "Ese usuario todavía no tiene cuenta. Créale una aquí arriba." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_grant_distributor", {
    p_account_id: user.accountId,
    p_included_months: Number.isFinite(months) ? months : 2,
  });

  if (error) {
    console.error("[wefunnel/admin] grant failed:", error.message);
    return { error: error.message };
  }

  revalidatePath("/admin/wefunnels");
  return { success: `Licencia concedida a ${email}.` };
}
