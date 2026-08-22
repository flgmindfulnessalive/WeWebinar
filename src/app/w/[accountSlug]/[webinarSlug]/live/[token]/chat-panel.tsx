"use client";

import { useEffect, useRef, useState } from "react";

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
  kind: "simulated-message" | "simulated-question" | "simulated-host" | "own";
};

export function ChatPanel({
  accessToken,
  visitorName,
  simulatedMessages,
  getElapsedSeconds,
  onClose,
}: {
  accessToken: string;
  visitorName: string;
  simulatedMessages: SimulatedMessage[];
  getElapsedSeconds: () => number;
  onClose?: () => void;
}) {
  const [visibleSimulated, setVisibleSimulated] = useState<DisplayMessage[]>([]);
  const [ownMessages, setOwnMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const shownIdsRef = useRef(new Set<string>());

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

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
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
    }
    setSending(false);
  }

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-sm font-medium">Chat en vivo</p>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Ocultar
          </Button>
        )}
      </div>
      <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {combined.map((m) => (
          <div key={m.id} className="text-sm">
            <span
              className={cn(
                "font-medium",
                m.kind === "simulated-host" && "text-primary",
                m.kind === "own" && "text-primary"
              )}
            >
              {m.name}
              {m.kind === "own" && " (vos)"}:
            </span>{" "}
            <span className="text-muted-foreground">{m.text}</span>
          </div>
        ))}
      </div>
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
          placeholder="Escribí un mensaje..."
          disabled={sending}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !draft.trim()}>
          Enviar
        </Button>
      </div>
    </div>
  );
}
