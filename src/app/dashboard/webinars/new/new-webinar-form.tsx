"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { createWebinar } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradientBlobs } from "@/components/gradient-blobs";
import { cn } from "@/lib/utils";

const TITLE_MAX_LENGTH = 70;

export function NewWebinarForm({
  accountName,
  brandColors,
}: {
  accountName: string;
  brandColors: { a: string; b: string };
}) {
  const [state, formAction, isPending] = useActionState(createWebinar, null);
  const t = useTranslations("NewWebinar");
  const categoryChips = t.raw("categoryChips") as string[];

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {t("pageHeading")}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t("pageSubheading")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <form action={formAction} className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="title">{t("titleLabel")}</Label>
              <p className="text-xs text-muted-foreground">{t("titleHint")}</p>
              <Input
                id="title"
                name="title"
                required
                maxLength={TITLE_MAX_LENGTH}
                placeholder={t("titlePlaceholder")}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <p className="text-right text-xs tabular-nums text-muted-foreground">
                {title.length}/{TITLE_MAX_LENGTH}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">{t("categoryLabel")}</Label>
              <Input
                id="category"
                name="category"
                placeholder={t("categoryPlaceholder")}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {categoryChips.map((chip) => {
                  const selected = category.toLowerCase() === chip.toLowerCase();
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setCategory(selected ? "" : chip)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t("descriptionLabel")}</Label>
              <p className="text-xs text-muted-foreground">{t("descriptionHint")}</p>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

            <div className="grid gap-2 pt-1">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-[#4f46e5] to-[#c026d3] text-white shadow-sm hover:opacity-90"
              >
                {isPending ? t("creating") : t("createDraft")}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{t("description")}</p>
            </div>
          </form>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <span
              className="size-1.5 animate-pulse rounded-full"
              style={{ background: brandColors.a }}
              aria-hidden
            />
            {t("previewLabel")}
          </div>

          <div className="relative overflow-hidden rounded-xl bg-[#0b0f19] p-6">
            <GradientBlobs colorA={brandColors.a} colorB={brandColors.b} />
            <div className="relative flex items-center gap-2 text-sm text-white/80">
              <span
                className="size-4 rounded-sm"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.a}, ${brandColors.b})`,
                }}
                aria-hidden
              />
              {t("previewAccountPresents", { name: accountName })}
            </div>

            <span className="relative mt-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90 uppercase">
              {category || t("previewDefaultBadge")}
            </span>

            <h2
              className={cn(
                "relative mt-4 text-xl font-semibold text-balance",
                title ? "text-white" : "text-white/40"
              )}
            >
              {title || t("previewTitlePlaceholder")}
            </h2>

            <div className="relative mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-sm text-white/70">
              <span className="size-7 rounded-full border border-dashed border-white/30" aria-hidden />
              {t("previewPresenterPlaceholder")}
            </div>
          </div>

          <p className="px-1 text-xs text-muted-foreground">{t("previewCaption")}</p>
        </div>
      </div>
    </div>
  );
}
