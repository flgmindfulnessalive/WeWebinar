"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { fakeViewerCount } from "@/lib/fake-viewers";
import { buildIcsDataUri, googleCalendarUrl } from "@/lib/ics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/database.types";

type WaitingRoomConfig = Database["public"]["Tables"]["waiting_room_config"]["Row"] | null;
type Presenter = Database["public"]["Views"]["presenter_public_profile"]["Row"] | null;

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
}) {
  const router = useRouter();

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

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden px-6 py-16 text-center">
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

      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {config?.headline ?? "Tu webinar está por comenzar"}
      </p>
      <h1 className="text-2xl font-semibold">{webinarTitle}</h1>
      {config?.subheadline && (
        <p className="max-w-md text-muted-foreground">{config.subheadline}</p>
      )}

      <div className="text-6xl font-bold tabular-nums tracking-tight">
        {formatCountdown(remainingMs)}
      </div>

      {config?.show_fake_counter !== false && !isFixedSchedule && (
        <p className="text-sm text-muted-foreground">{viewerCount} personas ya están esperando</p>
      )}

      {presenter && (presenter.display_name || presenter.avatar_url) && (
        <div className="flex items-center gap-2">
          {presenter.avatar_url && (
            <Image
              src={presenter.avatar_url}
              alt={presenter.display_name ?? ""}
              width={40}
              height={40}
              className="size-10 rounded-full object-cover"
              unoptimized
            />
          )}
          {presenter.display_name && <span className="text-sm">{presenter.display_name}</span>}
        </div>
      )}

      {bullets.length > 0 && (
        <Card className="w-full max-w-md text-left">
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-sm font-medium">Lo que vas a aprender:</p>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {bullets.map((bullet, i) => (
                <li key={i}>• {bullet}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {config?.show_calendar_button !== false && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={buildIcsDataUri({
                title: webinarTitle,
                startsAt: startDate,
                url: roomUrl,
                description: `Accede al webinar acá: ${roomUrl}`,
              })}
              download={`${webinarTitle}.ics`}
            >
              Agregar a mi calendario (.ics)
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href={googleCalendarUrl({
                title: webinarTitle,
                startsAt: startDate,
                details: `Accede al webinar acá: ${roomUrl}`,
              })}
              target="_blank"
              rel="noreferrer"
            >
              Google Calendar
            </a>
          </Button>
        </div>
      )}

      {testimonials.length > 0 && (
        <div className="flex w-full max-w-md flex-col gap-2">
          {testimonials.map((t, i) => (
            <p key={i} className="text-sm italic text-muted-foreground">
              &quot;{t.text}&quot; {t.name && `— ${t.name}`}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
