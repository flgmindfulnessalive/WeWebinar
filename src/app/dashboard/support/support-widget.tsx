"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { escalateSupportQuestion } from "@/lib/actions/support";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type AskStatus = "idle" | "pending" | "answered" | "no_answer" | "error";

export function SupportWidget() {
  const t = useTranslations("SupportWidget");
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<AskStatus>("idle");
  const [answer, setAnswer] = useState<string | null>(null);
  const [escalateState, escalateAction, isEscalating] = useActionState(
    escalateSupportQuestion,
    null
  );

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setStatus("pending");
    setAnswer(null);
    try {
      const res = await fetch("/api/support/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = await res.json();
      if (data.answer) {
        setAnswer(data.answer);
        setStatus("answered");
      } else {
        setStatus("no_answer");
      }
    } catch {
      setStatus("error");
    }
  }

  const showEscalate = status === "answered" || status === "no_answer" || status === "error";
  const escalated = escalateState && "success" in escalateState;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAsk} className="flex flex-col gap-2">
        <Label htmlFor="support-question">{t("questionLabel")}</Label>
        <textarea
          id="support-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("questionPlaceholder")}
          rows={3}
          maxLength={800}
          className="flex w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <Button type="submit" disabled={status === "pending" || !question.trim()} className="w-fit">
          {status === "pending" ? t("asking") : t("ask")}
        </Button>
      </form>

      {status === "answered" && answer && (
        <div className="rounded-lg border bg-accent p-4 text-sm">{answer}</div>
      )}
      {status === "no_answer" && (
        <p className="text-sm text-muted-foreground">{t("noAnswer")}</p>
      )}
      {status === "error" && <p className="text-sm text-destructive">{t("askFailed")}</p>}

      {showEscalate && !escalated && (
        <form action={escalateAction} className="flex flex-col gap-2 border-t pt-4">
          <input type="hidden" name="question" value={question} />
          <input type="hidden" name="ai_answer" value={answer ?? ""} />
          <p className="text-sm text-muted-foreground">{t("escalatePrompt")}</p>
          <Button type="submit" variant="outline" disabled={isEscalating} className="w-fit">
            {isEscalating ? t("escalating") : t("escalate")}
          </Button>
          {escalateState && "error" in escalateState && (
            <p className="text-sm text-destructive">{escalateState.error}</p>
          )}
        </form>
      )}

      {escalated && (
        <p className="border-t pt-4 text-sm text-muted-foreground">{t("escalated")}</p>
      )}
    </div>
  );
}
