"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatMessageType } from "@/lib/supabase/database.types";

type SimulatedMessage = {
  id: string;
  timestamp_seconds: number;
  fake_name: string;
  message_text: string;
  message_type: ChatMessageType;
};

type DisplayMessage = {
  id: string;
  name: string;
  text: string;
  timestampSeconds: number;
  kind: "simulated-message" | "simulated-question" | "simulated-host" | "own" | "ai-reply";
};

// A reply -- or even the "está escribiendo" indicator -- appearing the
// instant a message is sent doesn't read as a real person answering. Split
// the round trip into a silent "noticed the message" pause, then a visible
// "typing" pause before the reply lands, both randomized and independent
// of how fast the API actually responds.
const THINKING_DELAY_MIN_MS = 2000;
const THINKING_DELAY_MAX_MS = 5000;
const TYPING_DELAY_MIN_MS = 3000;
const TYPING_DELAY_MAX_MS = 6000;

function randomDelay(minMs: number, maxMs: number) {
  return minMs + Math.random() * (maxMs - minMs);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ChatPanel({
  accessToken,
  visitorName,
  simulatedMessages,
  getElapsedSeconds,
}: {
  accessToken: string;
  visitorName: string;
  simulatedMessages: SimulatedMessage[];
  getElapsedSeconds: () => number;
}) {
  const [visibleSimulated, setVisibleSimulated] = useState<DisplayMessage[]>([]);
  const [ownMessages, setOwnMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const shownIdsRef = useRef(new Set<string>());
  const t = useTranslations("ChatPanel");
  // Shown as the sender of every AI-generated reply, instead of a real
  // person's name -- the reply isn't from any specific staff member.
  const aiReplyName = t("moderatorTeam");

  // Real messages only ever lived in this component's state, so a page
  // refresh during the live webinar silently dropped them (and any AI
  // reply already recorded). Restore them from the DB on mount.
  useEffect(() => {
    let cancelled = false;
    async function loadOwnMessages() {
      const supabase = createClient();
      const { data } = await supabase.rpc("get_registrant_messages", {
        p_access_token: accessToken,
      });
      if (cancelled || !data) return;

      const restored: DisplayMessage[] = [];
      for (const row of data) {
        restored.push({
          id: row.id,
          name: visitorName,
          text: row.message_text,
          timestampSeconds: row.video_timestamp_seconds,
          kind: "own",
        });
        if (row.ai_reply_text) {
          restored.push({
            id: `${row.id}-ai-reply`,
            name: aiReplyName,
            text: row.ai_reply_text,
            timestampSeconds: row.video_timestamp_seconds,
            kind: "ai-reply",
          });
        }
      }
      // Merge rather than overwrite -- if the visitor sent a new message
      // before this fetch resolved, it's already in state and must survive.
      setOwnMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        return [...prev, ...restored.filter((m) => !existingIds.has(m.id))];
      });
    }
    loadOwnMessages();
    return () => {
      cancelled = true;
    };
  }, [accessToken, visitorName, aiReplyName]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = getElapsedSeconds();
      const due = simulatedMessages.filter(
        (m) => m.timestamp_seconds <= elapsed && !shownIdsRef.current.has(m.id)
      );
      if (due.length === 0) return;

      for (const m of due) shownIdsRef.current.add(m.id);
      setVisibleSimulated((prev) => [
        ...prev,
        ...due.map((m) => ({
          id: m.id,
          name: m.fake_name,
          text: m.message_text,
          timestampSeconds: m.timestamp_seconds,
          kind:
            m.message_type === "host_reply"
              ? ("simulated-host" as const)
              : m.message_type === "question"
                ? ("simulated-question" as const)
                : ("simulated-message" as const),
        })),
      ]);
    }, 1000);
    return () => clearInterval(interval);
  }, [simulatedMessages, getElapsedSeconds]);

  const combined = [...visibleSimulated, ...ownMessages].sort(
    (a, b) => a.timestampSeconds - b.timestampSeconds
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [combined.length]);

  async function requestAiReply(messageId: string, messageText: string) {
    const fetchPromise = fetch("/api/chat/ai-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        message_id: messageId,
        message_text: messageText,
      }),
    })
      .then((res) => res.json())
      .catch(() => null);

    // Silent pause before anything shows -- as if the reply hasn't been
    // noticed yet. The actual API call runs in the background meanwhile.
    await wait(randomDelay(THINKING_DELAY_MIN_MS, THINKING_DELAY_MAX_MS));

    const json = await fetchPromise;
    const reply = typeof json?.reply === "string" ? json.reply : null;
    if (!reply) return;

    setAiPending(true);
    await wait(randomDelay(TYPING_DELAY_MIN_MS, TYPING_DELAY_MAX_MS));
    setAiPending(false);

    setOwnMessages((prev) => [
      ...prev,
      {
        id: `${messageId}-ai-reply`,
        name: aiReplyName,
        text: reply,
        timestampSeconds: Math.round(getElapsedSeconds()),
        kind: "ai-reply",
      },
    ]);
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    setDraft("");

    const elapsed = Math.round(getElapsedSeconds());
    const supabase = createClient();
    const { data, error } = await supabase.rpc("post_registrant_message", {
      p_access_token: accessToken,
      p_message_text: text,
      p_video_timestamp_seconds: elapsed,
    });

    if (!error && data) {
      setOwnMessages((prev) => [
        ...prev,
        {
          id: data.id,
          name: visitorName,
          text: data.message_text,
          timestampSeconds: data.video_timestamp_seconds,
          kind: "own",
        },
      ]);
      setSending(false);
      requestAiReply(data.id, data.message_text);
      return;
    }

    // Restore the draft instead of silently dropping it -- e.g. the RPC's
    // per-registrant rate limit or max length check rejected it.
    setDraft(text);
    setSendError(
      error?.message.includes("rate_limited") ? t("rateLimited") : t("sendFailed")
    );
    setSending(false);
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {combined.map((m) => (
          <div key={m.id} className="text-sm">
            <span
              className={cn(
                "font-medium",
                (m.kind === "simulated-host" || m.kind === "ai-reply") && "text-primary",
                m.kind === "own" && "text-primary"
              )}
            >
              {m.name}
              {m.kind === "own" && ` ${t("you")}`}:
            </span>{" "}
            <span className="text-muted-foreground">{m.text}</span>
          </div>
        ))}
        {aiPending && (
          <div className="text-sm text-muted-foreground italic">
            {t("typing", { name: aiReplyName })}
          </div>
        )}
      </div>
      {sendError && (
        <p className="border-t px-3 pt-2 text-xs text-destructive">{sendError}</p>
      )}
      <div className="flex items-center gap-2 border-t p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={t("placeholder")}
          maxLength={2000}
          disabled={sending}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !draft.trim()}>
          {t("send")}
        </Button>
      </div>
    </div>
  );
}
