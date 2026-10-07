import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { wefunnelAppUrl } from "@/lib/wefunnels/host";

// The webinar every distributor's course room is copied from: the recorded
// course, living in our own account. It sits in the environment rather than
// in code for the same reason WHOP_WEFUNNELS_DISTRIBUTOR_PLAN_ID does --
// unlike the plan ids committed in lib/whop.ts, this id does not exist yet
// and will differ between preview and production.
//
// Unset is a supported state, not a misconfiguration: course_webinar_id
// stays null, /f/<slug>/curso says the course is coming, and the lifetime
// rights the distributor bought are unaffected.
export function courseTemplateWebinarId(): string | null {
  const id = process.env.WEFUNNELS_COURSE_WEBINAR_ID?.trim();
  return id ? id : null;
}

export type MountResult = { webinarId: string } | { skipped: string };

// Mounts the course in a distributor's own account: their own webinar, at
// their own address, with the claim CTA pointing at their referral link.
//
// Everything that matters happens inside wefunnel_clone_course_webinar --
// one transaction, idempotent, service role only. This is the thin shell
// that supplies the template id and keeps a failure from taking down the
// caller: a distributor whose room did not mount still owns everything
// else the $100 bought, and the admin backfill can mount it later.
export async function mountDistributorCourseRoom(
  accountId: string
): Promise<MountResult> {
  const sourceId = courseTemplateWebinarId();
  if (!sourceId) return { skipped: "no template configured" };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("wefunnel_clone_course_webinar", {
    p_account_id: accountId,
    p_source_webinar_id: sourceId,
  });

  if (error) {
    console.error("[wefunnel] course room mount failed:", error.message);
    return { skipped: error.message };
  }

  if (!data) {
    // The function's own "nothing to do": not a distributor, no claimed
    // page to credit the gifted funnels to, or a template id that no
    // longer resolves. All three are states, not crashes.
    return { skipped: "nothing to mount" };
  }

  return { webinarId: data };
}

// The canonical course, as a public address. Used by the panel's re-watch
// section, which every WeFunnels user reaches -- distributors included,
// since their own room exists to be given away, not to be re-watched by
// them. Null while the template id is unset, which is what keeps that
// section's "lo estamos grabando" placeholder honest.
export async function courseTemplateRoomUrl(): Promise<string | null> {
  const sourceId = courseTemplateWebinarId();
  if (!sourceId) return null;

  // Service role: a free WeFunnels account is not a member of the account
  // the course lives in, so RLS would hand it nothing.
  const supabase = createAdminClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("slug, account_id, status")
    .eq("id", sourceId)
    .maybeSingle();

  if (!webinar || webinar.status !== "published") return null;

  const { data: account } = await supabase
    .from("accounts")
    .select("slug")
    .eq("id", webinar.account_id)
    .maybeSingle();

  if (!account?.slug) return null;

  return wefunnelAppUrl(`/w/${account.slug}/${webinar.slug}`);
}
