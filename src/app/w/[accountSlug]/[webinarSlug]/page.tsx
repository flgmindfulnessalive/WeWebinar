import { notFound } from "next/navigation";
import Image from "next/image";

import { createClient } from "@/lib/supabase/server";
import { computeUpcomingOccurrences } from "@/lib/scheduling";
import { RegistrationForm } from "./registration-form";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ accountSlug: string; webinarSlug: string }>;
}) {
  const { accountSlug, webinarSlug } = await params;
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("account_public_profile")
    .select("*")
    .eq("slug", accountSlug)
    .maybeSingle();
  if (!account) notFound();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("*")
    .eq("account_id", account.id)
    .eq("slug", webinarSlug)
    .eq("status", "published")
    .maybeSingle();
  if (!webinar) notFound();

  const hasFixedSlots = webinar.schedule_mode === "fixed" || webinar.schedule_mode === "both";

  const [{ data: presenter }, { data: schedules }, { data: plan }, { data: sessions }, { data: sessionRegistrants }] =
    await Promise.all([
      webinar.presenter_user_id
        ? supabase
            .from("presenter_public_profile")
            .select("*")
            .eq("id", webinar.presenter_user_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      hasFixedSlots
        ? supabase
            .from("webinar_schedules")
            .select("id, day_of_week, time_of_day, timezone, exclude_weekends")
            .eq("webinar_id", webinar.id)
        : Promise.resolve({ data: [] }),
      account.plan_id
        ? supabase.from("plans").select("max_attendees_per_webinar").eq("id", account.plan_id).maybeSingle()
        : Promise.resolve({ data: null }),
      hasFixedSlots
        ? supabase.from("webinar_sessions").select("id, schedule_id, starts_at").eq("webinar_id", webinar.id)
        : Promise.resolve({ data: [] }),
      hasFixedSlots
        ? supabase.from("registrants").select("session_id").eq("webinar_id", webinar.id).not("session_id", "is", null)
        : Promise.resolve({ data: [] }),
    ]);

  // The attendee cap is per live session (how many people can overlap in
  // the same playback window), not a lifetime total for the webinar -- the
  // same recording can be "replayed" as unlimited sessions over time. For
  // fixed occurrences we can show this upfront: look up each occurrence's
  // existing webinar_sessions row (if anyone already registered for it)
  // and count how many registrants share that session.
  const maxAttendees = plan?.max_attendees_per_webinar ?? null;
  const registeredCountBySessionId = new Map<string, number>();
  for (const r of sessionRegistrants ?? []) {
    if (!r.session_id) continue;
    registeredCountBySessionId.set(r.session_id, (registeredCountBySessionId.get(r.session_id) ?? 0) + 1);
  }
  const sessionIdByOccurrence = new Map<string, string>();
  for (const s of sessions ?? []) {
    sessionIdByOccurrence.set(`${s.schedule_id}|${new Date(s.starts_at).toISOString()}`, s.id);
  }

  const occurrences = hasFixedSlots
    ? computeUpcomingOccurrences(schedules ?? [], { limit: 5 }).map((o) => {
        const startsAt = o.startsAt.toISOString();
        const sessionId = sessionIdByOccurrence.get(`${o.scheduleId}|${startsAt}`);
        const registeredCount = sessionId ? (registeredCountBySessionId.get(sessionId) ?? 0) : 0;
        return {
          scheduleId: o.scheduleId,
          startsAt,
          spotsLeft: maxAttendees === null ? null : Math.max(0, maxAttendees - registeredCount),
        };
      })
    : [];

  // Only meaningful to say "no hay horarios disponibles" for a purely
  // fixed-schedule webinar -- a "both" webinar still has the just-in-time
  // option even if every fixed slot is full.
  const allFixedSlotsFull =
    webinar.schedule_mode === "fixed" && occurrences.length > 0 && occurrences.every((o) => o.spotsLeft === 0);

  const branding = (account.branding as Record<string, string | null>) ?? {};

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        {branding.logo_url && (
          <Image
            src={branding.logo_url}
            alt={account.name}
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
            unoptimized
          />
        )}
        {webinar.category && (
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {webinar.category}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight">{webinar.title}</h1>
        {webinar.description && (
          <p className="max-w-xl text-muted-foreground">{webinar.description}</p>
        )}
        {presenter && (presenter.display_name || presenter.avatar_url) && (
          <div className="mt-2 flex items-center gap-2">
            {presenter.avatar_url && (
              <Image
                src={presenter.avatar_url}
                alt={presenter.display_name ?? ""}
                width={32}
                height={32}
                className="size-8 rounded-full object-cover"
                unoptimized
              />
            )}
            {presenter.display_name && (
              <span className="text-sm text-muted-foreground">
                Presenta {presenter.display_name}
              </span>
            )}
          </div>
        )}
      </header>

      <RegistrationForm
        webinarId={webinar.id}
        returnTo={`/w/${accountSlug}/${webinarSlug}`}
        scheduleMode={webinar.schedule_mode}
        offsets={webinar.just_in_time_offsets_minutes}
        occurrences={occurrences}
        allFixedSlotsFull={allFixedSlotsFull}
      />
    </div>
  );
}
