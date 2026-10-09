import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type WeFunnelSite = Database["public"]["Tables"]["wefunnel_sites"]["Row"];
export type WeFunnelDistributor =
  Database["public"]["Tables"]["wefunnel_distributors"]["Row"];

export type PanelViewer = {
  userId: string;
  email: string;
  // Publishing needs a verified address, because a published page is a
  // public address on a shared domain. Carried here so the editor can say
  // so before the button is pressed instead of only after.
  emailVerified: boolean;
  // El nombre de la persona, no el de su página. Son dos campos distintos
  // con dos trabajos distintos: este sale en el menú de la cuenta, y
  // wefunnel_sites.display_name es el que leen sus visitantes.
  displayName: string | null;
  // Which account these rows belong to. Null is the normal state of a
  // brand-new signup, before the claim creates one.
  accountId: string | null;
  // A platform admin may claim a page without an invitation
  // (claim_wefunnel_site, 20261007000014), so the screen that gates the
  // claim form has to know.
  isPlatformAdmin: boolean;
  site: WeFunnelSite | null;
  distributor: WeFunnelDistributor | null;
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

  // The account has to be asked for by name, and the two reads below have to
  // be filtered by it. RLS alone does not narrow them to this person:
  // wefunnel_sites_select_live lets any signed-in visitor read every
  // published page, and wefunnel_sites_select_members adds every page in any
  // state for a platform admin. An unscoped `limit(1)` therefore hands the
  // panel whichever row the planner returns first, which can be somebody
  // else's -- and then the editor shows a page its viewer cannot write: the
  // save matches no row, because the update policy is account-scoped and
  // silent about it, and wefunnel_publish_site, which finds the page through
  // the caller's own account, raises 'no page for this account'.
  // /panel/empezar has always read it this way.
  const { data: profile } = await supabase
    .from("users")
    .select("account_id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const accountId = profile?.account_id ?? null;

  // Los errores no se tragan. Una lectura fallida aquí no significa "no
  // tienes página" ni "no tienes licencia" -- y el panel actuaba como si lo
  // significara: al dueño de una página le habría enseñado la pantalla de
  // reclamar una, y a un distribuidor el panel de alguien que no lo es.
  // Mejor el límite de error, que dice la verdad: algo falló, vuelve a
  // intentarlo.
  const [site, distributor, isPlatformAdmin] = await Promise.all([
    accountId
      ? supabase
          .from("wefunnel_sites")
          .select("*")
          .eq("account_id", accountId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) throw new Error(`wefunnel_sites: ${error.message}`);
            return data;
          })
      : null,
    accountId
      ? supabase
          .from("wefunnel_distributors")
          .select("*")
          .eq("account_id", accountId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) throw new Error(`wefunnel_distributors: ${error.message}`);
            return data;
          })
      : null,
    supabase.rpc("is_platform_admin").then(({ data }) => Boolean(data)),
  ]);

  return {
    userId: user.id,
    email: user.email ?? "",
    emailVerified: Boolean(user.email_confirmed_at),
    displayName:
      profile?.display_name?.trim() ||
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      null,
    accountId,
    isPlatformAdmin,
    site: site ?? null,
    distributor: distributor ?? null,
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
