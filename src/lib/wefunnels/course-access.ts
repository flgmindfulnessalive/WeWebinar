import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { courseTemplateWebinarId } from "@/lib/wefunnels/course-room";

export type CourseEntry =
  | { kind: "room"; url: string }
  | { kind: "signup"; url: string }
  | { kind: "unavailable" };

// Getting into the course without filling a second form.
//
// Not SSO -- there is none, and the approved package says to verify that
// rather than assume it. What there is: register_for_webinar is idempotent
// (20260827000006), so calling it with the name and address this person is
// already signed in with either creates their registrant row or hands back
// the token of the one they already have. The same button therefore works
// the first time and the tenth, and lands on the same room.
//
// It needs a start time. A webinar whose schedule_mode allows just_in_time
// has a list of offsets in minutes, and the smallest one is the soonest
// this person can be let in. A fixed-only webinar has no immediate entry at
// all, so rather than guess a session on their behalf the caller is sent to
// the public registration page, which is the screen built to make that
// choice.
export async function courseEntryFor({
  name,
  email,
}: {
  name: string;
  email: string;
}): Promise<CourseEntry> {
  const webinarId = courseTemplateWebinarId();
  if (!webinarId) return { kind: "unavailable" };

  // Service role throughout: a free WeFunnels account is not a member of
  // the account the course lives in, so RLS would hand it nothing -- not
  // the webinar, not its schedule mode, not its slug.
  const admin = createAdminClient();
  const { data: webinar } = await admin
    .from("webinars")
    .select("id, slug, status, account_id, schedule_mode, just_in_time_offsets_minutes")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar || webinar.status !== "published") return { kind: "unavailable" };

  const { data: account } = await admin
    .from("accounts")
    .select("slug")
    .eq("id", webinar.account_id)
    .maybeSingle();

  if (!account?.slug) return { kind: "unavailable" };

  const base = `${process.env.NEXT_PUBLIC_APP_URL}/w/${account.slug}/${webinar.slug}`;

  const offsets = (webinar.just_in_time_offsets_minutes ?? []).filter(
    (value): value is number => typeof value === "number"
  );
  const allowsJit =
    webinar.schedule_mode === "just_in_time" || webinar.schedule_mode === "both";

  if (!allowsJit || offsets.length === 0) {
    // Fixed sessions only: the choice is theirs to make, on the page that
    // asks for it.
    return { kind: "signup", url: base };
  }

  const soonest = Math.min(...offsets);

  // Every argument, including the nulls. register_for_webinar has two live
  // overloads -- each migration that added a column did `create or replace`
  // with a longer signature and never dropped the shorter one -- and
  // PostgREST picks between them by the names it is given. Four named
  // arguments match both, which fails as "function is not unique" rather
  // than registering anybody. lib/actions/register.ts passes all eleven for
  // the same reason; this is not belt and braces, it is the only
  // unambiguous call.
  const { data, error } = await admin.rpc("register_for_webinar", {
    p_webinar_id: webinarId,
    p_name: name,
    p_email: email,
    p_visitor_timezone: null,
    p_schedule_id: null,
    p_session_starts_at: null,
    p_offset_minutes: soonest,
    p_phone: null,
    p_country: null,
    p_locale: "es",
    p_launchpad_project_id: null,
  });

  const token = data?.[0]?.access_token;
  if (error || !token) {
    if (error) console.error("[wefunnel] course registration failed:", error.message);
    // Still a way in, just with the form. Better than a dead button.
    return { kind: "signup", url: base };
  }

  return { kind: "room", url: `${base}/room/${token}` };
}
