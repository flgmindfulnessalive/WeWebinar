import { notFound } from "next/navigation";
import Image from "next/image";
import { Clock, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAccount } from "@/lib/data/account";
import { computeUpcomingOccurrences } from "@/lib/scheduling";
import { resolveBrandColors } from "@/lib/brand-colors";
import { formatDurationLabel } from "@/lib/time";
import { resolvePresenter } from "@/lib/presenter";
import { ParticleNetwork } from "@/components/particle-network";
import { GradientBlobs } from "@/components/gradient-blobs";
import { FacebookPixel } from "@/components/facebook-pixel";
import { PoweredByBadge } from "@/components/powered-by-badge";
import { PromoVideoEmbed } from "@/components/promo-video-embed";
import { getActiveCustomDomainHostname, webinarPublicUrl } from "@/lib/domains/public-url";
import { RegistrationForm } from "./registration-form";

type RouteParams = { locale: string; accountSlug: string; webinarSlug: string };

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
  const { locale, accountSlug, webinarSlug } = await params;
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
  // The URL shared/scraped by Slack/WhatsApp previews and search engines --
  // without this, Next falls back to metadataBase (always the platform's
  // own domain) even when the account has an active custom domain, so a
  // link shared from webinars.cliente.com would preview as wewebinars.com.
  // custom_domains is locked to account members via RLS, so this admin
  // client is required here (the caller is an anonymous visitor).
  const customDomainHostname = await getActiveCustomDomainHostname(createAdminClient(), account.id);
  const url = webinarPublicUrl(accountSlug, webinarSlug, customDomainHostname, locale);
  // Always platform-hosted (the image-generation route only exists there,
  // never mirrored on a custom domain -- see the platform-vs-custom-domain
  // note on webinarPublicUrl above), so this is built with customDomainHostname
  // forced to null regardless of the canonical `url` above.
  const image = {
    url: `${webinarPublicUrl(accountSlug, webinarSlug, null, locale)}/opengraph-image`,
    width: 1200,
    height: 630,
  };

  return {
    title,
    description,
    alternates: { canonical: url },
    // Explicit `images` here, not left for Next.js to infer from the nested
    // opengraph-image.tsx file convention -- confirmed (via the same bug on
    // the Home/Pricing pages) that Next does NOT auto-merge a route's file-
    // convention image into a page's own openGraph/twitter object once that
    // page defines one itself, even a partial one: the deepest segment's
    // object replaces the parent's wholesale, images included, and file-
    // convention resolution only fires when nothing on the route already
    // defines that field. Without this, the tag is silently absent and
    // Meta/WhatsApp/etc. fall back to guessing an image from elsewhere.
    openGraph: { title, description, url, images: [image] },
    twitter: { title, description, images: [image] },
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
  const t = await getTranslations("Register");

  const { data: account } = await supabase
    .from("account_public_profile")
    .select("*")
    .eq("slug", accountSlug)
    .maybeSingle();
  if (!account) notFound();

  // A suspended (admin action) or canceled (billing lapse, past its paid
  // period) account stops serving its public pages -- the host's own
  // preview link included, since a canceled owner needs to reactivate
  // before touching anything again, previews too. Only an explicit `false`
  // blocks the page: a transient RPC error must never 404 every public
  // webinar link platform-wide, so an error or unexpected null fails open.
  const { data: isPublishable, error: publishableError } = await supabase.rpc(
    "account_is_publishable",
    { p_account_id: account.id }
  );
  if (!publishableError && isPublishable === false) notFound();

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
  } else {
    // Only real, published-page visits count -- a host previewing their own
    // unpublished webinar above never reaches here. Feeds Analytics'
    // "Visitas" funnel stage (get_webinar_summary); best-effort, so a
    // failure here never breaks the actual registration page.
    const { error: viewError } = await supabase.rpc("record_page_view", { p_webinar_id: webinar.id });
    if (viewError) console.error("[register] record_page_view failed:", viewError);
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
      ? supabase.from("plans").select("max_attendees_per_webinar, features").eq("id", account.plan_id).maybeSingle()
      : Promise.resolve({ data: null }),
    hasFixedSlots
      ? supabase.from("webinar_sessions").select("id, schedule_id, starts_at").eq("webinar_id", webinar.id)
      : Promise.resolve({ data: [] }),
    hasFixedSlots
      ? supabase.from("registrants").select("session_id").eq("webinar_id", webinar.id).not("session_id", "is", null)
      : Promise.resolve({ data: [] }),
    supabase
      .from("waiting_room_config")
      .select("bullets, background_url, background_type, promo_video_url")
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
  const removeBranding = Boolean((plan?.features as Record<string, boolean> | null)?.remove_branding);
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
  const badgeLabel = webinar.category?.toUpperCase() || t("defaultBadge");
  const durationSeconds = webinar.duration_seconds;

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
          {t("preview")}
        </div>
      )}
      {webinar.facebook_pixel_id && <FacebookPixel pixelId={webinar.facebook_pixel_id} />}
      {/* Desktop: brand panel + form, same split-panel language as /login. */}
      <div className="hidden min-h-svh md:grid md:grid-cols-2">
        <div className="relative flex flex-col justify-center gap-8 overflow-hidden bg-[#0b0f19] px-14 py-16 text-white">
          {heroBackground}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-transparent" />

          {!removeBranding && (
            <PoweredByBadge className="absolute bottom-8 left-14 z-10 text-white" />
          )}

          <div className="relative z-10 flex flex-col gap-7">
            <div className="flex items-center gap-2.5">
              {accountBadge}
              <span className="text-sm text-white/70">{t("presents", { name: account.name })}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5">
                <Sparkles className="size-3.5 text-indigo-200" />
                <span className="text-xs font-semibold tracking-wide text-indigo-200">{badgeLabel}</span>
              </div>
              {durationSeconds && durationSeconds > 0 && (
                <div className="inline-flex w-fit items-center gap-1.5 text-xs text-white/60">
                  <Clock className="size-3.5" />
                  {formatDurationLabel(durationSeconds)}
                </div>
              )}
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

            {waitingRoom?.promo_video_url && (
              <PromoVideoEmbed
                url={waitingRoom.promo_video_url}
                className="aspect-video w-full max-w-sm overflow-hidden rounded-xl"
              />
            )}

            {bullets.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
                  {t("audienceHeading")}
                </p>
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
              <h2 className="text-2xl font-bold text-gray-900">{t("reserveTitle")}</h2>
              <p className="text-sm text-gray-500">{t("reserveSubtitle")}</p>
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
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {webinar.category && (
                  <span
                    className="w-fit text-xs font-semibold tracking-wide"
                    style={{ color: brandColorA }}
                  >
                    {badgeLabel}
                  </span>
                )}
                {durationSeconds && durationSeconds > 0 && (
                  <span className="inline-flex w-fit items-center gap-1 text-xs text-gray-500">
                    <Clock className="size-3.5" />
                    {formatDurationLabel(durationSeconds)}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold leading-snug text-gray-900">{webinar.title}</h1>
              {presenter?.display_name && (
                <p className="text-xs text-gray-500">
                  {t("presentedBy", { name: presenter.display_name })}
                </p>
              )}
            </div>

            {waitingRoom?.promo_video_url && (
              <PromoVideoEmbed
                url={waitingRoom.promo_video_url}
                className="aspect-video w-full overflow-hidden rounded-xl"
              />
            )}

            {bullets.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-gray-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t("audienceHeading")}
                </p>
                {bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <svg
                      className="mt-0.5 size-[18px] shrink-0"
                      style={{ color: brandColorA }}
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
                    <span className="text-sm leading-relaxed text-gray-600">{bullet}</span>
                  </div>
                ))}
              </div>
            )}

            {registrationForm}
            {!removeBranding && (
              <PoweredByBadge className="mx-auto text-gray-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
