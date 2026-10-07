import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type WeFunnelSite = Database["public"]["Tables"]["wefunnel_sites"]["Row"];

export type PanelViewer = {
  userId: string;
  email: string;
  site: WeFunnelSite | null;
};

// The panel's own session read. Deliberately not getCurrentAccount(): that
// one needs a plan and returns null without one, which is right for the
// WeWebinars dashboard and wrong here -- a free WeFunnels account has no
// plan by design (see 20261007000002_wefunnel_claim.sql).
//
// Returns null only when nobody is signed in. A signed-in person with no
// account and no site is the normal state right before claiming.
export const getPanelViewer = cache(async (): Promise<PanelViewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // RLS lets a member read their own site in any state, so one query covers
  // draft, published and suspended alike.
  const { data: site } = await supabase
    .from("wefunnel_sites")
    .select("*")
    .limit(1)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? "",
    site: site ?? null,
  };
});

// The three steps the panel nags about until they are done. Watching the
// course is tracked once the course exists; for now the first step is
// marked from the fact that they got here at all, since the only way in is
// through the room.
export function checklist(site: WeFunnelSite | null) {
  const personalised = Boolean(site?.headline?.trim());
  return {
    watched: Boolean(site),
    personalised,
    published: site?.status === "published",
  };
}
