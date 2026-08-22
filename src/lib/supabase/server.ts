import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";

// Use in Server Components, Server Actions, and Route Handlers.
// Anon key + RLS — this is the "user-scoped" client, never a privilege
// escalation path. See admin.ts for the service-role client.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component with no response to write to
            // (e.g. rendering a page). Session refresh is still handled by
            // middleware, so this is safe to ignore here.
          }
        },
      },
    }
  );
}
