"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TOTAL_BLUEPRINT_SLIDES, slideDefinition } from "@/lib/launchpad/blueprint-content";
import { trackLaunchpadEvent } from "@/lib/launchpad/track";
import { buildBlueprintMarkdown, downloadBlueprintFile } from "./blueprint-download";
import { BlueprintSlideNav } from "./blueprint-slide-nav";

export type BlueprintSlideState = { completed: boolean; notes: string };

const AUTOSAVE_DEBOUNCE_MS = 1200;

export function BlueprintExplorer({
  projectId,
  initialSlides,
}: {
  projectId: string | null;
  initialSlides: Record<number, BlueprintSlideState>;
}) {
  const t = useTranslations("Launchpad.blueprint");
  const [current, setCurrent] = useState(1);
  const [slides, setSlides] = useState(initialSlides);
  const [savingSlide, setSavingSlide] = useState<number | null>(null);
  const [justSavedSlide, setJustSavedSlide] = useState<number | null>(null);
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSavedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedTracked = useRef(false);
  const viewedSlides = useRef(new Set<number>());

  const slide = slideDefinition(current);
  const state = slides[current] ?? { completed: false, notes: "" };
  const completedCount = Object.values(slides).filter((s) => s.completed).length;

  useEffect(() => {
    if (projectId) trackLaunchpadEvent(projectId, "launchpad_step_started", { step_key: "architecture" });
  }, [projectId]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

    if (projectId && !viewedSlides.current.has(current)) {
      viewedSlides.current.add(current);
      trackLaunchpadEvent(projectId, "blueprint_slide_viewed", { slide_number: current });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  async function persist(slideNumber: number, next: BlueprintSlideState) {
    if (!projectId) return;
    setSavingSlide(slideNumber);
    try {
      const response = await fetch("/api/launchpad/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideNumber, completed: next.completed, notes: next.notes }),
      });
      if (response.ok) {
        const data = (await response.json()) as { architectureCompleted: boolean };
        if (data.architectureCompleted && !completedTracked.current) {
          completedTracked.current = true;
          trackLaunchpadEvent(projectId, "blueprint_completed");
        }
        setJustSavedSlide(slideNumber);
        if (justSavedTimeoutRef.current) clearTimeout(justSavedTimeoutRef.current);
        justSavedTimeoutRef.current = setTimeout(
          () => setJustSavedSlide((prev) => (prev === slideNumber ? null : prev)),
          2000
        );
      }
    } catch {
      // Best-effort -- el estado en memoria sigue reflejando lo que el
      // usuario hizo aunque el guardado falle; se reintenta en el
      // próximo cambio.
    } finally {
      setSavingSlide((prev) => (prev === slideNumber ? null : prev));
    }
  }

  function updateNotes(value: string) {
    const next = { ...state, notes: value };
    setSlides((prev) => ({ ...prev, [current]: next }));
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(() => persist(current, next), AUTOSAVE_DEBOUNCE_MS);
  }

  function toggleReady() {
    const next = { ...state, completed: !state.completed };
    setSlides((prev) => ({ ...prev, [current]: next }));
    persist(current, next);
  }

  function goTo(slideNumber: number) {
    setCurrent(Math.min(TOTAL_BLUEPRINT_SLIDES, Math.max(1, slideNumber)));
  }

  const markdown = useMemo(() => buildBlueprintMarkdown(t, slides), [t, slides]);

  function handleDownload() {
    downloadBlueprintFile(markdown, "blueprint-evergreen-webinar.md");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("progress", { completed: completedCount, total: TOTAL_BLUEPRINT_SLIDES })}</span>
          <span className="tabular-nums">{Math.round((completedCount / TOTAL_BLUEPRINT_SLIDES) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
            style={{
              width: `${(completedCount / TOTAL_BLUEPRINT_SLIDES) * 100}%`,
              background: "linear-gradient(90deg, #4f46e5, #c026d3)",
            }}
          />
        </div>
      </div>

      <BlueprintSlideNav current={current} slides={slides} onSelect={goTo} />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t(`acts.${slide.act}.title`)}
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {current}. {t(`slides.slide${current}.title`)}
              </h2>
            </div>
            <Button
              type="button"
              size="sm"
              variant={state.completed ? "outline" : "default"}
              onClick={toggleReady}
              disabled={savingSlide === current}
            >
              {state.completed && <Check className="size-4" />}
              {state.completed ? t("markedReady") : t("markReady")}
            </Button>
          </div>

          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium">{t("objectiveLabel")}</dt>
              <dd className="text-muted-foreground text-pretty">{t(`slides.slide${current}.objective`)}</dd>
            </div>
            <div>
              <dt className="font-medium">{t("questionLabel")}</dt>
              <dd className="text-muted-foreground text-pretty">{t(`slides.slide${current}.question`)}</dd>
            </div>
            <div>
              <dt className="font-medium">{t("exampleLabel")}</dt>
              <dd className="text-muted-foreground text-pretty">{t(`slides.slide${current}.example`)}</dd>
            </div>
            <div>
              <dt className="font-medium">{t("visualTipLabel")}</dt>
              <dd className="text-muted-foreground text-pretty">{t(`slides.slide${current}.visualTip`)}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="blueprint-notes">{t("notesLabel")}</Label>
            <Textarea
              id="blueprint-notes"
              value={state.notes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={3}
            />
            <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
              {savingSlide === current ? t("saving") : justSavedSlide === current ? t("saved") : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => goTo(current - 1)} disabled={current === 1}>
          <ChevronLeft className="size-4" />
          {t("previous")}
        </Button>
        {current < TOTAL_BLUEPRINT_SLIDES ? (
          <Button onClick={() => goTo(current + 1)} className="text-white shadow-sm" style={{ background: "linear-gradient(90deg, #4f46e5, #c026d3)" }}>
            {t("next")}
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button asChild className="text-white shadow-sm" style={{ background: "linear-gradient(90deg, #4f46e5, #c026d3)" }}>
            <Link href="/script-builder">{t("completeProfileCta")}</Link>
          </Button>
        )}
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="size-4" />
          {t("downloadCta")}
        </Button>
      </div>
    </div>
  );
}

