import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

// Edge-safe (no cookies, no session) anon lookup used from proxy.ts on
// every request whose Host header isn't the platform's own domain --
// resolves it against custom_domain_lookup, which only ever contains
// active, verified domains (see 20260830000004_custom_domains.sql).
export async function lookupAccountSlugByHostname(hostname: string): Promise<string | null> {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const { data } = await supabase
      .from("custom_domain_lookup")
      .select("account_slug")
      .eq("hostname", hostname)
      .maybeSingle();

    return data?.account_slug ?? null;
  } catch (error) {
    // A Supabase outage/misconfiguration should 404 this one unrecognized
    // hostname, not take the whole site down with it -- every other
    // request is on isOwnHostname's fast path and never reaches here.
    console.error("[proxy] custom domain lookup failed:", error);
    return null;
  }
}

// Companion lookup, only consulted once the one above has already missed:
// tells proxy.ts whether a foreign hostname is a domain someone actually
// added (still verifying DNS, or verification failed) versus a stray host
// pointed here with nothing configured at all -- the former gets a
// friendlier "still configuring" page instead of a bare 404.
export async function lookupPendingDomainStatus(hostname: string): Promise<string | null> {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const { data } = await supabase
      .from("custom_domain_pending_lookup")
      .select("status")
      .eq("hostname", hostname)
      .maybeSingle();

    return data?.status ?? null;
  } catch (error) {
    console.error("[proxy] pending custom domain lookup failed:", error);
    return null;
  }
}
