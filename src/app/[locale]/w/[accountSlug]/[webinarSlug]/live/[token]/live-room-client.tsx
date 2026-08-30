"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Bell, MessageSquare, User, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { secondsToClock } from "@/lib/time";
import { fakeViewerCount } from "@/lib/fake-viewers";
import { fakeConnectedNames } from "@/lib/fake-names";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WebinarPlayer, type WebinarPlayerHandle } from "@/components/webinar-player";
import { ChatPanel } from "./chat-panel";
import { LiveReactions } from "./reactions";
import { PoweredByBadge } from "@/components/powered-by-badge";
import type { ChatMessageType, CtaType, Json, VideoProvider } from "@/lib/supabase/database.types";
import type { Presenter } from "@/lib/presenter";

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
  videoProvider,
  videoSource,
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
  showPoweredBy = true,
}: {
  accessToken: string;
  webinarId: string;
  webinarTitle: string;
  videoProvider: VideoProvider;
  videoSource: string;
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
  showPoweredBy?: boolean;
}) {
  const t = useTranslations("LiveRoom");
  const playerRef = useRef<WebinarPlayerHandle | null>(null);
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
  // Which option this viewer picked per poll cta, and the live tally to
  // show back once they have. Session-only (not persisted) -- the server
  // already dedupes to one vote per registrant (get_cta_poll_results), so
  // a page reload just means seeing the vote buttons again, not a second
  // vote counted.
  const [pollAnswers, setPollAnswers] = useState<Record<string, string>>({});
  const [pollResults, setPollResults] = useState<Record<string, { option: string; votes: number }[]>>(
    {}
  );
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
      eventType: "join" | "heartbeat" | "leave" | "cta_click" | "poll_response" | "reaction",
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

  // Separate from recordViewerEvent above (that's internal analytics,
  // always recorded) -- this only fires the two account-configured
  // webhook events that can happen client-side (Settings -> Integraciones
  // -> Webhooks). Best-effort: a failed delivery here must never affect
  // playback or the chat.
  const fireWebhookTrigger = useCallback(
    (eventType: "cta_click" | "completion", metadata?: Record<string, unknown>) => {
      fetch("/api/webhooks/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, event_type: eventType, metadata }),
      }).catch((err) => console.error(`[live-room] webhook trigger(${eventType}) failed:`, err));
    },
    [accessToken]
  );
  const completionFiredRef = useRef(false);
  const fireCompletionOnce = useCallback(() => {
    if (completionFiredRef.current) return;
    completionFiredRef.current = true;
    fireWebhookTrigger("completion");
  }, [fireWebhookTrigger]);

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

  // Heartbeat. Stops once the webinar has ended -- otherwise a tab left open
  // on the "gracias por asistir" screen keeps recording heartbeats forever,
  // against an elapsed time that's deliberately unclamped (see
  // getElapsedSeconds above), which is what produced attendees showing
  // absurd watch times (20+ hours) in analytics.
  useEffect(() => {
    if (isEnded) return;
    const interval = setInterval(() => {
      recordViewerEvent("heartbeat", { videoTimestampSeconds: Math.round(getElapsedSeconds()) });
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isEnded, recordViewerEvent, getElapsedSeconds]);

  // Periodic server resync — corrects drift from sleep/backgrounding and
  // catches the ended state even if this tab never fires 'ended'. Same
  // stop-on-end guard as the heartbeat above: once isEnded is true there's
  // nothing left to resync.
  useEffect(() => {
    if (isEnded) return;
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
  }, [isEnded, supabase, accessToken]);

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
    if (durationSeconds > 0 && expected >= durationSeconds) {
      setIsEnded(true);
      fireCompletionOnce();
    }
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

  function handleReaction(emoji: string) {
    recordViewerEvent("reaction", {
      videoTimestampSeconds: Math.round(getElapsedSeconds()),
      metadata: { emoji },
    });
  }

  function recordCtaClick(ctaId: string) {
    recordViewerEvent("cta_click", {
      videoTimestampSeconds: Math.round(getElapsedSeconds()),
      metadata: { cta_id: ctaId },
    });
    fireWebhookTrigger("cta_click", { cta_id: ctaId });
  }

  function recordPollResponse(ctaId: string, option: string) {
    setPollAnswers((prev) => ({ ...prev, [ctaId]: option }));
    recordViewerEvent("poll_response", {
      videoTimestampSeconds: Math.round(getElapsedSeconds()),
      metadata: { cta_id: ctaId, option },
    });
    supabase
      .rpc("get_cta_poll_results", { p_access_token: accessToken, p_cta_id: ctaId })
      .then(({ data, error }) => {
        if (error) {
          console.error("[live-room] get_cta_poll_results failed:", error);
          return;
        }
        setPollResults((prev) => ({
          ...prev,
          [ctaId]: (data ?? []).map((row) => ({ option: row.option ?? "", votes: row.votes })),
        }));
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
            {t("viewersConnected", { count: viewerCount })}
          </span>
          {showPoweredBy && <PoweredByBadge className="hidden text-muted-foreground md:inline-flex" />}
          <Button
            size="sm"
            variant="outline"
            aria-label={showPanel ? t("hidePanel") : t("showPanel")}
            onClick={() => setShowPanel((s) => !s)}
          >
            <MessageSquare className="size-4 sm:hidden" />
            <span className="hidden sm:inline">{showPanel ? t("hidePanel") : t("showPanel")}</span>
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
              <WebinarPlayer
                ref={playerRef}
                provider={videoProvider}
                source={videoSource}
                autoPlay
                muted={isMuted}
                onOverlayClick={isMuted ? handleUnmute : undefined}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPause={handlePause}
                onRateChange={handleRateChange}
                onEnded={() => {
                  setIsEnded(true);
                  fireCompletionOnce();
                }}
              />
              {isMuted && (
                <button
                  type="button"
                  onClick={handleUnmute}
                  className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg"
                >
                  {t("clickToUnmute")}
                </button>
              )}
              {activeCtas.map((cta) => (
                <CtaOverlay
                  key={cta.id}
                  cta={cta}
                  onLinkClick={() => recordCtaClick(cta.id)}
                  onPollAnswer={(option) => recordPollResponse(cta.id, option)}
                  answeredOption={pollAnswers[cta.id]}
                  results={pollResults[cta.id]}
                  getElapsedSeconds={getElapsedSeconds}
                />
              ))}
              <LiveReactions onReact={handleReaction} />
            </>
          )}
        </div>

        {showPanel && (
          <div className="flex h-64 w-full shrink-0 flex-col border-t bg-background md:h-auto md:w-80 md:border-t-0 md:border-l">
            <div className="flex shrink-0 border-b">
              <PanelTabButton
                label={t("tabChat")}
                icon={MessageSquare}
                active={activeTab === "chat"}
                onClick={() => setActiveTab("chat")}
              />
              <PanelTabButton
                label={t("tabConnected")}
                icon={Users}
                active={activeTab === "connected"}
                onClick={() => setActiveTab("connected")}
                badge={viewerCount}
              />
              {presenter?.display_name && (
                <PanelTabButton
                  label={t("tabPresenter")}
                  icon={User}
                  active={activeTab === "presenter"}
                  onClick={() => setActiveTab("presenter")}
                />
              )}
              {ctas.length > 0 && (
                <PanelTabButton
                  label={t("tabNotifications")}
                  icon={Bell}
                  active={activeTab === "notifications"}
                  onClick={() => setActiveTab("notifications")}
                  badge={activeCtas.length || undefined}
                />
              )}
            </div>
            <div className="min-h-0 flex-1">
              {/* Kept mounted (just hidden) instead of conditionally rendered --
                  unmounting on every tab switch discarded in-flight AI replies
                  and forced a DB round trip to restore messages that were
                  already sitting in local state. */}
              <div className={cn("h-full", activeTab !== "chat" && "hidden")}>
                <ChatPanel
                  accessToken={accessToken}
                  visitorName={visitorName}
                  simulatedMessages={chatMessages}
                  getElapsedSeconds={getElapsedSeconds}
                />
              </div>
              {activeTab === "connected" && (
                <ConnectedTab
                  viewerCount={viewerCount}
                  visitorName={visitorName}
                  presenterName={presenter?.display_name ?? null}
                  chatMessages={chatMessages}
                  seed={`${webinarId}:${sessionStart}`}
                  elapsedSeconds={elapsedSeconds}
                />
              )}
              {activeTab === "presenter" && presenter && <PresenterTab presenter={presenter} />}
              {activeTab === "notifications" && (
                <NotificationsTab
                  ctas={activeCtas}
                  onLinkClick={recordCtaClick}
                  onPollAnswer={recordPollResponse}
                  pollAnswers={pollAnswers}
                  pollResults={pollResults}
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
  const t = useTranslations("LiveRoom");
  return (
    <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-red-500" />
      </span>
      {t("live")}
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

// How often the filler names in the Conectados list churn -- long enough
// that it doesn't read as flickering, short enough that someone watching
// for a minute or two sees the list turn over instead of the exact same
// names sitting there for the whole session.
const NAME_ROTATION_INTERVAL_SECONDS = 40;

function ConnectedTab({
  viewerCount,
  visitorName,
  presenterName,
  chatMessages,
  seed,
  elapsedSeconds,
}: {
  viewerCount: number;
  visitorName: string;
  presenterName: string | null;
  chatMessages: ChatMessage[];
  seed: string;
  elapsedSeconds: number;
}) {
  const t = useTranslations("LiveRoom");
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
  const rotationBucket = Math.floor(Math.max(0, elapsedSeconds) / NAME_ROTATION_INTERVAL_SECONDS);
  const fillerNames = fakeConnectedNames({
    seed: `${seed}:${rotationBucket}`,
    count: fillerSlots,
    exclude: seen,
  });

  const shownCount = 1 + (showHost ? 1 : 0) + shownChatNames.length + fillerNames.length;
  const moreCount = Math.max(0, viewerCount - shownCount);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-4 text-center">
        <p className="text-3xl font-semibold text-primary">{viewerCount}</p>
        <p className="text-xs text-muted-foreground">{t("connectedNow")}</p>
      </div>
      <div className="flex flex-col gap-2">
        {showHost && (
          <div className="flex items-center gap-2 text-sm">
            <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate font-medium text-primary">
              {presenterName} {t("host")}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="truncate font-medium text-primary">
            {visitorName} {t("you")}
          </span>
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
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t("andMore", { count: moreCount })}
        </p>
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
  pollAnswers,
  pollResults,
}: {
  ctas: Cta[];
  onLinkClick: (ctaId: string) => void;
  onPollAnswer: (ctaId: string, option: string) => void;
  pollAnswers: Record<string, string>;
  pollResults: Record<string, { option: string; votes: number }[]>;
}) {
  const t = useTranslations("LiveRoom");
  if (ctas.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
        {t("notificationsEmpty")}
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
          answeredOption={pollAnswers[cta.id]}
          results={pollResults[cta.id]}
        />
      ))}
    </div>
  );
}

function NotificationCard({
  cta,
  onLinkClick,
  onPollAnswer,
  answeredOption,
  results,
}: {
  cta: Cta;
  onLinkClick: () => void;
  onPollAnswer: (option: string) => void;
  answeredOption?: string;
  results?: { option: string; votes: number }[];
}) {
  const t = useTranslations("LiveRoom");
  const config = (cta.config ?? {}) as Record<string, unknown>;

  if (cta.type === "poll") {
    const question = String(config.question ?? "");
    const options = Array.isArray(config.options) ? (config.options as string[]) : [];

    if (answeredOption) {
      return (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3">
          <p className="text-sm font-medium">📊 {question}</p>
          <PollResultBars
            options={options}
            results={results}
            chosenOption={answeredOption}
            variant="light"
          />
          <VotedNote variant="light" />
        </div>
      );
    }

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
        <span className="text-xs text-muted-foreground">{t("tapToSeeMore")}</span>
      </a>
    );
  }

  const text = config.text ? String(config.text) : null;
  const imageUrl = config.image_url ? String(config.image_url) : null;
  const linkUrl = config.url ? String(config.url) : null;
  const content = (
    <>
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
    </>
  );
  if (linkUrl) {
    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noreferrer"
        onClick={onLinkClick}
        className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3 hover:bg-muted"
      >
        {content}
      </a>
    );
  }
  return <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3">{content}</div>;
}

// A voter's own choice always shows even with 0 other votes so far, and
// options don't reshuffle by vote count after answering -- same order as
// the buttons they just saw, now with a % each.
function pollBars(
  configOptions: string[],
  results: { option: string; votes: number }[] | undefined
) {
  const byOption = new Map((results ?? []).map((r) => [r.option, r.votes]));
  const total = Array.from(byOption.values()).reduce((sum, v) => sum + v, 0);
  return configOptions.map((option) => {
    const votes = byOption.get(option) ?? 0;
    return { option, votes, pct: total > 0 ? Math.round((votes / total) * 100) : 0 };
  });
}

function PollResultBars({
  options,
  results,
  chosenOption,
  variant,
}: {
  options: string[];
  results: { option: string; votes: number }[] | undefined;
  chosenOption: string;
  variant: "dark" | "light";
}) {
  const bars = pollBars(options, results);
  return (
    <div className="flex flex-col gap-1.5">
      {bars.map((bar) => (
        <div
          key={bar.option}
          className={cn(
            "relative overflow-hidden rounded-md border px-3 py-1.5 text-sm",
            variant === "dark"
              ? bar.option === chosenOption
                ? "border-white/40"
                : "border-white/15"
              : bar.option === chosenOption
                ? "border-primary/40"
                : "border-border"
          )}
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0",
              variant === "dark" ? "bg-indigo-400/40" : "bg-indigo-500/15"
            )}
            style={{ width: `${bar.pct}%` }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <span>{bar.option}</span>
            <span
              className={cn(
                "font-mono text-xs",
                variant === "dark" ? "text-white/70" : "text-muted-foreground"
              )}
            >
              {bar.pct}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VotedNote({ variant }: { variant: "dark" | "light" }) {
  const t = useTranslations("LiveRoom");
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs",
        variant === "dark" ? "text-white/60" : "text-muted-foreground"
      )}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
        ✓
      </span>
      {t("alreadyVoted")}
    </p>
  );
}

// Wraps a link CTA in a continuously-sliding brand-gradient border to make
// it stand out against the video without stealing focus -- animation is a
// looping background-position slide (see .animate-cta-glow-border in
// globals.css), which degrades gracefully to a static gradient ring under
// prefers-reduced-motion.
//
// Literal hex, not var(--brand)/var(--brand-2): those tokens are scoped to
// .marketing-theme (see globals.css) and the live room doesn't wrap in it --
// using the var() here silently resolved to nothing, rendering the whole
// button transparent.
function GlowCtaBorder({
  className,
  rounded = "md",
  children,
}: {
  className?: string;
  rounded?: "md" | "full";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "animate-cta-glow-border p-[3px] shadow-lg",
        rounded === "full" ? "rounded-full" : "rounded-md",
        className
      )}
      style={{
        backgroundImage: "linear-gradient(90deg, #4f46e5, #a78bfa, #e879f9, #4f46e5, #a78bfa, #e879f9)",
        backgroundSize: "300% 100%",
      }}
    >
      {children}
    </div>
  );
}

function CtaOverlay({
  cta,
  onLinkClick,
  onPollAnswer,
  answeredOption,
  results,
  getElapsedSeconds,
}: {
  cta: Cta;
  onLinkClick: () => void;
  onPollAnswer: (option: string) => void;
  answeredOption?: string;
  results?: { option: string; votes: number }[];
  getElapsedSeconds: () => number;
}) {
  const config = (cta.config ?? {}) as Record<string, unknown>;
  const t = useTranslations("LiveRoom");
  const scarcityMinutes =
    cta.type === "link" && typeof config.scarcity_minutes === "number" && config.scarcity_minutes > 0
      ? config.scarcity_minutes
      : null;

  // Server-anchored deadline, not a client-side timer that resets on
  // refresh: the moment this CTA first appeared for this registrant is
  // derived from their already-synced elapsed video time (the same anchor
  // driving playback sync), so reloading the page recomputes the same real
  // deadline instead of restarting the countdown. Date.now() reads happen
  // inside the effect/interval below (not during render) to keep the
  // component pure. Called unconditionally (not behind the
  // `if (cta.type === "link")` below) so hook order stays stable.
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (scarcityMinutes === null) return;
    const interval = setInterval(() => {
      const appearedAtMs = Date.now() - (getElapsedSeconds() - cta.timestamp_start_seconds) * 1000;
      const deadlineMs = appearedAtMs + scarcityMinutes * 60_000;
      setRemainingSeconds(Math.max(0, Math.round((deadlineMs - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [scarcityMinutes, getElapsedSeconds, cta.timestamp_start_seconds]);

  if (cta.type === "link") {
    const style = String(config.style ?? "banner");
    const text = String(config.text ?? "");
    const url = String(config.url ?? "#");
    const isClosed = remainingSeconds === 0;
    const isPill = style === "fixed_button";
    const isBanner = style === "banner";

    const button = isClosed ? (
      <span
        className={cn(
          "block cursor-not-allowed bg-black/70 px-5 py-3 text-center text-sm font-medium text-white shadow-lg",
          isPill ? "rounded-full" : "rounded-md",
          isBanner && "w-full"
        )}
      >
        {t("scarcityClosed")}
      </span>
    ) : (
      <GlowCtaBorder rounded={isPill ? "full" : "md"} className={isBanner ? "w-full" : undefined}>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          onClick={onLinkClick}
          className={cn(
            "block text-center text-sm font-medium text-white",
            isPill ? "rounded-full px-5 py-2.5" : "rounded-[5px] px-5 py-3"
          )}
          style={{ background: "linear-gradient(90deg, #4f46e5, #c026d3)" }}
        >
          {text}
        </a>
      </GlowCtaBorder>
    );

    const countdown = remainingSeconds !== null && remainingSeconds > 0 && (
      <span className="rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white">
        {t("scarcityClosesIn", { time: secondsToClock(remainingSeconds) })}
      </span>
    );

    // Three visibly distinct treatments sharing the same glow line: a wide
    // bar along the bottom edge (banner), a centered card with a dimmed
    // backdrop that reads as an interruption (popup), and a compact
    // floating pill anchored to a corner (fixed_button) -- previously all
    // three only differed by position, with identical shrink-wrapped
    // buttons, so "popup" and "fixed_button" looked like the same banner
    // just moved around.
    if (style === "popup") {
      return (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-black/40" />
          <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
            {button}
            {countdown}
          </div>
        </>
      );
    }

    if (style === "fixed_button") {
      return (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-1.5">
          {button}
          {countdown}
        </div>
      );
    }

    return (
      <div className="absolute inset-x-4 bottom-4 z-10 flex flex-col items-center gap-1.5">
        {button}
        {countdown}
      </div>
    );
  }

  if (cta.type === "overlay") {
    const text = config.text ? String(config.text) : null;
    const imageUrl = config.image_url ? String(config.image_url) : null;
    const linkUrl = config.url ? String(config.url) : null;
    const cardClass =
      "absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 rounded-md bg-black/80 p-4 text-white shadow-lg";
    const content = (
      <>
        {imageUrl && (
          <Image src={imageUrl} alt="" width={240} height={120} className="max-h-32 w-auto object-contain" unoptimized />
        )}
        {text && <p className="text-sm">{text}</p>}
      </>
    );
    if (linkUrl) {
      return (
        <a
          href={linkUrl}
          target="_blank"
          rel="noreferrer"
          onClick={onLinkClick}
          className={cn(cardClass, "cursor-pointer transition-opacity hover:opacity-90")}
        >
          {content}
        </a>
      );
    }
    return <div className={cardClass}>{content}</div>;
  }

  if (cta.type === "poll") {
    const question = String(config.question ?? "");
    const options = Array.isArray(config.options) ? (config.options as string[]) : [];

    if (answeredOption) {
      return (
        <div className="absolute bottom-16 left-1/2 z-10 flex w-80 -translate-x-1/2 flex-col gap-2 rounded-md bg-black/85 p-4 text-white shadow-lg">
          <p className="text-sm font-medium">📊 {question}</p>
          <PollResultBars
            options={options}
            results={results}
            chosenOption={answeredOption}
            variant="dark"
          />
          <VotedNote variant="dark" />
        </div>
      );
    }

    return (
      <div className="absolute bottom-16 left-1/2 z-10 flex w-80 -translate-x-1/2 flex-col gap-2 rounded-md bg-black/85 p-4 text-white shadow-lg">
        <p className="text-sm font-medium">📊 {question}</p>
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
  const t = useTranslations("LiveRoom");
  const linkCtas = ctas.filter((c) => c.type === "link");

  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center text-white">
      <p className="text-xl font-semibold">{t("thanksForJoining", { title: webinarTitle })}</p>
      <p className="text-sm text-white/70">{t("webinarEnded")}</p>
      {linkCtas.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {linkCtas.map((cta) => {
            const config = (cta.config ?? {}) as Record<string, unknown>;
            return (
              <GlowCtaBorder key={cta.id}>
                <a
                  href={String(config.url ?? "#")}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onCtaClick(cta.id)}
                  className="block rounded-[5px] px-5 py-3 text-sm font-medium text-white"
                  style={{ background: "linear-gradient(90deg, #4f46e5, #c026d3)" }}
                >
                  {String(config.text ?? t("seeMore"))}
                </a>
              </GlowCtaBorder>
            );
          })}
        </div>
      )}
    </div>
  );
}
