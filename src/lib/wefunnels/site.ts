import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type WeFunnelSite = Database["public"]["Tables"]["wefunnel_sites"]["Row"];
export type WeFunnelDistributor =
  Database["public"]["Tables"]["wefunnel_distributors"]["Row"];
export type WeFunnelOffer = Database["public"]["Functions"]["wefunnel_my_offer"]["Returns"][number];

export type PanelViewer = {
  userId: string;
  email: string;
  emailVerified: boolean;
  fullName: string | null;
  site: WeFunnelSite | null;
  // The licence row, revoked or not. Use isDistributor for rights.
  distributor: WeFunnelDistributor | null;
  isDistributor: boolean;
  offer: WeFunnelOffer | null;
};

// The panel's own session read. Deliberately not getCurrentAccount(): that
// one needs a plan and returns null without one, which is right for the
// WeWebinars dashboard and wrong here -- a free WeFunnels account has no
// plan by design.
//
// Returns null only when nobody is signed in.
export const getPanelViewer = cache(async (): Promise<PanelViewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // RLS lets a member read their own site in any state.
  const [{ data: site }, { data: distributor }, { data: offerRows }] = await Promise.all([
    supabase.from("wefunnel_sites").select("*").limit(1).maybeSingle(),
    supabase.from("wefunnel_distributors").select("*").limit(1).maybeSingle(),
    supabase.rpc("wefunnel_my_offer"),
  ]);

  return {
    userId: user.id,
    email: user.email ?? "",
    emailVerified: Boolean(user.email_confirmed_at),
    fullName: (user.user_metadata?.full_name as string | undefined)?.trim() || null,
    site: site ?? null,
    distributor: distributor ?? null,
    isDistributor: Boolean(distributor && !distributor.revoked_at),
    offer: offerRows?.[0] ?? null,
  };
});

export function firstName(viewer: PanelViewer): string {
  const source = viewer.site?.display_name || viewer.fullName || viewer.email.split("@")[0] || "";
  return source.split(/\s+/)[0] ?? source;
}
