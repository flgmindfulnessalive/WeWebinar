"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CHATGPT_NEW_CHAT_URL } from "@/lib/script-builder/config";
import { trackScriptBuilderEvent } from "@/lib/script-builder/track";
import { WeWebinarsCta } from "./wewebinars-cta";

export function PromptResult({
  projectId,
  prompt,
  signupUrl,
  onCtaClick,
  onEditAnswers,
  onRestart,
}: {
  projectId: string;
  prompt: string;
  signupUrl: string;
  onCtaClick: () => void;
  onEditAnswers: () => void;
  onRestart: () => void;
}) {
  const t = useTranslations("ScriptBuilder.result");
  const [copied, setCopied] = useState(false);
  const viewTracked = useRef(false);

  // "script_prompt_generated" se dispara desde script-builder-app.tsx, no
  // acá -- solo en el momento real de generar/regenerar (lead submit o
  // "generar" desde review), nunca en cada vez que se re-monta esta
  // pantalla (un resume de localStorage no debe crear una fila nueva en
  // script_prompt_generations). Acá solo registramos la vista, que sí es
  // seguro repetir -- el ref evita un doble registro por StrictMode.
  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;
    trackScriptBuilderEvent(projectId, "script_prompt_viewed");
    trackScriptBuilderEvent(projectId, "script_wewebinars_cta_viewed");
  }, [projectId]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      trackScriptBuilderEvent(projectId, "script_prompt_copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Portapapeles no disponible (permiso denegado, contexto no seguro)
      // -- el usuario todavía puede seleccionar y copiar el texto a mano.
    }
  }

  function copyAndOpenChatGpt() {
    void copyPrompt();
    trackScriptBuilderEvent(projectId, "script_chatgpt_opened");
    window.open(CHATGPT_NEW_CHAT_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--brand)" }}>
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-balance sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-muted-foreground text-pretty">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          onClick={copyAndOpenChatGpt}
          className="h-12 flex-1 text-base text-white shadow-sm"
          style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
        >
          <ExternalLink className="size-4" />
          {t("copyAndOpenCta")}
        </Button>
        <Button size="lg" variant="outline" onClick={copyPrompt} className="h-12 flex-1 text-base">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t("copied") : t("copyOnly")}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <pre className="max-h-[32rem] overflow-y-auto text-sm whitespace-pre-wrap text-foreground">
            {prompt}
          </pre>
        </CardContent>
      </Card>

      <WeWebinarsCta signupUrl={signupUrl} onCtaClick={onCtaClick} />

      <div className="flex flex-col items-center gap-3 text-center">
        <button
          type="button"
          onClick={onEditAnswers}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("editAnswers")}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("restart")}
        </button>
      </div>
    </div>
  );
}
