"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCourseWebinar, courseRoomUrl } from "@/lib/wefunnels/course-room";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { wefunnelAppUrl } from "@/lib/wefunnels/host";

// "Ver el curso" from the panel. There is no single sign-on between the
// WeFunnels panel and the WeWebinars room (verified: the room identifies
// attendees by a registrant access token, not by a Supabase session). So
// instead of a second registration form, the server registers the signed-in
// person through the same register_for_webinar RPC the public form uses --
// with the name and email their account already has -- and sends them to
// the real WeWebinars room with that token. The RPC de-duplicates repeat
// registrations of the same email for the same session.
//
// Works when the course webinar admits just-in-time sessions; for a
// fixed-schedule webinar the person has to choose a time, so they are sent
// to the course's public registration page instead.
export async function openCourse(): Promise<void> {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/curso");

  const course = await getCourseWebinar();
  if (!course) redirect("/panel/curso?estado=no-disponible");

  const offsets = [...course.jitOffsets].filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b);
  if (course.scheduleMode === "fixed" || offsets.length === 0) {
    redirect((await courseRoomUrl()) ?? "/panel/curso?estado=no-disponible");
  }

  const name = viewer.site?.display_name || viewer.fullName || viewer.email.split("@")[0] || "Participante";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_webinar", {
    p_webinar_id: course.id,
    p_name: name.slice(0, 120),
    p_email: viewer.email,
    p_visitor_timezone: null,
    p_schedule_id: null,
    p_session_starts_at: null,
    p_offset_minutes: offsets[0],
    p_phone: null,
    p_country: null,
    p_locale: "es",
    p_launchpad_project_id: null,
  });

  const token = data?.[0]?.access_token;
  if (error || !token) {
    console.error("[wefunnel] course registration failed:", error?.message ?? "no token");
    redirect("/panel/curso?estado=error");
  }

  redirect(wefunnelAppUrl(`/w/${course.accountSlug}/${course.slug}/room/${token}`));
}
