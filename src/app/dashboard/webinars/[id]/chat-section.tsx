"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  addChatMessage,
  removeChatMessage,
  updateAiChatEnabled,
  updateAiChatUseEmojis,
  updateAiTrainingInfo,
} from "@/lib/actions/chat";
import { secondsToClock } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatMessageType } from "@/lib/supabase/database.types";

type ChatMessage = {
  id: string;
  timestamp_seconds: number;
  fake_name: string;
  message_text: string;
  message_type: ChatMessageType;
};

const TYPE_KEY: Record<ChatMessageType, "typeMessage" | "typeQuestion" | "typeHostReply"> = {
  message: "typeMessage",
  question: "typeQuestion",
  host_reply: "typeHostReply",
};

const PREVIEW_SPEED = 12; // 12x: a 10-minute timeline previews in ~50s

export function ChatSection({
  webinarId,
  messages,
  aiChatEnabled,
  aiChatAllowed,
  aiChatUseEmojis,
  aiTrainingInfo,
}: {
  webinarId: string;
  messages: ChatMessage[];
  aiChatEnabled: boolean;
  aiChatAllowed: boolean;
  aiChatUseEmojis: boolean;
  aiTrainingInfo: string | null;
}) {
  const t = useTranslations("ChatSection");
  const tCommon = useTranslations("SettingsCommon");
  const [state, formAction, isPending] = useActionState(addChatMessage, null);
  const [trainingState, trainingFormAction, isTrainingPending] = useActionState(
    updateAiTrainingInfo,
    null
  );
  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(aiChatEnabled);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPending, startAiTransition] = useTransition();
  const [useEmojis, setUseEmojis] = useState(aiChatUseEmojis);
  const [emojisPending, startEmojisTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying) return;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = ((Date.now() - startedAt) / 1000) * PREVIEW_SPEED;
      const count = messages.filter((m) => m.timestamp_seconds <= elapsed).length;
      setVisibleCount(count);
      if (count >= messages.length) {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">{t("aiAgentTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("aiAgentDescription")}</p>
            {!aiChatAllowed && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                {t.rich("aiAgentPlanHint", {
                  a: (chunks) => (
                    <Link href="/dashboard/settings/billing" className="underline underline-offset-2">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            )}
          </div>
          <label
            className={cn(
              "inline-flex shrink-0 items-center gap-2 text-sm",
              aiChatAllowed ? "cursor-pointer" : "cursor-not-allowed opacity-60"
            )}
          >
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={aiEnabled}
              disabled={aiPending || !aiChatAllowed}
              onChange={(e) => {
                if (!aiChatAllowed) return;
                const next = e.target.checked;
                setAiEnabled(next);
                setAiError(null);
                startAiTransition(async () => {
                  const result = await updateAiChatEnabled(webinarId, next);
                  if (result?.error) {
                    setAiEnabled(!next);
                    setAiError(result.error);
                  }
                });
              }}
            />
            {aiEnabled ? t("enabled") : t("disabled")}
          </label>
        </div>
        {aiError && <p className="text-sm text-destructive">{aiError}</p>}

        {aiEnabled && aiChatAllowed && (
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-sm">
            <span className="flex flex-col">
              <span className="font-medium">{t("useEmojisLabel")}</span>
              <span className="text-xs text-muted-foreground">{t("useEmojisHint")}</span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0"
              checked={useEmojis}
              disabled={emojisPending}
              onChange={(e) => {
                const next = e.target.checked;
                setUseEmojis(next);
                startEmojisTransition(async () => {
                  const result = await updateAiChatUseEmojis(webinarId, next);
                  if (result?.error) setUseEmojis(!next);
                });
              }}
            />
          </label>
        )}

        {aiEnabled && aiChatAllowed && (
          <form action={trainingFormAction} className="flex flex-col gap-1.5 rounded-md border p-3">
            <input type="hidden" name="webinar_id" value={webinarId} />
            <Label htmlFor="ai_agent_training_info">{t("trainAgentLabel")}</Label>
            <p className="text-xs text-muted-foreground">{t("trainAgentHint")}</p>
            <textarea
              id="ai_agent_training_info"
              name="ai_agent_training_info"
              rows={5}
              defaultValue={aiTrainingInfo ?? ""}
              placeholder={t("trainAgentPlaceholder")}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={isTrainingPending}>
                {isTrainingPending ? tCommon("saving") : t("save")}
              </Button>
              {trainingState?.error && (
                <p className="text-sm text-destructive">{trainingState.error}</p>
              )}
            </div>
          </form>
        )}

        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="webinar_id" value={webinarId} />
          <div className="grid gap-1.5">
            <Label htmlFor="timestamp">{t("timestampLabel")}</Label>
            <Input
              id="timestamp"
              name="timestamp"
              placeholder="2:30"
              required
              className="w-24"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fake_name">{t("nameLabel")}</Label>
            <Input id="fake_name" name="fake_name" required className="w-32" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="message_type">{t("typeLabel")}</Label>
            <select
              id="message_type"
              name="message_type"
              defaultValue="message"
              className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="message">{t("typeMessage")}</option>
              <option value="question">{t("typeQuestion")}</option>
              <option value="host_reply">{t("typeHostReply")}</option>
            </select>
          </div>
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="message_text">{t("textLabel")}</Label>
            <Input id="message_text" name="message_text" required />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("adding") : t("add")}
          </Button>
        </form>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="flex flex-col divide-y rounded-md border">
          {messages.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">{t("noMessages")}</p>
          )}
          {messages.map((message) => (
            <ChatMessageRow key={message.id} message={message} webinarId={webinarId} />
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-80">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("previewLabel")}</p>
          <Button
            size="sm"
            variant="outline"
            disabled={messages.length === 0}
            onClick={() => {
              setVisibleCount(0);
              setIsPlaying(true);
            }}
          >
            {isPlaying ? t("playing") : t("play")}
          </Button>
        </div>
        <div
          ref={listRef}
          className="flex h-72 flex-col gap-2 overflow-y-auto rounded-md border bg-muted/20 p-3"
        >
          {messages.slice(0, visibleCount).map((message) => (
            <div key={message.id} className="text-xs">
              <span className="font-medium">{message.fake_name}</span>{" "}
              <span className="text-muted-foreground">
                {secondsToClock(message.timestamp_seconds)}
              </span>
              <p
                className={cn(
                  message.message_type === "host_reply" && "font-medium text-primary"
                )}
              >
                {message.message_text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatMessageRow({
  message,
  webinarId,
}: {
  message: ChatMessage;
  webinarId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("ChatSection");

  return (
    <div className="flex items-center justify-between gap-3 p-3 text-sm">
      <div className="flex flex-1 items-center gap-3">
        <span className="w-12 shrink-0 text-xs text-muted-foreground">
          {secondsToClock(message.timestamp_seconds)}
        </span>
        <Badge variant="secondary">{t(TYPE_KEY[message.message_type])}</Badge>
        <span className="font-medium">{message.fake_name}:</span>
        <span className="truncate text-muted-foreground">{message.message_text}</span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await removeChatMessage(message.id, webinarId);
          })
        }
      >
        {t("remove")}
      </Button>
    </div>
  );
}
