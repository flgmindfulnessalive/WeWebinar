import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { wefunnelAppUrl } from "@/lib/wefunnels/host";

// The WeFunnels course: ONE recorded video, published as one webinar in our
// own WeWebinars account. Its id lives in the environment
// (WEFUNNELS_COURSE_WEBINAR_ID) because it differs between preview and
// production. Unset is a supported state: the course room says the video is
// not available yet, and nothing else breaks.
export function courseTemplateWebinarId(): string | null {
  const id = process.env.WEFUNNELS_COURSE_WEBINAR_ID?.trim();
  return id ? id : null;
}

export type CourseWebinar = {
  id: string;
  slug: string;
  accountSlug: string;
  scheduleMode: "fixed" | "just_in_time" | "both";
  jitOffsets: number[];
};

// Service role: a free WeFunnels account is not a member of the account the
// course lives in, so RLS would hand it nothing.
export async function getCourseWebinar(): Promise<CourseWebinar | null> {
  const sourceId = courseTemplateWebinarId();
  if (!sourceId) return null;

  const admin = createAdminClient();
  const { data: webinar } = await admin
    .from("webinars")
    .select("id, slug, account_id, status, schedule_mode, just_in_time_offsets_minutes")
    .eq("id", sourceId)
    .maybeSingle();
  if (!webinar || webinar.status !== "published") return null;

  const { data: account } = await admin.from("accounts").select("slug").eq("id", webinar.account_id).maybeSingle();
  if (!account?.slug) return null;

  return {
    id: webinar.id,
    slug: webinar.slug,
    accountSlug: account.slug,
    scheduleMode: webinar.schedule_mode as CourseWebinar["scheduleMode"],
    jitOffsets: (webinar.just_in_time_offsets_minutes ?? []) as number[],
  };
}

// The course's public registration page, for the one case where a
// registration cannot be created on the person's behalf (a fixed-schedule
// webinar, where they must pick a time).
export async function courseRoomUrl(): Promise<string | null> {
  const course = await getCourseWebinar();
  return course ? wefunnelAppUrl(`/w/${course.accountSlug}/${course.slug}`) : null;
}
