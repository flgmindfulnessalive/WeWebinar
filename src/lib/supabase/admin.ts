import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// Service-role client: bypasses RLS entirely. Never import this into
// client-side code or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
// Reserved for trusted server-only contexts: Stripe webhooks, Mux
// webhooks, cron jobs, and the Super Admin panel.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
