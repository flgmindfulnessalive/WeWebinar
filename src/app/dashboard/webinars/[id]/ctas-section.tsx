"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { addCta, removeCta } from "@/lib/actions/ctas";
import { secondsToClock } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { CtaType, Json } from "@/lib/supabase/database.types";

type Cta = {
  id: string;
  type: CtaType;
  timestamp_start_seconds: number;
  timestamp_end_seconds: number | null;
  config: Json;
};

const TYPE_KEY: Record<CtaType, "typeLink" | "typeOverlay" | "typePoll"> = {
  link: "typeLink",
  overlay: "typeOverlay",
  poll: "typePoll",
};

export function CtasSection({
  webinarId,
  ctas,
}: {
  webinarId: string;
  ctas: Cta[];
}) {
  const [type, setType] = useState<CtaType>("link");
  const [state, formAction, isPending] = useActionState(addCta, null);
  const t = useTranslations("CtasSection");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col divide-y rounded-md border">
        {ctas.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">{t("noCtas")}</p>
        )}
        {ctas.map((cta) => (
          <CtaRow key={cta.id} cta={cta} webinarId={webinarId} />
        ))}
      </div>

      <form action={formAction} className="flex flex-col gap-4 border-t pt-6">
        <input type="hidden" name="webinar_id" value={webinarId} />

        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="type">{t("typeLabel")}</Label>
            <select
              id="type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as CtaType)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="link">{t("typeLink")}</option>
              <option value="overlay">{t("typeOverlay")}</option>
              <option value="poll">{t("typePoll")}</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="timestamp_start">{t("startLabel")}</Label>
            <Input
              id="timestamp_start"
              name="timestamp_start"
              placeholder="5:00"
              required
              className="w-24"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="timestamp_end">{t("endLabel")}</Label>
            <Input id="timestamp_end" name="timestamp_end" placeholder="5:30" className="w-24" />
          </div>
        </div>

        {type === "link" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="link_text">{t("buttonTextLabel")}</Label>
              <Input id="link_text" name="link_text" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="link_url">{t("targetUrlLabel")}</Label>
              <Input id="link_url" name="link_url" type="url" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="link_style">{t("styleLabel")}</Label>
              <select
                id="link_style"
                name="link_style"
                defaultValue="banner"
                className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="banner">{t("styleBanner")}</option>
                <option value="popup">{t("stylePopup")}</option>
                <option value="fixed_button">{t("styleFixedButton")}</option>
              </select>
            </div>
          </div>
        )}

        {type === "overlay" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="overlay_text">{t("overlayTextLabel")}</Label>
              <Input id="overlay_text" name="overlay_text" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="overlay_image_url">{t("overlayImageLabel")}</Label>
              <Input id="overlay_image_url" name="overlay_image_url" />
            </div>
          </div>
        )}

        {type === "poll" && (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="poll_question">{t("questionLabel")}</Label>
              <Input id="poll_question" name="poll_question" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="poll_options">{t("optionsLabel")}</Label>
              <textarea
                id="poll_options"
                name="poll_options"
                rows={3}
                required
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
          </div>
        )}

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? t("adding") : t("addCta")}
        </Button>
      </form>
    </div>
  );
}

function ctaSummary(cta: Cta, t: ReturnType<typeof useTranslations<"CtasSection">>): string {
  const config = (cta.config ?? {}) as Record<string, unknown>;
  if (cta.type === "link") {
    return t("summaryLinkFormat", { text: String(config.text ?? ""), url: String(config.url ?? "") });
  }
  if (cta.type === "overlay") return String(config.text ?? config.image_url ?? "");
  if (cta.type === "poll") {
    const options = Array.isArray(config.options) ? config.options.length : 0;
    return t("summaryPollFormat", { question: String(config.question ?? ""), count: options });
  }
  return "";
}

function CtaRow({ cta, webinarId }: { cta: Cta; webinarId: string }) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("CtasSection");

  return (
    <div className="flex items-center justify-between gap-3 p-3 text-sm">
      <div className="flex flex-1 items-center gap-3">
        <span className="w-28 shrink-0 text-xs text-muted-foreground">
          {secondsToClock(cta.timestamp_start_seconds)}
          {cta.timestamp_end_seconds !== null &&
            ` – ${secondsToClock(cta.timestamp_end_seconds)}`}
        </span>
        <Badge variant="secondary">{t(TYPE_KEY[cta.type])}</Badge>
        <span className="truncate text-muted-foreground">{ctaSummary(cta, t)}</span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await removeCta(cta.id, webinarId);
          })
        }
      >
        {t("remove")}
      </Button>
    </div>
  );
}
