"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { archiveProspect } from "@/lib/actions/growth-prospects";
import { Button } from "@/components/ui/button";

export function ArchiveButton({ prospectId }: { prospectId: string }) {
  const t = useTranslations("GrowthProspects");
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        if (confirm(t("archiveConfirm"))) {
          startTransition(() => archiveProspect(prospectId));
        }
      }}
    >
      {t("archive")}
    </Button>
  );
}
