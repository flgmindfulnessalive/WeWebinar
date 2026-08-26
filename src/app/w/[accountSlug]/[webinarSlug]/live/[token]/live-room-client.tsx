"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Bell, MessageSquare, User, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { fakeViewerCount } from "@/lib/fake-viewers";
import { fakeConnectedNames } from "@/lib/fake-names";
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

type PanelTab = "chat" | "connected" | "presenter" | "notifications";

const RESYNC_INTERVAL_MS = 20_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const DRIFT_TOLERANCE_SECONDS = 2.5;
// Minimum time between corrective seeks. onTimeUpdate fires 4x/second, and
// a seekTo() forces the player to rebuffer -- without a cooldown, any
// sustained stall (slow network, a throttled background tab) turns into a
// seek storm: correct, still behind next tick because the seek itself
// triggered a rebuffer, correct again, every 250ms, forever. That hammers
// the player's media pipeline hard enough to crash the tab (observed as a
// real renderer OOM, not a JS memory leak) instead of just letting
// playback catch up naturally, which it does within a few seconds once
// left alone.
const CORRECTION_COOLDOWN_MS = 5000;

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
  const lastCorrectionAtRef = useRef(0);
  const [durationSeconds, setDurationSeconds] = useState(initialDurationSeconds);
  const [isEnded, setIsEnded] = useState(
    durationSeconds > 0 && initialElapsedSeconds >= durationSeconds
  );
  const [isMuted, setIsMuted] = useState(true);
  const [showPanel, setShowPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>("chat");
  // Ticks once a second so the fake counter/CTAs stay current; computed
  // inside the effect (an event-handler-like context), not during render.
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);

  const getElapsedSeconds = useCallback(() => {
    const mountedAt = mountedAtRef.current;
    if (mountedAt === null) return elapsedAnchorRef.current;
    // Deliberately not clamped to durationSeconds: once the webinar ends,
    // this keeps growing so the fake viewer count can keep draining toward
    // 0 (see fakeViewerCount) instead of freezing at whatever it was the
    // instant the video ended.
    return elapsedAnchorRef.current + (Date.now() - mountedAt) / 1000;
  }, []);

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
      const now = Date.now();
      // Only re-seek if the last correction had time to actually take --
      // see CORRECTION_COOLDOWN_MS above. Still drifting after the cooldown
      // is exactly what this is for (a real stall, not a rebuffer blip).
      if (now - lastCorrectionAtRef.current >= CORRECTION_COOLDOWN_MS) {
        player.currentTime = expected;
        lastCorrectionAtRef.current = now;
      }
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

  // Floored at 1: whatever the simulated curve says, the current visitor is
  // always actually connected (they're the one looking at this page), so
  // showing "0 conectados" while they watch the ended screen is never
  // accurate.
  const viewerCount = Math.max(
    1,
    fakeViewerCount({
      seed: `${webinarId}:${sessionStart}`,
      elapsedSeconds,
      durationSeconds,
      min: fakeViewerMin,
      max: fakeViewerMax,
    })
  );

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
          <Button size="sm" variant="outline" onClick={() => setShowPanel((s) => !s)}>
            <MessageSquare className="size-4 sm:hidden" />
            <span className="hidden sm:inline">{showPanel ? "Ocultar panel" : "Mostrar panel"}</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="relative flex flex-1 items-center justify-center bg-black">
          {isEnded ? (
            <EndedState webinarTitle={webinarTitle} ctas={ctas} onCtaClick={recordCtaClick} />
          ) : (
            <>
              <LiveBadge />
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

        {showPanel && (
          <div className="flex h-64 w-full shrink-0 flex-col border-t bg-background md:h-auto md:w-80 md:border-t-0 md:border-l">
            <div className="flex shrink-0 border-b">
              <PanelTabButton
                label="Chat"
                icon={MessageSquare}
                active={activeTab === "chat"}
                onClick={() => setActiveTab("chat")}
              />
              <PanelTabButton
                label="Conectados"
                icon={Users}
                active={activeTab === "connected"}
                onClick={() => setActiveTab("connected")}
                badge={viewerCount}
              />
              {presenter?.display_name && (
                <PanelTabButton
                  label="Presentador"
                  icon={User}
                  active={activeTab === "presenter"}
                  onClick={() => setActiveTab("presenter")}
                />
              )}
              {ctas.length > 0 && (
                <PanelTabButton
                  label="Avisos"
                  icon={Bell}
                  active={activeTab === "notifications"}
                  onClick={() => setActiveTab("notifications")}
                  badge={activeCtas.length || undefined}
                />
              )}
            </div>
            <div className="min-h-0 flex-1">
              {activeTab === "chat" && (
                <ChatPanel
                  accessToken={accessToken}
                  visitorName={visitorName}
                  replyDisplayName={presenter?.display_name ?? accountName}
                  simulatedMessages={chatMessages}
                  getElapsedSeconds={getElapsedSeconds}
                />
              )}
              {activeTab === "connected" && (
                <ConnectedTab
                  viewerCount={viewerCount}
                  visitorName={visitorName}
                  presenterName={presenter?.display_name ?? null}
                  chatMessages={chatMessages}
                  seed={`${webinarId}:${sessionStart}`}
                />
              )}
              {activeTab === "presenter" && presenter && <PresenterTab presenter={presenter} />}
              {activeTab === "notifications" && (
                <NotificationsTab
                  ctas={activeCtas}
                  onLinkClick={recordCtaClick}
                  onPollAnswer={recordPollResponse}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveBadge() {
  return (
    <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-red-500" />
      </span>
      En vivo
    </div>
  );
}

function PanelTabButton({
  label,
  icon: Icon,
  active,
  onClick,
  badge,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "flex min-w-0 flex-1 items-center justify-center gap-1 border-b-2 px-1.5 py-2 text-xs font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className={cn("truncate", !active && "sr-only")}>{label}</span>
      {typeof badge === "number" && badge > 0 && (
        <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          {badge}
        </span>
      )}
    </button>
  );
}

// Cap how many names the Conectados list ever renders -- viewerCount can
// run into the hundreds, and listing that many DOM rows (all obviously
// fake once you scroll past a couple dozen) is slow and not convincing.
// A short, plausible list plus a "y N más..." tail reads better and costs
// nothing to render.
const CONNECTED_LIST_CAP = 30;

function ConnectedTab({
  viewerCount,
  visitorName,
  presenterName,
  chatMessages,
  seed,
}: {
  viewerCount: number;
  visitorName: string;
  presenterName: string | null;
  chatMessages: ChatMessage[];
  seed: string;
}) {
  const seen = new Set<string>([visitorName]);
  if (presenterName) seen.add(presenterName);
  const chatNames: string[] = [];
  for (const m of chatMessages) {
    if (!seen.has(m.fake_name)) {
      seen.add(m.fake_name);
      chatNames.push(m.fake_name);
    }
  }

  // Only the visitor is guaranteed to actually be connected (they're the
  // one looking at this page) -- everyone else here is simulated, so as
  // viewerCount drains toward 1 (e.g. after the webinar ends), the fake
  // names must drain with it instead of lingering forever. They drop in
  // priority order -- filler names first, then the configured chat names,
  // then the presenter -- reserving one slot for the visitor, who is never
  // dropped.
  const availableSlots = Math.max(0, Math.min(CONNECTED_LIST_CAP, viewerCount) - 1);
  const showHost = presenterName !== null && availableSlots >= 1;
  const chatSlots = Math.max(0, availableSlots - (showHost ? 1 : 0));
  const shownChatNames = chatNames.slice(0, chatSlots);
  const fillerSlots = Math.max(0, availableSlots - (showHost ? 1 : 0) - shownChatNames.length);
  const fillerNames = fakeConnectedNames({ seed, count: fillerSlots, exclude: seen });

  const shownCount = 1 + (showHost ? 1 : 0) + shownChatNames.length + fillerNames.length;
  const moreCount = Math.max(0, viewerCount - shownCount);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-4 text-center">
        <p className="text-3xl font-semibold text-primary">{viewerCount}</p>
        <p className="text-xs text-muted-foreground">personas conectadas ahora</p>
      </div>
      <div className="flex flex-col gap-2">
        {showHost && (
          <div className="flex items-center gap-2 text-sm">
            <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate font-medium text-primary">{presenterName} (host)</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="truncate font-medium text-primary">{visitorName} (tú)</span>
        </div>
        {shownChatNames.map((name) => (
          <div key={name} className="flex items-center gap-2 text-sm">
            <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate text-muted-foreground">{name}</span>
          </div>
        ))}
        {fillerNames.map((name) => (
          <div key={name} className="flex items-center gap-2 text-sm">
            <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate text-muted-foreground">{name}</span>
          </div>
        ))}
      </div>
      {moreCount > 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">y {moreCount} más...</p>
      )}
    </div>
  );
}

function PresenterTab({ presenter }: { presenter: NonNullable<Presenter> }) {
  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-y-auto p-4 text-center">
      {presenter.avatar_url && (
        <Image
          src={presenter.avatar_url}
          alt={presenter.display_name ?? ""}
          width={80}
          height={80}
          className="size-20 rounded-full object-cover"
          unoptimized
        />
      )}
      {presenter.display_name && <p className="text-sm font-semibold">{presenter.display_name}</p>}
      {presenter.bio && <p className="text-xs text-muted-foreground">{presenter.bio}</p>}
    </div>
  );
}

function NotificationsTab({
  ctas,
  onLinkClick,
  onPollAnswer,
}: {
  ctas: Cta[];
  onLinkClick: (ctaId: string) => void;
  onPollAnswer: (ctaId: string, option: string) => void;
}) {
  if (ctas.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
        Aquí verás encuestas, mensajes y ofertas cuando aparezcan.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      {ctas.map((cta) => (
        <NotificationCard
          key={cta.id}
          cta={cta}
          onLinkClick={() => onLinkClick(cta.id)}
          onPollAnswer={(option) => onPollAnswer(cta.id, option)}
        />
      ))}
    </div>
  );
}

function NotificationCard({
  cta,
  onLinkClick,
  onPollAnswer,
}: {
  cta: Cta;
  onLinkClick: () => void;
  onPollAnswer: (option: string) => void;
}) {
  const config = (cta.config ?? {}) as Record<string, unknown>;

  if (cta.type === "poll") {
    const question = String(config.question ?? "");
    const options = Array.isArray(config.options) ? (config.options as string[]) : [];
    return (
      <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3">
        <p className="text-sm font-medium">📊 {question}</p>
        <div className="flex flex-col gap-1.5">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => onPollAnswer(option)}
              className="rounded-md border px-3 py-1.5 text-left text-sm hover:bg-muted"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (cta.type === "link") {
    const text = String(config.text ?? "");
    const url = String(config.url ?? "#");
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={onLinkClick}
        className="flex flex-col gap-1 rounded-md border bg-muted/40 p-3 text-sm hover:bg-muted"
      >
        <span className="font-medium">🔗 {text}</span>
        <span className="text-xs text-muted-foreground">Toca para ver más</span>
      </a>
    );
  }

  const text = config.text ? String(config.text) : null;
  const imageUrl = config.image_url ? String(config.image_url) : null;
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3">
      {imageUrl && (
        <Image
          src={imageUrl}
          alt=""
          width={240}
          height={120}
          className="max-h-24 w-auto object-contain"
          unoptimized
        />
      )}
      {text && <p className="text-sm">📢 {text}</p>}
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
