"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { upsertWaitingRoom } from "@/lib/actions/waiting-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Json } from "@/lib/supabase/database.types";

type WaitingRoomConfig = {
  headline: string | null;
  subheadline: string | null;
  background_url: string | null;
  background_type: "image" | "video" | null;
  promo_video_url: string | null;
  show_calendar_button: boolean;
  show_fake_counter: boolean;
  bullets: Json;
  testimonials: Json;
} | null;

export function WaitingRoomSection({
  webinarId,
  config,
  fakeViewerMin,
  fakeViewerMax,
}: {
  webinarId: string;
  config: WaitingRoomConfig;
  fakeViewerMin: number;
  fakeViewerMax: number;
}) {
  const [state, formAction, isPending] = useActionState(upsertWaitingRoom, null);
  const t = useTranslations("WaitingRoomSection");
  const tCommon = useTranslations("SettingsCommon");

  const bullets = (Array.isArray(config?.bullets) ? config.bullets : []) as string[];
  const testimonials = (
    Array.isArray(config?.testimonials) ? config.testimonials : []
  ) as { name: string; text: string }[];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="webinar_id" value={webinarId} />

      <div className="grid gap-2">
        <Label htmlFor="headline">{t("headlineLabel")}</Label>
        <p className="text-xs text-muted-foreground">{t("headlineHint")}</p>
        <Input
          id="headline"
          name="headline"
          defaultValue={config?.headline ?? ""}
          placeholder={t("headlinePlaceholder")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="subheadline">{t("subheadlineLabel")}</Label>
        <Input
          id="subheadline"
          name="subheadline"
          defaultValue={config?.subheadline ?? ""}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="promo_video_url">{t("promoVideoLabel")}</Label>
        <p className="text-xs text-muted-foreground">{t("promoVideoHint")}</p>
        <Input
          id="promo_video_url"
          name="promo_video_url"
          defaultValue={config?.promo_video_url ?? ""}
          placeholder="https://youtu.be/..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <Label htmlFor="background_url">{t("backgroundUrlLabel")}</Label>
          <Input
            id="background_url"
            name="background_url"
            defaultValue={config?.background_url ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="background_type">{t("typeLabel")}</Label>
          <select
            id="background_type"
            name="background_type"
            defaultValue={config?.background_type ?? "image"}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="image">{t("typeImage")}</option>
            <option value="video">{t("typeVideo")}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bullets">{t("bulletsLabel")}</Label>
        <p className="text-xs text-muted-foreground">{t("bulletsHint")}</p>
        <textarea
          id="bullets"
          name="bullets"
          rows={4}
          defaultValue={bullets.join("\n")}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="testimonials">{t("testimonialsLabel")}</Label>
        <textarea
          id="testimonials"
          name="testimonials"
          rows={3}
          defaultValue={testimonials
            .map((t) => (t.name ? `${t.name}: ${t.text}` : t.text))
            .join("\n")}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="show_calendar_button"
            defaultChecked={config?.show_calendar_button ?? true}
            className="size-4"
          />
          {t("calendarButtonLabel")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="show_fake_counter"
            defaultChecked={config?.show_fake_counter ?? true}
            className="size-4"
          />
          {t("fakeCounterLabel")}
        </label>
      </div>

      <div className="grid gap-2">
        <Label>{t("fakeViewerRangeLabel")}</Label>
        <p className="text-xs text-muted-foreground">{t("fakeViewerRangeHint")}</p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            name="fake_viewer_min"
            defaultValue={fakeViewerMin}
            aria-label={t("fakeViewerMinLabel")}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">{t("fakeViewerRangeSeparator")}</span>
          <Input
            type="number"
            min={0}
            name="fake_viewer_max"
            defaultValue={fakeViewerMax}
            aria-label={t("fakeViewerMaxLabel")}
            className="w-24"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? tCommon("saving") : t("saveWaitingRoom")}
      </Button>
    </form>
  );
}
