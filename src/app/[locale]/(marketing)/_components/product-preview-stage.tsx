"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Users } from "lucide-react";

import { cn } from "@/lib/utils";

// Viewer count ticks up and a new chat message slides in every few seconds
// -- both purely decorative (there's no real webinar behind this mockup),
// so both are skipped for prefers-reduced-motion instead of ticking numbers
// and text underneath someone who asked for less motion.
const VIEWER_TICK_INTERVAL_MS = 3200;
const VIEWER_TICK_MAX_STEP = 4;
const MESSAGE_ROTATE_INTERVAL_MS = 3600;
const VISIBLE_MESSAGES = 3;

type ChatMsg = { name: string; text: string };

export function ProductPreviewStage({
  urlBar,
  live,
  chatLabel,
  offer,
  chatMessages,
}: {
  urlBar: string;
  live: string;
  chatLabel: string;
  offer: string;
  chatMessages: ChatMsg[];
}) {
  const [viewers, setViewers] = useState(312);
  const [visible, setVisible] = useState<(ChatMsg & { key: number })[]>(() =>
    chatMessages.map((m, i) => ({ ...m, key: i }))
  );
  const [latestKey, setLatestKey] = useState<number | null>(null);
  const nextIndexRef = useRef(0);
  const nextKeyRef = useRef(chatMessages.length);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const viewerTimer = setInterval(() => {
      setViewers((v) => v + 1 + Math.floor(Math.random() * VIEWER_TICK_MAX_STEP));
    }, VIEWER_TICK_INTERVAL_MS);

    const messageTimer = setInterval(() => {
      const next = chatMessages[nextIndexRef.current % chatMessages.length];
      nextIndexRef.current += 1;
      const key = nextKeyRef.current++;
      setLatestKey(key);
      setVisible((prev) => [...prev.slice(-(VISIBLE_MESSAGES - 1)), { ...next, key }]);
    }, MESSAGE_ROTATE_INTERVAL_MS);

    return () => {
      clearInterval(viewerTimer);
      clearInterval(messageTimer);
    };
  }, [chatMessages]);

  return (
    <div className="relative mx-auto w-full max-w-3xl rounded-xl border bg-card shadow-2xl shadow-[var(--brand)]/10">
      <div className="flex items-center gap-1.5 border-b px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-yellow-400" />
        <span className="size-2.5 rounded-full bg-green-400" />
        <span className="ml-3 truncate text-xs text-muted-foreground">{urlBar}</span>
      </div>

      <div className="flex flex-col sm:flex-row">
        {/* Perspective orb-blur "video" -- no play button or scrub bar,
            since this represents a Live, not a recording. */}
        <div className="relative flex flex-1 flex-col justify-end overflow-hidden bg-gradient-to-br from-[#0d0a1a] to-[#06040c] p-6 sm:aspect-video sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="animate-marketing-blob absolute -left-10 -top-16 size-64 rounded-full bg-[var(--brand)] opacity-50 blur-[34px]" />
            <div
              className="animate-marketing-blob absolute -bottom-14 -right-8 size-52 rounded-full bg-[var(--brand-2)] opacity-40 blur-[30px]"
              style={{ animationDelay: "-6s" }}
            />
            <div
              className="animate-marketing-blob absolute right-[18%] top-[30%] size-36 rounded-full bg-[#8b7bf0] opacity-45 blur-[22px]"
              style={{ animationDelay: "-11s" }}
            />
            <div className="absolute inset-0 [background:radial-gradient(120%_100%_at_50%_40%,transparent_40%,rgba(0,0,0,.45)_100%)]" />
          </div>

          <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
            {live}
          </div>
          <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs tabular-nums text-white backdrop-blur">
            <Users className="size-3" />
            {viewers}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 overflow-hidden border-t p-4 sm:w-56 sm:border-t-0 sm:border-l">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageCircle className="size-3.5" />
            {chatLabel}
          </div>
          {visible.map((m) => (
            <div key={m.key} className={cn("text-xs", m.key === latestKey && "animate-fade-up")}>
              <span className="font-medium" style={{ color: "var(--brand)" }}>
                {m.name}
              </span>{" "}
              <span className="text-muted-foreground">{m.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="absolute -bottom-4 left-6 rounded-full px-4 py-2 text-xs font-medium text-white shadow-lg sm:left-8"
        style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
      >
        {offer}
      </div>
    </div>
  );
}
