"use client";

import { useState } from "react";
import { Download, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackLaunchpadEvent } from "@/lib/launchpad/track";
import type { LaunchpadRewardStatus } from "@/lib/launchpad/types";
import { buildPlaybookMarkdown, downloadPlaybookFile } from "./playbook-download";

export function RewardPlaybookCard({
  projectId,
  initialStatus,
}: {
  projectId: string | null;
  initialStatus: LaunchpadRewardStatus;
}) {
  const t = useTranslations("Launchpad.rewards.playbook");
  const tBlueprint = useTranslations("Launchpad.blueprint");
  const tImplementation = useTranslations("Launchpad.implementation");
  const [status, setStatus] = useState(initialStatus);
  const [downloading, setDownloading] = useState(false);
  const locked = status === "locked" || status === "expired";

  async function handleDownload() {
    if (locked || !projectId) return;
    setDownloading(true);
    try {
      const response = await fetch("/api/launchpad/reward/playbook", { method: "POST" });
      if (response.ok) {
        setStatus("redeemed");
        trackLaunchpadEvent(projectId, "playbook_downloaded");
        const markdown = buildPlaybookMarkdown(t, tBlueprint, tImplementation);
        downloadPlaybookFile(markdown, "playbook-evergreen-webinar-2026.md");
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className={locked ? "opacity-70" : undefined}>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-center gap-2">
          {locked && <Lock className="size-4 text-muted-foreground" />}
          <h2 className="font-semibold">{t("title")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{locked ? t("lockedHint") : t("unlockedHint")}</p>
        <Button
          onClick={handleDownload}
          disabled={locked || downloading}
          className="mt-1 self-start text-white shadow-sm"
          style={locked ? undefined : { background: "linear-gradient(90deg, #4f46e5, #c026d3)" }}
        >
          <Download className="size-4" />
          {t("downloadCta")}
        </Button>
      </CardContent>
    </Card>
  );
}
