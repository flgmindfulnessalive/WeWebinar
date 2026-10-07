"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isWellFormedSlug, normalizeSlug, slugLengthHint } from "@/lib/wefunnels/slug";

export type ClaimState = { error: string } | { success: true; slug: string } | null;
export type SaveState = { error: string } | { success: true } | null;

const ACCENTS = ["cyan", "blue", "violet", "pink", "green", "amber"] as const;

function field(data: FormData, name: string, max: number): string {
  return String(data.get(name) ?? "").trim().slice(0, max);
}

export async function claimWeFunnelSite(
  _prev: ClaimState,
  formData: FormData
): Promise<ClaimState> {
  const displayName = field(formData, "displayName", 120);
  const slug = normalizeSlug(field(formData, "slug", 64));

  if (!displayName) {
    return { error: "Escribe tu nombre." };
  }

  const lengthProblem = slugLengthHint(slug);
  if (lengthProblem) return { error: lengthProblem };
  if (!isWellFormedSlug(slug)) {
    return { error: "La dirección solo admite letras, números y guiones." };
  }

  const supabase = await createClient();

  // Asking first turns the common case -- the name is taken -- into a
  // message instead of a constraint error. The claim itself is still the
  // authority: two people can pass this check in the same second.
  const { data: available } = await supabase.rpc("wefunnel_slug_available", {
    p_slug: slug,
  });
  if (available === false) {
    return { error: "Esa dirección ya está tomada. Prueba con otra." };
  }

  const { error } = await supabase.rpc("claim_wefunnel_site", {
    p_display_name: displayName,
    p_slug: slug,
  });

  if (error) {
    if (error.code === "23505" || error.message.includes("already has a page")) {
      return { error: "Esa dirección acaba de ser tomada. Prueba con otra." };
    }
    if (error.message.includes("reserved")) {
      return { error: "Esa dirección está reservada. Prueba con otra." };
    }
    console.error("[wefunnel] claim failed:", error.message);
    return { error: "No pudimos crear tu página. Intenta de nuevo." };
  }

  revalidatePath("/panel");
  return { success: true, slug };
}

export async function saveWeFunnelSite(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const supabase = await createClient();

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

  const bullets = [
    field(formData, "bullet1", 160),
    field(formData, "bullet2", 160),
    field(formData, "bullet3", 160),
  ].filter(Boolean);

  // The slug is not in this payload on purpose. It moves through its own
  // path with its own availability check, and the database freezes it once
  // the page has been published.
  const { error } = await supabase
    .from("wefunnel_sites")
    .update({
      display_name: field(formData, "displayName", 120) || undefined,
      location: field(formData, "location", 120) || null,
      headline: field(formData, "headline", 300) || null,
      bullets,
      video_url: field(formData, "videoUrl", 500) || null,
      accent: accent || "cyan",
      contact_whatsapp: field(formData, "whatsapp", 32).replace(/[^\d+]/g, "") || null,
      question_label: field(formData, "questionLabel", 160) || null,
      pixel_provider: pixelId ? pixelProvider : null,
      pixel_id: pixelId || null,
    })
    .eq("id", field(formData, "siteId", 64));

  if (error) {
    // The update policy excludes suspended pages, so a suspended owner's
    // save matches no row rather than being rejected outright.
    console.error("[wefunnel] save failed:", error.message);
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }

  revalidatePath("/panel");
  return { success: true };
}

export async function setWeFunnelPublished(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const published = formData.get("published") === "true";
  const supabase = await createClient();

  const { error } = await supabase.rpc("wefunnel_publish_site", {
    p_published: published,
  });

  if (error) {
    if (error.message.includes("suspended")) {
      return { error: "Esta página está suspendida. Escríbenos para revisarla." };
    }
    console.error("[wefunnel] publish failed:", error.message);
    return { error: "No pudimos cambiar el estado de la página." };
  }

  revalidatePath("/panel");
  return { success: true };
}
