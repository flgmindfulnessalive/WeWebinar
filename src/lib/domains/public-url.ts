import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { routing } from "@/i18n/routing";

// Once an account has an active custom domain, that's treated as its
// canonical public identity everywhere a webinar link gets built (emails,
// Open Graph, the dashboard's "view public page" link) -- regardless of
// which domain the current request happens to have come in on. Simpler
// and more predictable than trying to mirror back whatever domain a given
// visitor used, and it matches what the proposal promised: "usando el
// dominio propio" once one is set, not "usually".
export async function getActiveCustomDomainHostname(
  supabase: SupabaseClient<Database>,
  accountId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("custom_domains")
    .select("hostname")
    .eq("account_id", accountId)
    .eq("status", "active")
    .maybeSingle();
  return data?.hostname ?? null;
}

// Custom domain: https://webinars.cliente.com/lanzamiento-2026 (no
// accountSlug segment -- the domain itself already identifies the
// account, see proxy.ts -- and no locale prefix either: custom domains
// only ever serve the default locale, same restriction as the proxy
// rewrite). Platform domain (no custom domain, or not yet active):
// https://wewebinars.com/w/acme/lanzamiento-2026, unchanged, with the
// locale prefix preserved when `locale` is given and isn't the default
// (e.g. registering from /en/w/... should still land on /en/w/.../room/...).
export function webinarPublicUrl(
  accountSlug: string,
  webinarSlug: string,
  customDomainHostname: string | null,
  locale?: string
): string {
  if (customDomainHostname) {
    return `https://${customDomainHostname}/${webinarSlug}`;
  }
  const localePrefix = locale && locale !== routing.defaultLocale ? `/${locale}` : "";
  return `${process.env.NEXT_PUBLIC_APP_URL}${localePrefix}/w/${accountSlug}/${webinarSlug}`;
}
