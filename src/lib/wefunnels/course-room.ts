import "server-only";

import { cookies } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { wefunnelAppUrl } from "@/lib/wefunnels/host";
import { REFERRAL_COOKIE, parseTouch } from "@/lib/wefunnels/referral";

// The recorded WeFunnels course: one webinar, in our own account, that
// every distributor's room points at. It sits in the environment rather
// than in code for the same reason WHOP_WEFUNNELS_DISTRIBUTOR_PLAN_ID
// does -- unlike the plan ids committed in lib/whop.ts, this id does not
// exist yet and will differ between preview and production.
//
// Unset is a supported state, not a misconfiguration: the room says the
// course is coming, and the lifetime rights a distributor bought are
// unaffected.
export function courseTemplateWebinarId(): string | null {
  const id = process.env.WEFUNNELS_COURSE_WEBINAR_ID?.trim();
  return id ? id : null;
}

// Where that webinar lives publicly. Everybody lands here: the panel's
// re-watch section, and every distributor's room after the referral has
// been stamped.
//
// One room rather than a copy per distributor (see
// 20261007000009). "Tu sala con el curso, a tu nombre" is about the
// address and the name, and wefunnels.wewebinars.com/<nombre>/regalo still
// carries both -- while the thing that actually costs money, an attendee
// watching 25 minutes and being emailed about it, stops being multiplied
// by one permanent room per buyer.
export async function courseRoomUrl(): Promise<string | null> {
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

// The contact a distributor earns when somebody takes their gift.
//
// With one shared room the course registrant is a row in OUR account, so
// without this the person who did the inviting would end up with nothing
// but a number. A wefunnel_leads row on their own site is better than
// what a copied room gave them: their WeFunnels panel lists it with no
// plan at all, whereas a webinar's registrants live in a dashboard that
// closes the day their Starter lapses.
//
// The invite page says this is going to happen before the visitor leaves
// it -- the WeWebinars registration form has no idea who invited them and
// cannot say so itself.
export async function recordCourseLeadForReferrer({
  name,
  email,
}: {
  name: string;
  email: string;
}): Promise<void> {
  const touch = parseTouch((await cookies()).get(REFERRAL_COOKIE)?.value);
  if (!touch) return;

  // Service role on purpose, even though wefunnel_leads_insert_public
  // would admit this write: the dedupe below has to read rows on somebody
  // else's site, which no visitor may do.
  const admin = createAdminClient();
  const { data: site } = await admin
    .from("wefunnel_sites")
    .select("id")
    .eq("slug", touch.slug)
    .eq("status", "published")
    .is("suspended_at", null)
    .maybeSingle();

  if (!site) return;

  // Registering twice is ordinary -- a different session time, a second
  // device -- and should not deal the same person into the list twice.
  const { data: existing } = await admin
    .from("wefunnel_leads")
    .select("id")
    .eq("site_id", site.id)
    .eq("email", email)
    .maybeSingle();

  if (existing) return;

  // source, not the sentence in answer: the room funnel counts this step
  // and counting it by matching prose breaks the day somebody rewords it
  // (20261007000010). Only the service role may write 'course'.
  await admin.from("wefunnel_leads").insert({
    site_id: site.id,
    name,
    email,
    source: "course",
    answer: "Se registró al curso desde tu sala.",
  });
}
