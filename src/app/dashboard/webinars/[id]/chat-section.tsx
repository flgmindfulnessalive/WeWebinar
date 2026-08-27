"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import {
  addChatMessage,
  removeChatMessage,
  updateAiChatEnabled,
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

const TYPE_LABEL: Record<ChatMessageType, string> = {
  message: "Mensaje",
  question: "Pregunta",
  host_reply: "Respuesta del host",
};

const PREVIEW_SPEED = 12; // 12x: a 10-minute timeline previews in ~50s

export function ChatSection({
  webinarId,
  messages,
  aiChatEnabled,
  aiChatAllowed,
  aiTrainingInfo,
}: {
  webinarId: string;
  messages: ChatMessage[];
  aiChatEnabled: boolean;
  aiChatAllowed: boolean;
  aiTrainingInfo: string | null;
}) {
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
            <p className="text-sm font-medium">Agente AI de respuestas</p>
            <p className="text-xs text-muted-foreground">
              Cuando un asistente real escribe una pregunta en el chat en vivo, un agente AI le
              responde automáticamente.
            </p>
            {!aiChatAllowed && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                Disponible en los planes Pro y Business —{" "}
                <a href="/dashboard/settings/billing" className="underline underline-offset-2">
                  actualizar plan
                </a>
                .
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
            {aiEnabled ? "Activado" : "Desactivado"}
          </label>
        </div>
        {aiError && <p className="text-sm text-destructive">{aiError}</p>}

        {aiEnabled && aiChatAllowed && (
          <form action={trainingFormAction} className="flex flex-col gap-1.5 rounded-md border p-3">
            <input type="hidden" name="webinar_id" value={webinarId} />
            <Label htmlFor="ai_agent_training_info">Entrena a tu agente AI</Label>
            <p className="text-xs text-muted-foreground">
              Información adicional para que el agente responda mejor: preguntas frecuentes,
              precios, detalles del producto o servicio, políticas, etc.
            </p>
            <textarea
              id="ai_agent_training_info"
              name="ai_agent_training_info"
              rows={5}
              defaultValue={aiTrainingInfo ?? ""}
              placeholder={
                'Ej: "El plan Pro cuesta $49/mes. Incluye soporte prioritario. La garantía es de 30 días..."'
              }
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={isTrainingPending}>
                {isTrainingPending ? "Guardando..." : "Guardar"}
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
            <Label htmlFor="timestamp">Minuto (mm:ss)</Label>
            <Input
              id="timestamp"
              name="timestamp"
              placeholder="2:30"
              required
              className="w-24"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fake_name">Nombre</Label>
            <Input id="fake_name" name="fake_name" required className="w-32" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="message_type">Tipo</Label>
            <select
              id="message_type"
              name="message_type"
              defaultValue="message"
              className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="message">Mensaje</option>
              <option value="question">Pregunta</option>
              <option value="host_reply">Respuesta del host</option>
            </select>
          </div>
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="message_text">Texto</Label>
            <Input id="message_text" name="message_text" required />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Agregando..." : "Agregar"}
          </Button>
        </form>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="flex flex-col divide-y rounded-md border">
          {messages.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Todavía no agregaste mensajes.
            </p>
          )}
          {messages.map((message) => (
            <ChatMessageRow key={message.id} message={message} webinarId={webinarId} />
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-80">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Vista previa</p>
          <Button
            size="sm"
            variant="outline"
            disabled={messages.length === 0}
            onClick={() => {
              setVisibleCount(0);
              setIsPlaying(true);
            }}
          >
            {isPlaying ? "Reproduciendo..." : "Reproducir (12x)"}
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

  return (
    <div className="flex items-center justify-between gap-3 p-3 text-sm">
      <div className="flex flex-1 items-center gap-3">
        <span className="w-12 shrink-0 text-xs text-muted-foreground">
          {secondsToClock(message.timestamp_seconds)}
        </span>
        <Badge variant="secondary">{TYPE_LABEL[message.message_type]}</Badge>
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
        Quitar
      </Button>
    </div>
  );
}
