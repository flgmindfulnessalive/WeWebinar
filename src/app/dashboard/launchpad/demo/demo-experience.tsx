"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, PlayCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackLaunchpadEvent } from "@/lib/launchpad/track";

// La demo NO arma una experiencia paralela: apunta a un webinar
// evergreen real de WeWebinars corriendo con el mismo stack público que
// usa cualquier cuenta (registro -> sala de espera -> sala en vivo). Se
// abre en una pestaña nueva porque esa experiencia es de página completa
// (countdown, chat, CTAs) -- embeberla en un iframe le rompería el
// countdown anclado al servidor. Mientras la URL no esté configurada, el
// resto de la etapa avisa "próximamente" en vez de ofrecer un link roto.
export function DemoExperience({
  projectId,
  initialCompleted,
}: {
  projectId: string | null;
  initialCompleted: boolean;
}) {
  const t = useTranslations("Launchpad.demo");
  const [completed, setCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);
  const demoUrl = process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL;

  useEffect(() => {
    if (projectId) trackLaunchpadEvent(projectId, "launchpad_step_started", { step_key: "demo" });
  }, [projectId]);

  async function confirmWatched() {
    setSaving(true);
    try {
      if (projectId) {
        const response = await fetch("/api/launchpad/demo", { method: "POST" });
        if (response.ok) {
          trackLaunchpadEvent(projectId, "demo_completed");
          const data = (await response.json()) as { rewardsJustUnlocked: boolean };
          if (data.rewardsJustUnlocked) {
            trackLaunchpadEvent(projectId, "reward_unlocked");
          }
        }
      }
      setCompleted(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        {demoUrl ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 px-6 py-10 text-center">
            <PlayCircle className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{t("demoReadyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("demoReadyBody")}</p>
            </div>
            <Button asChild className="mt-1 text-white shadow-sm" style={{ background: "linear-gradient(90deg, #4f46e5, #c026d3)" }}>
              <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                {t("openDemoCta")}
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center">
            <PlayCircle className="size-8 text-muted-foreground" />
            <p className="font-medium">{t("demoComingSoonTitle")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t("demoComingSoonBody")}</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 border-t pt-5 text-center">
          {completed ? (
            <>
              <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="size-4" />
                {t("confirmedNote")}
              </p>
              <Button asChild variant="outline">
                <Link href="/dashboard/launchpad/rewards">{t("goToRewardsCta")}</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("confirmHint")}</p>
              <Button onClick={confirmWatched} disabled={saving || !demoUrl} variant="outline">
                {t("confirmCta")}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
