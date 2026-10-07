import "server-only";

import { createClient } from "@/lib/supabase/server";

// Head-only count: the nav shows how many people are on the list without
// pulling the list itself, and RLS already limits what can be counted to
// the caller's own site.
export async function countLeads(siteId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("wefunnel_leads")
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId);
  return count ?? 0;
}
