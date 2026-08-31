"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { addCta, updateCta, removeCta } from "@/lib/actions/ctas";
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

// Shared by the "add" form and each row's inline "edit" form -- one set of
// type-conditional fields, prefilled from `defaults` when editing.
function CtaTypeFields({
  type,
  idPrefix,
  defaults,
}: {
  type: CtaType;
  idPrefix: string;
  defaults?: Partial<Record<string, unknown>>;
}) {
  const t = useTranslations("CtasSection");
  const config = (defaults ?? {}) as Record<string, unknown>;

  if (type === "link") {
    return (
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-link_text`}>{t("buttonTextLabel")}</Label>
          <Input
            id={`${idPrefix}-link_text`}
            name="link_text"
            defaultValue={String(config.text ?? "")}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-link_url`}>{t("targetUrlLabel")}</Label>
          <Input
            id={`${idPrefix}-link_url`}
            name="link_url"
            type="url"
            defaultValue={String(config.url ?? "")}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-link_style`}>{t("styleLabel")}</Label>
          <select
            id={`${idPrefix}-link_style`}
            name="link_style"
            defaultValue={String(config.style ?? "banner")}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="banner">{t("styleBanner")}</option>
            <option value="popup">{t("stylePopup")}</option>
            <option value="fixed_button">{t("styleFixedButton")}</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-link_scarcity_minutes`}>{t("scarcityMinutesLabel")}</Label>
          <Input
            id={`${idPrefix}-link_scarcity_minutes`}
            name="link_scarcity_minutes"
            type="number"
            min={1}
            defaultValue={
              typeof config.scarcity_minutes === "number" ? config.scarcity_minutes : undefined
            }
            placeholder={t("scarcityMinutesPlaceholder")}
          />
        </div>
      </div>
    );
  }

  if (type === "overlay") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-overlay_text`}>{t("overlayTextLabel")}</Label>
          <Input
            id={`${idPrefix}-overlay_text`}
            name="overlay_text"
            defaultValue={String(config.text ?? "")}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-overlay_image_url`}>{t("overlayImageLabel")}</Label>
          <Input
            id={`${idPrefix}-overlay_image_url`}
            name="overlay_image_url"
            defaultValue={String(config.image_url ?? "")}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-overlay_link_url`}>{t("overlayLinkUrlLabel")}</Label>
          <Input
            id={`${idPrefix}-overlay_link_url`}
            name="overlay_link_url"
            type="url"
            placeholder="https://"
            defaultValue={String(config.url ?? "")}
          />
        </div>
      </div>
    );
  }

  // poll
  const options = Array.isArray(config.options) ? (config.options as string[]) : [];
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-poll_question`}>{t("questionLabel")}</Label>
        <Input
          id={`${idPrefix}-poll_question`}
          name="poll_question"
          defaultValue={String(config.question ?? "")}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-poll_options`}>{t("optionsLabel")}</Label>
        <textarea
          id={`${idPrefix}-poll_options`}
          name="poll_options"
          rows={3}
          defaultValue={options.join("\n")}
          required
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
    </div>
  );
}

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

        <CtaTypeFields type={type} idPrefix="add" />

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
    const base = t("summaryLinkFormat", { text: String(config.text ?? ""), url: String(config.url ?? "") });
    const scarcityMinutes = config.scarcity_minutes;
    if (typeof scarcityMinutes === "number" && scarcityMinutes > 0) {
      return `${base} · ${t("summaryScarcity", { minutes: scarcityMinutes })}`;
    }
    return base;
  }
  if (cta.type === "overlay") return String(config.text ?? config.image_url ?? "");
  if (cta.type === "poll") {
    const options = Array.isArray(config.options) ? config.options.length : 0;
    return t("summaryPollFormat", { question: String(config.question ?? ""), count: options });
  }
  return "";
}

function CtaEditForm({
  cta,
  webinarId,
  onSaved,
  onCancel,
}: {
  cta: Cta;
  webinarId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<CtaType>(cta.type);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("CtasSection");

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateCta(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 bg-muted/30 p-3">
      <input type="hidden" name="webinar_id" value={webinarId} />
      <input type="hidden" name="cta_id" value={cta.id} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`edit-${cta.id}-type`}>{t("typeLabel")}</Label>
          <select
            id={`edit-${cta.id}-type`}
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
          <Label htmlFor={`edit-${cta.id}-start`}>{t("startLabel")}</Label>
          <Input
            id={`edit-${cta.id}-start`}
            name="timestamp_start"
            defaultValue={secondsToClock(cta.timestamp_start_seconds)}
            required
            className="w-24"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`edit-${cta.id}-end`}>{t("endLabel")}</Label>
          <Input
            id={`edit-${cta.id}-end`}
            name="timestamp_end"
            defaultValue={
              cta.timestamp_end_seconds !== null ? secondsToClock(cta.timestamp_end_seconds) : ""
            }
            className="w-24"
          />
        </div>
      </div>

      <CtaTypeFields type={type} idPrefix={`edit-${cta.id}`} defaults={cta.config as Record<string, unknown>} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? t("saving") : t("save")}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

function CtaRow({ cta, webinarId }: { cta: Cta; webinarId: string }) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const t = useTranslations("CtasSection");

  if (isEditing) {
    return (
      <CtaEditForm
        cta={cta}
        webinarId={webinarId}
        onSaved={() => setIsEditing(false)}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

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
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
          {t("edit")}
        </Button>
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
    </div>
  );
}
