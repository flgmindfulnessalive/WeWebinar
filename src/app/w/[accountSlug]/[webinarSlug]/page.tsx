import { notFound } from "next/navigation";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";
import { computeUpcomingOccurrences } from "@/lib/scheduling";
import { resolveBrandColors } from "@/lib/brand-colors";
import { resolvePresenter } from "@/lib/presenter";
import { ParticleNetwork } from "@/components/particle-network";
import { GradientBlobs } from "@/components/gradient-blobs";
import { FacebookPixel } from "@/components/facebook-pixel";
import { RegistrationForm } from "./registration-form";

type RouteParams = { accountSlug: string; webinarSlug: string };

// Without this, every webinar link shared on WhatsApp/social showed the
// same generic "WeWebinars" title/description/thumbnail (the root
// opengraph-image.tsx) instead of the actual webinar being shared — the
// nested opengraph-image.tsx in this same route segment (below) is what
// supplies the image; this supplies the title/description text.
export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { accountSlug, webinarSlug } = await params;
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("account_public_profile")
    .select("id, name")
    .eq("slug", accountSlug)
    .maybeSingle();
  if (!account) return {};

  const { data: webinar } = await supabase
    .from("webinars")
    .select("title, description")
    .eq("account_id", account.id)
    .eq("slug", webinarSlug)
    .eq("status", "published")
    .maybeSingle();
  if (!webinar) return {};

  const title = `${webinar.title} · ${account.name}`;
  const description =
    webinar.description || `Webinar gratuito presentado por ${account.name}. Reserva tu lugar.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { accountSlug, webinarSlug } = await params;
  const { preview } = await searchParams;
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("account_public_profile")
    .select("*")
    .eq("slug", accountSlug)
    .maybeSingle();
  if (!account) notFound();

  // Unpublished webinars are normally invisible here (no status filter
  // below would 404 them) -- draft/paused hosts had no way to see their
  // own registration page before going live. ?preview=1 lifts that, but
  // only for someone who actually manages this account: never make an
  // unpublished page reachable by a stranger who guesses the URL.
  const { data: webinar } = await supabase
    .from("webinars")
    .select("*")
    .eq("account_id", account.id)
    .eq("slug", webinarSlug)
    .maybeSingle();
  if (!webinar) notFound();

  const isPreview = webinar.status !== "published";
  if (isPreview) {
    if (preview !== "1") notFound();
    const current = await getCurrentAccount();
    const canPreview =
      current?.account.id === account.id &&
      (current.user.role === "owner" || current.user.role === "editor");
    if (!canPreview) notFound();
  }

  const hasFixedSlots = webinar.schedule_mode === "fixed" || webinar.schedule_mode === "both";

  const [
    presenter,
    { data: schedules },
    { data: plan },
    { data: sessions },
    { data: sessionRegistrants },
    { data: waitingRoom },
  ] = await Promise.all([
    resolvePresenter(supabase, webinar),
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
    supabase
      .from("waiting_room_config")
      .select("bullets, background_url, background_type")
      .eq("webinar_id", webinar.id)
      .maybeSingle(),
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
  const { a: brandColorA, b: brandColorB } = resolveBrandColors(branding);
  const bullets = (Array.isArray(waitingRoom?.bullets) ? waitingRoom.bullets : []) as string[];
  const badgeLabel = webinar.category?.toUpperCase() || "WEBINAR GRATUITO";

  // Same host-uploaded background already used on the waiting room
  // (waiting_room_config.background_url) -- replaces the default animated
  // gradient/particles panel when set, instead of only ever showing on the
  // waiting room reached after registering.
  const heroBackground = waitingRoom?.background_url ? (
    <>
      {waitingRoom.background_type === "video" ? (
        <video
          src={waitingRoom.background_url}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 size-full object-cover opacity-40"
        />
      ) : (
        <Image
          src={waitingRoom.background_url}
          alt=""
          fill
          className="object-cover opacity-40"
          unoptimized
        />
      )}
    </>
  ) : (
    <>
      <GradientBlobs colorA={brandColorA} colorB={brandColorB} />
      <ParticleNetwork color="148, 163, 255" particleCount={28} opacity={0.4} />
    </>
  );

  const registrationForm = (
    <RegistrationForm
      webinarId={webinar.id}
      returnTo={`/w/${accountSlug}/${webinarSlug}`}
      scheduleMode={webinar.schedule_mode}
      offsets={webinar.just_in_time_offsets_minutes}
      occurrences={occurrences}
      allFixedSlotsFull={allFixedSlotsFull}
      hasFacebookPixel={Boolean(webinar.facebook_pixel_id)}
      brandColorA={brandColorA}
      brandColorB={brandColorB}
      previewMode={isPreview}
    />
  );

  const accountBadge = branding.logo_url ? (
    <Image
      src={branding.logo_url}
      alt={account.name}
      width={28}
      height={28}
      className="size-7 rounded-md object-contain"
      unoptimized
    />
  ) : (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
      style={{ background: `linear-gradient(135deg, ${brandColorA}, ${brandColorB})` }}
    >
      {account.name.slice(0, 2).toUpperCase()}
    </span>
  );

  return (
    <div className="min-h-svh bg-[#fafafa]">
      {isPreview && (
        <div className="sticky top-0 z-20 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
          Vista previa — este webinar todavía no está publicado. Solo tú puedes ver esta página.
        </div>
      )}
      {webinar.facebook_pixel_id && <FacebookPixel pixelId={webinar.facebook_pixel_id} />}
      {/* Desktop: brand panel + form, same split-panel language as /login. */}
      <div className="hidden min-h-svh md:grid md:grid-cols-2">
        <div className="relative flex flex-col justify-center gap-8 overflow-hidden bg-[#0b0f19] px-14 py-16 text-white">
          {heroBackground}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-transparent" />

          <div className="relative z-10 flex flex-col gap-7">
            <div className="flex items-center gap-2.5">
              {accountBadge}
              <span className="text-sm text-white/70">{account.name} presenta</span>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5">
              <Sparkles className="size-3.5 text-indigo-200" />
              <span className="text-xs font-semibold tracking-wide text-indigo-200">{badgeLabel}</span>
            </div>

            <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight">{webinar.title}</h1>

            {webinar.description && (
              <p className="max-w-md text-sm text-white/60">{webinar.description}</p>
            )}

            {presenter && (presenter.display_name || presenter.avatar_url) && (
              <div className="flex items-center gap-3">
                {presenter.avatar_url ? (
                  <Image
                    src={presenter.avatar_url}
                    alt={presenter.display_name ?? ""}
                    width={44}
                    height={44}
                    className="size-11 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span
                    className="flex size-11 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ background: `linear-gradient(135deg, ${brandColorA}, ${brandColorB})` }}
                  >
                    {(presenter.display_name ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                )}
                {presenter.display_name && (
                  <span className="text-sm font-medium">{presenter.display_name}</span>
                )}
              </div>
            )}

            {bullets.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
                {bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <svg
                      className="mt-0.5 size-[18px] shrink-0 text-indigo-200"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    <span className="text-sm leading-relaxed text-white/75">{bullet}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center px-10 py-16">
          <div className="flex w-full max-w-md flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reserva tu lugar</h2>
              <p className="text-sm text-gray-500">Elige un horario y guarda tu cupo gratis.</p>
            </div>
            {registrationForm}
          </div>
        </div>
      </div>

      {/* Mobile: minimal card, gradient accent strip, same brand colors. */}
      <div className="flex flex-col items-center px-5 py-10 md:hidden">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${brandColorA}, ${brandColorB})` }} />
          <div className="flex flex-col gap-6 p-7">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {accountBadge}
                <span className="text-xs text-gray-500">{account.name}</span>
              </div>
              {webinar.category && (
                <span
                  className="w-fit text-xs font-semibold tracking-wide"
                  style={{ color: brandColorA }}
                >
                  {badgeLabel}
                </span>
              )}
              <h1 className="text-xl font-bold leading-snug text-gray-900">{webinar.title}</h1>
              {presenter?.display_name && (
                <p className="text-xs text-gray-500">Presenta {presenter.display_name}</p>
              )}
            </div>
            {registrationForm}
          </div>
        </div>
      </div>
    </div>
  );
}
