"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WeweMascot } from "@/components/wewe/wewe-mascot";

// Mirrors the API route's own MAX_QUESTION_LENGTH -- just caps the textarea
// so a paste can't silently get truncated server-side with no feedback.
const MAX_QUESTION_LENGTH = 800;

// The little "I'm here" speech bubble only makes sense while the widget is
// minimized -- it disappears the moment the real chat opens (see the effect
// below, gated on `open`). Times are deliberately spaced far apart: a nudge
// that reappears too often reads as nagging, not "always on".
const NUDGE_FIRST_DELAY_MS = 8_000;
const NUDGE_VISIBLE_MS = 4_500;
const NUDGE_INTERVAL_MS = 50_000;

type ChatMessage = { role: "bot" | "user"; text: string };

// Floating replacement for the old dedicated /dashboard/support page --
// minimized as a bubble by default, available on every dashboard screen
// (mounted once in layout.tsx), same AI endpoint and daily cap as before.
// The human-escalation path (escalateSupportQuestion) is deliberately not
// wired in here yet -- turned off for this first pass, not removed; see
// lib/actions/support.ts, still intact for when it comes back.
export function SupportChatWidget() {
  const t = useTranslations("SupportChat");
  const [open, setOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { role: "bot", text: t("greeting") },
  ]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    if (open) return;
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    function scheduleShow(delay: number) {
      showTimer = setTimeout(() => {
        setShowNudge(true);
        hideTimer = setTimeout(() => {
          setShowNudge(false);
          scheduleShow(NUDGE_INTERVAL_MS);
        }, NUDGE_VISIBLE_MS);
      }, delay);
    }
    scheduleShow(NUDGE_FIRST_DELAY_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      setShowNudge(false);
    };
  }, [open]);

  function openChat() {
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || pending) return;

    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setQuestion("");
    setPending(true);

    try {
      const res = await fetch("/api/support/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      if (res.status === 429) {
        setMessages((m) => [...m, { role: "bot", text: t("rateLimited") }]);
        return;
      }
      if (!res.ok) {
        setMessages((m) => [...m, { role: "bot", text: t("askFailed") }]);
        return;
      }
      const data = await res.json();
      setMessages((m) => [...m, { role: "bot", text: data.answer ?? t("noAnswer") }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: t("askFailed") }]);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <>
        {showNudge && (
          <div className="fixed right-[84px] bottom-8 z-50 animate-in fade-in slide-in-from-bottom-2 rounded-2xl border bg-card px-3.5 py-2 text-sm font-medium whitespace-nowrap text-foreground shadow-lg duration-300">
            {t("nudgeText")}
          </div>
        )}
        <button
          type="button"
          onClick={openChat}
          aria-label={t("openAria")}
          className="fixed right-5 bottom-5 z-50 flex size-14 items-center justify-center rounded-full border bg-muted p-2 shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <WeweMascot className="size-full" />
          <span className="absolute top-0.5 right-0.5 size-3 rounded-full border-2 border-muted bg-emerald-500" />
        </button>
      </>
    );
  }

  return (
    <div className="fixed right-5 bottom-5 z-50 flex h-[min(520px,calc(100vh-40px))] w-[min(340px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
      <div className="flex items-center gap-2.5 border-b bg-muted/40 px-3.5 py-3">
        <WeweMascot className="size-8 shrink-0" idle={false} />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-semibold">{t("panelTitle")}</span>
          <span className="text-xs text-muted-foreground">{t("panelSubtitle")}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("minimizeAria")}
          className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      <div ref={bodyRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3.5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex max-w-[85%] gap-2",
              m.role === "user" ? "flex-row-reverse self-end" : "self-start"
            )}
          >
            {m.role === "bot" && <WeweMascot className="size-5 shrink-0" idle={false} />}
            <div
              className={cn(
                "rounded-lg px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-muted"
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex max-w-[85%] gap-2 self-start">
            <WeweMascot className="size-5 shrink-0" idle={false} />
            <div className="flex items-center gap-1 rounded-lg rounded-bl-sm bg-muted px-3 py-2.5">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t p-2.5">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={t("inputPlaceholder")}
          rows={1}
          maxLength={MAX_QUESTION_LENGTH}
          className="max-h-20 flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <Button type="submit" size="icon" disabled={pending || !question.trim()} className="shrink-0">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
