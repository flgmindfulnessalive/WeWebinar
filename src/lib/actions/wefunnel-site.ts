"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WeFunnelFollowUpStatus } from "@/lib/supabase/database.types";
import { isWellFormedSlug, normalizeSlug, slugLengthHint } from "@/lib/wefunnels/slug";
import { REFERRAL_COOKIE, parseTouch } from "@/lib/wefunnels/referral";
import { getPanelViewer } from "@/lib/wefunnels/site";

export type ClaimState = { error: string } | { success: true; slug: string } | null;
export type SaveState = { error: string } | { success: true; published?: boolean } | null;

const ACCENTS = ["cyan", "blue", "violet", "pink", "green", "amber"] as const;
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function field(data: FormData, name: string, max: number): string {
  return String(data.get(name) ?? "").trim().slice(0, max);
}

// Only photos we stored ourselves may be shown on a public page: an
// arbitrary URL would let a page load (and track visitors through) any
// third-party host.
function photoPrefix(): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/avatars/wefunnels/`;
}

export async function claimWeFunnelSite(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const displayName = field(formData, "displayName", 60);
  const slug = normalizeSlug(field(formData, "slug", 64));

  if (!displayName) return { error: "Escribe tu nombre." };

  const lengthProblem = slugLengthHint(slug);
  if (lengthProblem) return { error: lengthProblem };
  if (!isWellFormedSlug(slug)) {
    return { error: "La dirección solo admite letras minúsculas, números y guiones." };
  }

  const supabase = await createClient();
  const { data: available } = await supabase.rpc("wefunnel_slug_available", { p_slug: slug });
  if (available === false) {
    return { error: "Esa dirección ya está en uso o reservada. Prueba con otra." };
  }

  // An active Distributor needs no invitation. The legacy touch cookie is
  // still passed for people mid-way through the old /r/<slug> path; the
  // database re-validates it (Distributor only, 90 days, not themselves).
  const touch = parseTouch((await cookies()).get(REFERRAL_COOKIE)?.value);

  const { error } = await supabase.rpc("claim_wefunnel_site", {
    p_display_name: displayName,
    p_slug: slug,
    p_ref_slug: touch && touch.slug !== slug ? touch.slug : undefined,
    p_touched_at: touch && touch.slug !== slug ? touch.touchedAt.toISOString() : undefined,
  });

  if (error) {
    if (error.code === "23505" || error.message.includes("already has a page")) {
      return { error: "Esa dirección acaba de ser tomada. Prueba con otra." };
    }
    if (error.message.includes("reserved")) {
      return { error: "Esa dirección está reservada. Prueba con otra." };
    }
    if (error.message.includes("invitation required")) {
      return {
        error:
          "Para recibir un funnel gratuito necesitas el enlace de la página de regalo de un Distribuidor.",
      };
    }
    console.error("[wefunnel] claim failed:", error.message);
    return { error: "No pudimos crear tu página. Intenta de nuevo." };
  }

  revalidatePath("/panel");
  redirect("/panel/personalizar?bienvenida=1");
}

// "Guardar borrador" and "Publicar mi funnel" submit the same form; the
// button decides. Publishing saves first, so what goes live is exactly
// what the preview showed.
export async function saveWeFunnelSite(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const viewer = await getPanelViewer();
  if (!viewer?.site) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  const site = viewer.site;
  const supabase = await createClient();
  const intent = formData.get("intent") === "publish" ? "publish" : "draft";

  const displayName = field(formData, "displayName", 60);
  const headline = field(formData, "headline", 110);
  const description = field(formData, "description", 300);
  const photoUrl = field(formData, "photoUrl", 500);

  if (!displayName) return { error: "Escribe tu nombre público." };
  if (photoUrl && !photoUrl.startsWith(photoPrefix())) {
    return { error: "Sube tu foto desde el editor." };
  }

  const accent = field(formData, "accent", 16);
  const pixelId = field(formData, "pixelId", 40);
  const pixelProvider = field(formData, "pixelProvider", 16);
  if (accent && !ACCENTS.includes(accent as (typeof ACCENTS)[number])) {
    return { error: "Ese color de acento no existe." };
  }
  if (pixelId && !/^[A-Za-z0-9]{6,40}$/.test(pixelId)) {
    return { error: "El ID de píxel solo admite letras y números." };
  }
  if (pixelId && pixelProvider !== "meta" && pixelProvider !== "tiktok") {
    return { error: "Elige si el píxel es de Meta o de TikTok." };
  }

  // The address. Editable until the page is published for the first time;
  // after that the database freezes it (a link that circulated must never
  // point at someone else). Validity and availability are checked here and
  // again by the database trigger and unique index.
  const requestedSlug = normalizeSlug(field(formData, "slug", 64));
  let slugUpdate: { slug?: string } = {};
  if (requestedSlug && requestedSlug !== site.slug) {
    if (site.published_at) {
      return { error: "Tu enlace ya es definitivo porque la página se publicó." };
    }
    const lengthProblem = slugLengthHint(requestedSlug);
    if (lengthProblem) return { error: lengthProblem };
    if (!isWellFormedSlug(requestedSlug)) {
      return { error: "El enlace solo admite letras minúsculas, números y guiones." };
    }
    const { data: available } = await supabase.rpc("wefunnel_slug_available", { p_slug: requestedSlug });
    if (!available) return { error: "Ese enlace ya está en uso o reservado. Prueba con otro." };
    slugUpdate = { slug: requestedSlug };
  }

  const bullets = [field(formData, "bullet1", 160), field(formData, "bullet2", 160), field(formData, "bullet3", 160)].filter(Boolean);

  const { data: updated, error } = await supabase
    .from("wefunnel_sites")
    .update({
      ...slugUpdate,
      display_name: displayName,
      headline: headline || null,
      description: description || null,
      photo_url: photoUrl || null,
      location: field(formData, "location", 120) || null,
      bullets,
      video_url: field(formData, "videoUrl", 500) || null,
      accent: accent || "cyan",
      contact_whatsapp: field(formData, "whatsapp", 32).replace(/[^\d+]/g, "") || null,
      question_label: field(formData, "questionLabel", 160) || null,
      pixel_provider: pixelId ? pixelProvider : null,
      pixel_id: pixelId || null,
    })
    .eq("id", site.id)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    if (error?.code === "23505") return { error: "Ese enlace acaba de ser tomado. Prueba con otro." };
    if (error?.message.includes("reserved")) return { error: "Ese enlace está reservado. Prueba con otro." };
    // The update policy excludes suspended pages: no row matches.
    console.error("[wefunnel] save failed:", error?.message ?? "no row updated");
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }

  if (intent === "publish") {
    if (!headline) return { error: "Escribe tu titular antes de publicar." };
    const { error: publishError } = await supabase.rpc("wefunnel_publish_site", { p_published: true });
    if (publishError) {
      revalidatePath("/panel", "layout");
      if (publishError.message.includes("email not verified")) {
        return { error: "Guardamos tu borrador. Verifica tu email para poder publicar." };
      }
      if (publishError.message.includes("suspended")) {
        return { error: "Esta página está suspendida. Escríbenos para revisarla." };
      }
      console.error("[wefunnel] publish failed:", publishError.message);
      return { error: "Guardamos tu borrador, pero no pudimos publicarlo. Intenta de nuevo." };
    }
  }

  revalidatePath("/panel", "layout");
  return { success: true, published: intent === "publish" };
}

export async function unpublishWeFunnelSite(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_publish_site", { p_published: false });
  if (error) console.error("[wefunnel] unpublish failed:", error.message);
  revalidatePath("/panel", "layout");
}

export type UploadPhotoState = { error: string } | { url: string };

export async function uploadWeFunnelPhoto(formData: FormData): Promise<UploadPhotoState> {
  const viewer = await getPanelViewer();
  if (!viewer?.site) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una imagen." };
  const ext = PHOTO_TYPES[file.type];
  if (!ext) return { error: "Elige un archivo JPG, PNG o WebP." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "La imagen debe pesar hasta 5 MB." };

  // Same public "avatars" bucket the app already uses, under a WeFunnels
  // prefix and the account id. Validated here, written with the service
  // role (storage RLS is not used by this codebase).
  const admin = createAdminClient();
  const path = `wefunnels/${viewer.site.account_id}/${randomUUID()}.${ext}`;
  const { error } = await admin.storage.from("avatars").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("[wefunnel] photo upload failed:", error.message);
    return { error: "No pudimos subir la imagen. Intenta de nuevo." };
  }
  const { data } = admin.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}

const STATUSES: WeFunnelFollowUpStatus[] = ["nuevo", "contactado", "en_conversacion", "no_interesado"];

export async function setLeadStatus(formData: FormData): Promise<void> {
  const leadId = field(formData, "leadId", 64);
  const status = field(formData, "status", 32) as WeFunnelFollowUpStatus;
  if (!leadId || !STATUSES.includes(status)) return;

  const supabase = await createClient();
  // The function only touches leads of the caller's own page.
  const { error } = await supabase.rpc("wefunnel_set_lead_status", { p_lead_id: leadId, p_status: status });
  if (error) console.error("[wefunnel] lead status failed:", error.message);
  revalidatePath("/panel", "layout");
}

export type OrientationState = { error: string } | { success: true } | null;

export async function requestOrientation(_prev: OrientationState, formData: FormData): Promise<OrientationState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_request_orientation", {
    p_message: field(formData, "message", 600) || null,
  });
  if (error) {
    console.error("[wefunnel] orientation request failed:", error.message);
    return { error: "No pudimos enviar tu solicitud. Intenta de nuevo." };
  }
  revalidatePath("/panel");
  return { success: true };
}

export async function resendVerificationEmail(): Promise<{ ok: boolean }> {
  const viewer = await getPanelViewer();
  if (!viewer || viewer.emailVerified) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: viewer.email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/confirm?next=/panel/personalizar` },
  });
  if (error) console.error("[wefunnel] resend verification failed:", error.message);
  return { ok: !error };
}
