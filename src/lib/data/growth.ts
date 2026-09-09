import "server-only";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { GrowthOperatorRole } from "@/lib/supabase/database.types";

// growth_operators has no client-readable policy at all (allowlist, not
// even its own members can list it), so operator status is checked
// exclusively through the is_growth_operator()/growth_operator_role()
// RPCs -- same pattern requirePlatformAdmin() uses for platform_admins,
// but deliberately a separate allowlist: a platform admin is not
// automatically a growth operator and vice versa (see
// docs/partner-engine/ARCHITECTURE.md §F for why this doesn't nest under
// /admin's own guard).
export async function requireGrowthOperator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/growth");
  }

  const { data: role } = await supabase.rpc("growth_operator_role");
  if (!role) {
    redirect("/dashboard");
  }

  return { userId: user.id, email: user.email ?? "", role: role as GrowthOperatorRole };
}

export function canEditPartnerEngine(role: GrowthOperatorRole): boolean {
  return role === "owner" || role === "growth_admin" || role === "growth_operator";
}
