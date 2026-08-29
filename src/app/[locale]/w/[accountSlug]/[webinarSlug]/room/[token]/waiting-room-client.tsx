"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { fakeViewerCount } from "@/lib/fake-viewers";
import { buildIcsDataUri, googleCalendarUrl } from "@/lib/ics";
import { DEFAULT_BRAND_COLOR_A, DEFAULT_BRAND_COLOR_B } from "@/lib/brand-colors";
import { PoweredByBadge } from "@/components/powered-by-badge";
import type { Database } from "@/lib/supabase/database.types";
import type { Presenter } from "@/lib/presenter";

type WaitingRoomConfig = Database["public"]["Tables"]["waiting_room_config"]["Row"] | null;

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function WaitingRoomClient({
  webinarId,
  webinarTitle,
  liveRoomPath,
  sessionStart,
  serverNow,
  config,
  presenter,
  isFixedSchedule,
  accountName,
  accountLogoUrl,
  brandColorA = DEFAULT_BRAND_COLOR_A,
  brandColorB = DEFAULT_BRAND_COLOR_B,
  showPoweredBy = true,
}: {
  webinarId: string;
  webinarTitle: string;
  liveRoomPath: string;
  sessionStart: string;
  serverNow: string;
  config: WaitingRoomConfig;
  presenter: Presenter;
  // Fixed-schedule waits can be hours or days long, unlike a just-in-time
  // start (always a few minutes away) -- a "N personas esperando" counter
  // ticking for that whole window reads as obviously fake, so it's
  // suppressed for fixed schedules regardless of the host's own toggle.
  isFixedSchedule: boolean;
  accountName?: string | null;
  accountLogoUrl?: string | null;
  brandColorA?: string;
  brandColorB?: string;
  showPoweredBy?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("WaitingRoom");
  const locale = useLocale();

  // Anchor once against the server-provided (sessionStart, serverNow) pair,
  // then tick locally using only the client's *elapsed* time since mount
  // (performance.now()-style delta) — never its absolute wall clock.
  const initialRemainingMs = useMemo(
    () => new Date(sessionStart).getTime() - new Date(serverNow).getTime(),
    [sessionStart, serverNow]
  );
  const [mountedAt] = useState(() => Date.now());
  const [remainingMs, setRemainingMs] = useState(initialRemainingMs);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsedSinceMount = Date.now() - mountedAt;
      const remaining = initialRemainingMs - elapsedSinceMount;
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        router.replace(liveRoomPath);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [initialRemainingMs, mountedAt, liveRoomPath, router]);

  const viewerCount = fakeViewerCount({
    seed: `${webinarId}:${sessionStart}`,
    elapsedSeconds: -(remainingMs / 1000),
    durationSeconds: 0,
    min: 12,
    max: 60,
  });

  const bullets = (Array.isArray(config?.bullets) ? config.bullets : []) as string[];
  const testimonials = (
    Array.isArray(config?.testimonials) ? config.testimonials : []
  ) as { name: string; text: string }[];
  const startDate = new Date(sessionStart);
  const roomUrl =
    typeof window !== "undefined" ? `${window.location.origin}${liveRoomPath}` : liveRoomPath;

  // No explicit timeZone: the visitor's timezone doesn't travel as a prop
  // to this component, so we lean on the browser's own local zone (the
  // correct one to show here) by simply omitting the option.
  const formattedStart = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(sessionStart)),
    [sessionStart, locale]
  );

  const showCounter = config?.show_fake_counter !== false && !isFixedSchedule;
  const showCalendar = config?.show_calendar_button !== false;
  const headline = config?.headline ?? t("defaultHeadline");

  const glowRing = `radial-gradient(circle, ${brandColorA}59, ${brandColorB}1f 60%, transparent 75%)`;
  const gradientBadge = `linear-gradient(135deg, ${brandColorA}, ${brandColorB})`;

  const calendarButtons = showCalendar && (
    <div className="flex flex-wrap justify-center gap-2.5">
      <a
        href={buildIcsDataUri({
          title: webinarTitle,
          startsAt: startDate,
          url: roomUrl,
          description: t("icsDescription", { url: roomUrl }),
        })}
        download={`${webinarTitle}.ics`}
        className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/6 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
      >
        <Calendar className="size-3.5" />
        {t("addToCalendar")}
      </a>
      <a
        href={googleCalendarUrl({
          title: webinarTitle,
          startsAt: startDate,
          details: t("icsDescription", { url: roomUrl }),
        })}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/6 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
      >
        {t("googleCalendar")}
      </a>
    </div>
  );

  const accountBadge = (
    <div className="flex items-center gap-2">
      {accountLogoUrl ? (
        <Image
          src={accountLogoUrl}
          alt={accountName ?? ""}
          width={24}
          height={24}
          className="size-6 rounded-md object-contain"
          unoptimized
        />
      ) : (
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
          style={{ background: gradientBadge }}
        >
          {(accountName ?? "W").slice(0, 2).toUpperCase()}
        </span>
      )}
      {accountName && <span className="text-xs text-white/55">{accountName}</span>}
    </div>
  );

  const presenterRow = presenter && (presenter.display_name || presenter.avatar_url) && (
    <div className="flex items-center gap-3">
      {presenter.avatar_url ? (
        <Image
          src={presenter.avatar_url}
          alt={presenter.display_name ?? ""}
          width={40}
          height={40}
          className="size-10 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <span
          className="flex size-10 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: gradientBadge }}
        >
          {(presenter.display_name ?? "?").slice(0, 2).toUpperCase()}
        </span>
      )}
      {presenter.display_name && <span className="text-sm font-medium">{presenter.display_name}</span>}
    </div>
  );

  const bulletsList = bullets.length > 0 && (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
        {t("whatYouWillLearn")}
      </p>
      {bullets.map((bullet, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <svg
            className="mt-0.5 size-4 shrink-0 text-indigo-200"
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
  );

  const viewerPill = showCounter && (
    <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3.5 py-1.5">
      <Users className="size-3.5 text-indigo-200" />
      <span className="text-xs text-white/75">{t("waitingCount", { count: viewerCount })}</span>
    </div>
  );

  const testimonialsBlock = testimonials.length > 0 && (
    <div className="flex w-full max-w-md flex-col gap-2">
      {testimonials.map((t, i) => (
        <p key={i} className="text-sm italic text-white/55">
          &quot;{t.text}&quot; {t.name && `— ${t.name}`}
        </p>
      ))}
    </div>
  );

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#0b0f19] text-white">
      {config?.background_url && (
        <div className="absolute inset-0 -z-10">
          {config.background_type === "video" ? (
            <video
              src={config.background_url}
              autoPlay
              muted
              loop
              playsInline
              className="size-full object-cover opacity-30"
            />
          ) : (
            <Image
              src={config.background_url}
              alt=""
              fill
              className="object-cover opacity-30"
              unoptimized
            />
          )}
        </div>
      )}

      {/* Desktop: split panel, countdown as dominant left element (dashboard
          wizard note continuation of registration Option A's brand panel). */}
      <div className="hidden min-h-svh md:grid md:grid-cols-[1.1fr_1fr]">
        <div className="relative flex flex-col items-center justify-center gap-7 overflow-hidden px-12 py-16 text-center">
          <div
            aria-hidden
            className="absolute -top-24 left-1/2 size-[26rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
            style={{ background: brandColorA }}
          />
          <div
            aria-hidden
            className="absolute -bottom-28 -left-24 size-[20rem] rounded-full opacity-20 blur-3xl"
            style={{ background: brandColorB }}
          />

          <div className="relative z-10 flex flex-col items-center gap-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{headline}</p>

            <div className="relative flex size-[17.5rem] items-center justify-center">
              <div
                aria-hidden
                className="absolute inset-0 rounded-full blur-sm"
                style={{ background: glowRing }}
              />
              <div aria-hidden className="absolute inset-4 rounded-full border border-white/12" />
              <div className="relative text-6xl font-extrabold tracking-tight tabular-nums">
                {formatCountdown(remainingMs)}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-white/65">
              <Calendar className="size-4" />
              {formattedStart} <span className="text-xs">{t("localTime")}</span>
            </div>

            {viewerPill}
          </div>
        </div>

        <div className="flex flex-col justify-center gap-7 bg-[#12172a] px-12 py-16">
          {accountBadge}
          <h1 className="max-w-md text-2xl font-bold leading-snug">{webinarTitle}</h1>
          {config?.subheadline && <p className="max-w-md text-sm text-white/60">{config.subheadline}</p>}
          {presenterRow}
          {bulletsList && <div className="border-t border-white/10 pt-6">{bulletsList}</div>}
          {calendarButtons}
          {testimonialsBlock}
          {showPoweredBy && <PoweredByBadge className="text-white/60" />}
        </div>
      </div>

      {/* Mobile: stacked, glow-centered around the countdown. */}
      <div className="relative flex flex-col items-center gap-7 px-6 py-14 text-center md:hidden">
        <div
          aria-hidden
          className="absolute -top-24 left-1/2 size-[26rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: brandColorA }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -right-24 size-[21rem] rounded-full opacity-20 blur-3xl"
          style={{ background: brandColorB }}
        />

        <div className="relative z-10 flex flex-col items-center gap-7">
          {accountBadge}

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/50">{headline}</p>
            <h1 className="max-w-xs text-xl font-bold leading-snug">{webinarTitle}</h1>
            {config?.subheadline && (
              <p className="mt-2 max-w-xs text-sm text-white/60">{config.subheadline}</p>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-white/65">
            <Calendar className="size-4" />
            {formattedStart} <span className="text-xs">{t("localTime")}</span>
          </div>

          <div className="relative flex size-[16rem] items-center justify-center">
            <div aria-hidden className="absolute inset-0 rounded-full blur-sm" style={{ background: glowRing }} />
            <div aria-hidden className="absolute inset-4 rounded-full border border-white/12" />
            <div className="relative text-5xl font-extrabold tracking-tight tabular-nums">
              {formatCountdown(remainingMs)}
            </div>
          </div>

          {viewerPill}
          {presenterRow}

          {bulletsList && (
            <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left">
              {bulletsList}
            </div>
          )}

          {calendarButtons}
          {testimonialsBlock}
          {showPoweredBy && <PoweredByBadge className="text-white/60" />}
        </div>
      </div>
    </div>
  );
}
