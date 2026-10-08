// Where the legal pages live. The repo has no Terms or Privacy page yet,
// so these are configurable instead of hard-coded to a route that 404s:
// set NEXT_PUBLIC_WEFUNNELS_TERMS_URL / NEXT_PUBLIC_WEFUNNELS_PRIVACY_URL
// once the texts are published. The fallbacks are the paths the previous
// landing already linked to, so nothing that was circulating changes.
import { wefunnelAppUrl } from "@/lib/wefunnels/host";

export function termsUrl(): string {
  return process.env.NEXT_PUBLIC_WEFUNNELS_TERMS_URL || wefunnelAppUrl("/terms");
}

export function privacyUrl(): string {
  return process.env.NEXT_PUBLIC_WEFUNNELS_PRIVACY_URL || wefunnelAppUrl("/privacy");
}
