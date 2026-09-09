import type { PartnerPlatform } from "@/lib/supabase/database.types";

// Dedup key -- lowercase, trim, strip trailing slash and querystring/hash.
// No difuso matching (instagram.com/user vs @user vs instagram.com/user/)
// -- ver docs/partner-engine/ARCHITECTURE.md "Riesgos técnicos" #4, es una
// limitación conocida de Slice 1, no un bug.
export function normalizeProfileUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.hostname.replace(/^www\./, "").toLowerCase()}${path.toLowerCase()}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, "");
  }
}

export function normalizeEmail(rawEmail: string): string | null {
  const trimmed = rawEmail.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

const PLATFORM_HOSTS: [RegExp, PartnerPlatform][] = [
  [/instagram\.com/i, "instagram"],
  [/tiktok\.com/i, "tiktok"],
  [/youtube\.com|youtu\.be/i, "youtube"],
  [/linkedin\.com/i, "linkedin"],
];

// Best-effort a partir de la URL pegada -- si no matchea ningún host
// conocido, "website" es el fallback razonable (podría ser un blog,
// newsletter, o landing propia), nunca "other" por default silencioso.
export function detectPlatform(rawUrl: string): PartnerPlatform {
  for (const [pattern, platform] of PLATFORM_HOSTS) {
    if (pattern.test(rawUrl)) return platform;
  }
  return "website";
}
