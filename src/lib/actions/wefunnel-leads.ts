"use server";

import { createClient } from "@/lib/supabase/server";

export type WeFunnelLeadState =
  | { error: string }
  | { success: true; whatsappUrl: string | null }
  | null;

const MAX_NAME = 120;
const MAX_ANSWER = 1000;

// Everything a visitor typed, trimmed and capped to the same limits the
// column checks enforce, so a too-long field comes back as a readable
// message instead of a Postgres constraint error.
function clean(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

// Digits only, with the leading + kept. Everything people actually type --
// spaces, dashes, parentheses -- is noise around a phone number.
function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  if (!/^\+?\d{7,15}$/.test(digits)) return null;
  return digits;
}

export async function submitWeFunnelLead(
  _prevState: WeFunnelLeadState,
  formData: FormData
): Promise<WeFunnelLeadState> {
  const siteId = clean(formData.get("siteId"), 64);
  const name = clean(formData.get("name"), MAX_NAME);
  const rawWhatsapp = clean(formData.get("whatsapp"), 64);
  const email = clean(formData.get("email"), 320);
  const answer = clean(formData.get("answer"), MAX_ANSWER);

  if (!siteId) {
    return { error: "No pudimos identificar la página. Recarga e intenta de nuevo." };
  }
  if (!name) {
    return { error: "Escribe tu nombre." };
  }
  // Name and email are the form's two required fields (approved design);
  // WhatsApp is optional and only adds a channel.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Escribe un email válido para que puedan responderte." };
  }

  const whatsapp = rawWhatsapp ? normalizeWhatsapp(rawWhatsapp) : null;
  if (rawWhatsapp && !whatsapp) {
    return { error: "Ese número de WhatsApp no parece válido." };
  }

  const supabase = await createClient();

  // Anon insert, allowed by wefunnel_leads_insert_public only when the site
  // is published and unsuspended. A suspended page therefore stops taking
  // leads at the same instant it stops being readable -- no second check to
  // keep in sync here.
  const { error } = await supabase.from("wefunnel_leads").insert({
    site_id: siteId,
    name,
    whatsapp,
    email: email || null,
    answer: answer || null,
  });

  if (error) {
    console.error("[wefunnel] lead insert failed:", error.message);
    return { error: "No pudimos guardar tus datos. Intenta de nuevo." };
  }

  // The thank-you screen's main action is the visitor writing to the owner
  // first, with the message already composed. The owner's number is read
  // back here rather than trusted from the form, so a crafted submission
  // can't point the button at someone else's WhatsApp.
  const { data: site } = await supabase
    .from("wefunnel_sites")
    .select("display_name, contact_whatsapp")
    .eq("id", siteId)
    .maybeSingle();

  const ownerNumber = site?.contact_whatsapp?.replace(/^\+/, "") ?? null;
  const whatsappUrl = ownerNumber
    ? `https://wa.me/${ownerNumber}?text=${encodeURIComponent(
        `Hola ${site?.display_name ?? ""}, acabo de dejarte mis datos en tu página.`.replace(
          /\s+/g,
          " "
        )
      )}`
    : null;

  return { success: true, whatsappUrl };
}
