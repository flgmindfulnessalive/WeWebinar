"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { MessageSquare } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { fakeViewerCount } from "@/lib/fake-viewers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LockedYouTubePlayer,
  type LockedYouTubePlayerHandle,
} from "@/components/locked-youtube-player";
import { ChatPanel } from "./chat-panel";
import type {
  ChatMessageType,
  CtaType,
  Database,
  Json,
} from "@/lib/supabase/database.types";

type ChatMessage = {
  id: string;
  timestamp_seconds: number;
  fake_name: string;
  message_text: string;
  message_type: ChatMessageType;
};

type Cta = {
  id: string;
  type: CtaType;
  timestamp_start_seconds: number;
  timestamp_end_seconds: number | null;
  config: Json;
};

type Presenter = Database["public"]["Views"]["presenter_public_profile"]["Row"] | null;

const RESYNC_INTERVAL_MS = 20_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const DRIFT_TOLERANCE_SECONDS = 1.5;

export function LiveRoomClient({
  accessToken,
  webinarId,
  webinarTitle,
  youtubeVideoId,
  durationSeconds: initialDurationSeconds,
  initialElapsedSeconds,
  fakeViewerMin,
  fakeViewerMax,
  sessionStart,
  visitorName,
  accountName,
  accountLogoUrl,
  presenter,
  chatMessages,
  ctas,
}: {
  accessToken: string;
  webinarId: string;
  webinarTitle: string;
  youtubeVideoId: string;
  durationSeconds: number;
  initialElapsedSeconds: number;
  fakeViewerMin: number;
  fakeViewerMax: number;
  sessionStart: string;
  visitorName: string;
  accountName: string;
  accountLogoUrl: string | null;
  presenter: Presenter;
  chatMessages: ChatMessage[];
  ctas: Cta[];
}) {
  const playerRef = useRef<LockedYouTubePlayerHandle | null>(null);
  // Set from an effect, never read during render — only inside effects and
  // event handlers, where accessing refs and calling Date.now() is fine.
  const mountedAtRef = useRef<number | null>(null);
  const elapsedAnchorRef = useRef(initialElapsedSeconds);
  const [durationSeconds, setDurationSeconds] = useState(initialDurationSeconds);
  const [isEnded, setIsEnded] = useState(
    durationSeconds > 0 && initialElapsedSeconds >= durationSeconds
  );
  const [isMuted, setIsMuted] = useState(true);
  const [showChat, setShowChat] = useState(true);
  // Ticks once a second so the fake counter/CTAs stay current; computed
  // inside the effect (an event-handler-like context), not during render.
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);

  const getElapsedSeconds = useCallback(() => {
    const mountedAt = mountedAtRef.current;
    if (mountedAt === null) return elapsedAnchorRef.current;
    const raw = elapsedAnchorRef.current + (Date.now() - mountedAt) / 1000;
    return durationSeconds > 0 ? Math.min(raw, durationSeconds) : raw;
  }, [durationSeconds]);

  const supabase = useMemo(() => createClient(), []);

  // These calls were previously fire-and-forgotten with no error check --
  // a failure (bad token, RLS, a transient network blip) was completely
  // invisible, which made "no analytics data at all despite testing a lot"
  // impossible to diagnose. Log failures to the browser console instead.
  const recordViewerEvent = useCallback(
    (
      eventType: "join" | "heartbeat" | "leave" | "cta_click" | "poll_response",
      opts?: { videoTimestampSeconds?: number; metadata?: Json }
    ) => {
      supabase
        .rpc("record_viewer_event", {
          p_access_token: accessToken,
          p_event_type: eventType,
          p_video_timestamp_seconds: opts?.videoTimestampSeconds,
          p_metadata: opts?.metadata,
        })
        .then(({ error }) => {
          if (error) console.error(`[live-room] record_viewer_event(${eventType}) failed:`, error);
        });
    },
    [supabase, accessToken]
  );

  useEffect(() => {
    mountedAtRef.current = Date.now();
    const interval = setInterval(() => setElapsedSeconds(getElapsedSeconds()), 1000);
    return () => clearInterval(interval);
  }, [getElapsedSeconds]);

  // join event once, best-effort leave event on unload.
  useEffect(() => {
    recordViewerEvent("join");
    const onUnload = () => {
      recordViewerEvent("leave", { videoTimestampSeconds: Math.round(getElapsedSeconds()) });
    };
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat.
  useEffect(() => {
    const interval = setInterval(() => {
      recordViewerEvent("heartbeat", { videoTimestampSeconds: Math.round(getElapsedSeconds()) });
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [recordViewerEvent, getElapsedSeconds]);

  // Periodic server resync — corrects drift from sleep/backgrounding and
  // catches the ended state even if this tab never fires 'ended'.
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase.rpc("get_registrant_playback_state", {
        p_access_token: accessToken,
      });
      const state = data?.[0];
      if (!state) return;
      elapsedAnchorRef.current = state.elapsed_seconds;
      mountedAtRef.current = Date.now();
      if (state.duration_seconds !== null) setDurationSeconds(state.duration_seconds);
      if (state.is_ended) setIsEnded(true);
    }, RESYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [supabase, accessToken]);

  const handleLoadedMetadata = (playerDurationSeconds: number) => {
    if (playerRef.current) playerRef.current.currentTime = getElapsedSeconds();
    if (durationSeconds === 0 && playerDurationSeconds > 0) {
      setDurationSeconds(Math.round(playerDurationSeconds));
    }
  };

  const handleTimeUpdate = () => {
    const player = playerRef.current;
    if (!player) return;
    const expected = getElapsedSeconds();
    if (Math.abs(player.currentTime - expected) > DRIFT_TOLERANCE_SECONDS) {
      player.currentTime = expected;
    }
    if (durationSeconds > 0 && expected >= durationSeconds) setIsEnded(true);
  };

  const handlePause = () => {
    if (!isEnded) playerRef.current?.play();
  };

  const handleRateChange = () => {
    const player = playerRef.current;
    if (player && player.playbackRate !== 1) player.playbackRate = 1;
  };

  const handleUnmute = () => {
    playerRef.current?.unmuteSmoothly();
    setIsMuted(false);
  };

  const viewerCount = fakeViewerCount({
    seed: `${webinarId}:${sessionStart}`,
    elapsedSeconds,
    durationSeconds,
    min: fakeViewerMin,
    max: fakeViewerMax,
  });

  const elapsed = elapsedSeconds;
  const activeCtas = ctas.filter(
    (c) =>
      c.timestamp_start_seconds <= elapsed &&
      (c.timestamp_end_seconds === null || elapsed <= c.timestamp_end_seconds)
  );

  function recordCtaClick(ctaId: string) {
    recordViewerEvent("cta_click", {
      videoTimestampSeconds: Math.round(getElapsedSeconds()),
      metadata: { cta_id: ctaId },
    });
  }

  function recordPollResponse(ctaId: string, option: string) {
    recordViewerEvent("poll_response", {
      videoTimestampSeconds: Math.round(getElapsedSeconds()),
      metadata: { cta_id: ctaId, option },
    });
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {accountLogoUrl && (
            <Image
              src={accountLogoUrl}
              alt={accountName}
              width={100}
              height={28}
              className="h-6 w-auto shrink-0 object-contain sm:h-7"
              unoptimized
            />
          )}
          <span className="truncate text-sm font-medium">{webinarTitle}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {presenter?.display_name && (
            <div className="hidden items-center gap-2 md:flex">
              {presenter.avatar_url && (
                <Image
                  src={presenter.avatar_url}
                  alt={presenter.display_name}
                  width={24}
                  height={24}
                  className="size-6 rounded-full object-cover"
                  unoptimized
                />
              )}
              <span className="text-xs text-muted-foreground">{presenter.display_name}</span>
            </div>
          )}
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {viewerCount} conectados
          </span>
          <Button size="sm" variant="outline" onClick={() => setShowChat((s) => !s)}>
            <MessageSquare className="size-4 sm:hidden" />
            <span className="hidden sm:inline">{showChat ? "Ocultar chat" : "Mostrar chat"}</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="relative flex flex-1 items-center justify-center bg-black">
          {isEnded ? (
            <EndedState webinarTitle={webinarTitle} ctas={ctas} onCtaClick={recordCtaClick} />
          ) : (
            <>
              <LockedYouTubePlayer
                ref={playerRef}
                videoId={youtubeVideoId}
                autoPlay
                muted={isMuted}
                onOverlayClick={isMuted ? handleUnmute : undefined}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPause={handlePause}
                onRateChange={handleRateChange}
                onEnded={() => setIsEnded(true)}
              />
              {isMuted && (
                <button
                  type="button"
                  onClick={handleUnmute}
                  className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg"
                >
                  🔇 Click en cualquier parte del video para activar el sonido
                </button>
              )}
              {activeCtas.map((cta) => (
                <CtaOverlay
                  key={cta.id}
                  cta={cta}
                  onLinkClick={() => recordCtaClick(cta.id)}
                  onPollAnswer={(option) => recordPollResponse(cta.id, option)}
                />
              ))}
            </>
          )}
        </div>

        {showChat && (
          <div className="h-56 w-full shrink-0 md:h-auto md:w-80">
            <ChatPanel
              accessToken={accessToken}
              visitorName={visitorName}
              simulatedMessages={chatMessages}
              getElapsedSeconds={getElapsedSeconds}
              onClose={() => setShowChat(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CtaOverlay({
  cta,
  onLinkClick,
  onPollAnswer,
}: {
  cta: Cta;
  onLinkClick: () => void;
  onPollAnswer: (option: string) => void;
}) {
  const config = (cta.config ?? {}) as Record<string, unknown>;

  if (cta.type === "link") {
    const style = String(config.style ?? "banner");
    const text = String(config.text ?? "");
    const url = String(config.url ?? "#");
    const positionClass =
      style === "fixed_button"
        ? "bottom-4 right-4"
        : style === "popup"
          ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          : "bottom-4 left-1/2 -translate-x-1/2";

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={onLinkClick}
        className={cn(
          "absolute z-10 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg",
          positionClass
        )}
      >
        {text}
      </a>
    );
  }

  if (cta.type === "overlay") {
    const text = config.text ? String(config.text) : null;
    const imageUrl = config.image_url ? String(config.image_url) : null;
    return (
      <div className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 rounded-md bg-black/80 p-4 text-white shadow-lg">
        {imageUrl && (
          <Image src={imageUrl} alt="" width={240} height={120} className="max-h-32 w-auto object-contain" unoptimized />
        )}
        {text && <p className="text-sm">{text}</p>}
      </div>
    );
  }

  if (cta.type === "poll") {
    const question = String(config.question ?? "");
    const options = Array.isArray(config.options) ? (config.options as string[]) : [];
    return (
      <div className="absolute bottom-16 left-1/2 z-10 flex w-80 -translate-x-1/2 flex-col gap-2 rounded-md bg-black/85 p-4 text-white shadow-lg">
        <p className="text-sm font-medium">{question}</p>
        <div className="flex flex-col gap-1.5">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => onPollAnswer(option)}
              className="rounded-md border border-white/30 px-3 py-1.5 text-left text-sm hover:bg-white/10"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function EndedState({
  webinarTitle,
  ctas,
  onCtaClick,
}: {
  webinarTitle: string;
  ctas: Cta[];
  onCtaClick: (ctaId: string) => void;
}) {
  const linkCtas = ctas.filter((c) => c.type === "link");

  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center text-white">
      <p className="text-xl font-semibold">Gracias por acompañarnos en {webinarTitle}</p>
      <p className="text-sm text-white/70">El webinar terminó.</p>
      {linkCtas.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {linkCtas.map((cta) => {
            const config = (cta.config ?? {}) as Record<string, unknown>;
            return (
              <a
                key={cta.id}
                href={String(config.url ?? "#")}
                target="_blank"
                rel="noreferrer"
                onClick={() => onCtaClick(cta.id)}
                className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                {String(config.text ?? "Ver más")}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
