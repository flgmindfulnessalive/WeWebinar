import "server-only";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// platform_admins has no client-readable policy at all (it's an
// allowlist, not something even its own members should be able to list),
// so admin status is checked exclusively through the is_platform_admin()
// RPC — same SECURITY DEFINER function every RLS policy in the schema
// already relies on.
export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return { userId: user.id, email: user.email ?? "" };
}
