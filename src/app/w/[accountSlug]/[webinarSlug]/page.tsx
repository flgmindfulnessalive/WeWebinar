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

  const [{ data: presenter }, { data: schedules }, { data: plan }] = await Promise.all([
    webinar.presenter_user_id
      ? supabase
          .from("presenter_public_profile")
          .select("*")
          .eq("id", webinar.presenter_user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    webinar.schedule_mode === "fixed" || webinar.schedule_mode === "both"
      ? supabase
          .from("webinar_schedules")
          .select("id, day_of_week, time_of_day, timezone, exclude_weekends")
          .eq("webinar_id", webinar.id)
      : Promise.resolve({ data: [] }),
    account.plan_id
      ? supabase.from("plans").select("max_attendees_per_webinar").eq("id", account.plan_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isFull =
    plan?.max_attendees_per_webinar != null &&
    webinar.attendee_count >= plan.max_attendees_per_webinar;

  const occurrences =
    webinar.schedule_mode === "fixed" || webinar.schedule_mode === "both"
      ? computeUpcomingOccurrences(schedules ?? [], { limit: 5 }).map((o) => ({
          scheduleId: o.scheduleId,
          startsAt: o.startsAt.toISOString(),
        }))
      : [];

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
        isFull={isFull}
      />
    </div>
  );
}
