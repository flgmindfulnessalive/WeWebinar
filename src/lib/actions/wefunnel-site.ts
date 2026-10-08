"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { isWellFormedSlug, normalizeSlug, slugLengthHint } from "@/lib/wefunnels/slug";
import { REFERRAL_COOKIE, parseTouch } from "@/lib/wefunnels/referral";

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

  // The invitation cookie's one and only job ends here: from this call on,
  // the origin is a row on the account. A touch that is missing, stale or
  // pointing at this same page is simply no touch -- and since WeFunnels
  // is invitation-only, no touch means no page. The RPC checks all three
  // again, since the value came from the client.
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
    // Replaces the old "they spent their three invitations": there is no
    // quota any more, so the only way an invitation fails this way is that
    // whoever shared the link never bought the licence. Said without
    // revealing their billing state -- the message is about the link.
    if (error.message.includes("inviter is not a distributor")) {
      return {
        error:
          "Ese enlace no está regalando funnels. Pide el enlace de regalo de quien te invitó, o consigue el de otra persona.",
      };
    }
    if (error.message.includes("invitation required")) {
      return {
        error:
          "WeFunnels es por invitación: necesitas el enlace de alguien que ya tenga su página.",
      };
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
      // The two fields the approved editor writes. description is capped
      // at 300 in the database too, so a longer paste is trimmed here
      // rather than rejected after they have typed it.
      description: field(formData, "description", 300) || null,
      photo_url: field(formData, "photoUrl", 500) || null,
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
    // Raised by wefunnel_publish_site (20261007000012), which is where the
    // rule lives: that function is callable with any session, so checking
    // here as well would only duplicate a gate it already holds.
    if (error.message.includes("email not verified")) {
      return {
        error:
          "Verifica tu email antes de publicar. Te mandamos el enlace al correo con el que te registraste.",
      };
    }
    console.error("[wefunnel] publish failed:", error.message);
    return { error: "No pudimos cambiar el estado de la página." };
  }

  revalidatePath("/panel");
  return { success: true };
}

// Changing the address, which is only possible before the page goes live:
// the database freezes the slug once published_at is set, because a link
// already in circulation cannot start pointing at a different person.
//
// Separate from saveWeFunnelSite because it has its own availability check
// and its own failure modes, and because sharing a payload with the rest of
// the editor would mean every save re-checked a value that almost never
// changes.
export async function changeWeFunnelSlug(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const slug = normalizeSlug(field(formData, "slug", 64));

  const lengthProblem = slugLengthHint(slug);
  if (lengthProblem) return { error: lengthProblem };
  if (!isWellFormedSlug(slug)) {
    return { error: "La dirección solo admite letras, números y guiones." };
  }

  const supabase = await createClient();

  const { data: available } = await supabase.rpc("wefunnel_slug_available", {
    p_slug: slug,
  });
  if (available === false) {
    return { error: "Esa dirección ya está tomada. Prueba con otra." };
  }

  const { error } = await supabase
    .from("wefunnel_sites")
    .update({ slug })
    .eq("id", field(formData, "siteId", 64));

  if (error) {
    // wefunnel_guard_slug raises this once the page has been published.
    if (error.message.includes("slug is fixed")) {
      return {
        error:
          "Tu dirección ya está publicada y no puede cambiar: el enlace que compartiste tiene que seguir llevando a tu página.",
      };
    }
    if (error.code === "23505" || error.message.includes("duplicate")) {
      return { error: "Esa dirección acaba de ser tomada. Prueba con otra." };
    }
    if (error.message.includes("reserved")) {
      return { error: "Esa dirección está reservada. Prueba con otra." };
    }
    console.error("[wefunnel] slug change failed:", error.message);
    return { error: "No pudimos cambiar tu dirección. Intenta de nuevo." };
  }

  revalidatePath("/panel");
  return { success: true };
}

// Save and publish in one call, which is what the approved editor's primary
// button does. Two separate round trips would publish whatever was last
// saved rather than what is on screen -- the opposite of what somebody
// pressing "Publicar mi funnel" after editing a headline expects.
export async function saveAndPublishWeFunnelSite(
  prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const saved = await saveWeFunnelSite(prev, formData);
  if (saved && "error" in saved) return saved;

  const publishData = new FormData();
  publishData.set("published", "true");
  return setWeFunnelPublished(prev, publishData);
}

// The follow-up state on one registro. Through the RPC rather than a plain
// update, because wefunnel_leads has no UPDATE policy on purpose: the list
// is an append-only record of what somebody typed, and an owner who could
// edit a lead's name could edit the evidence of who asked for what. The
// function writes that one column and checks the caller owns the page.
export async function setLeadStatus(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const leadId = field(formData, "leadId", 64);
  const status = field(formData, "status", 32);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("wefunnel_set_lead_status", {
    p_lead_id: leadId,
    p_status: status,
  });

  if (error) {
    if (error.message.includes("unknown follow-up state")) {
      return { error: "Ese estado no existe." };
    }
    console.error("[wefunnel] lead status failed:", error.message);
    return { error: "No pudimos guardar el estado. Intenta de nuevo." };
  }

  // The function answers false for a lead on somebody else's page, the same
  // answer it gives for one that does not exist.
  if (data === false) {
    return { error: "Ese registro no es de tu página." };
  }

  revalidatePath("/panel/registrados");
  return { success: true };
}
