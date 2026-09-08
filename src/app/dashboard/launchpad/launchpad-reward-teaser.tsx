import Link from "next/link";
import { ChevronRight, Gift } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";

// Antes de completar "demo" nunca revela el contenido del bonus -- solo
// deja el recorrido visible desde el día 1 (transparencia sobre las 7
// etapas). Una vez que /api/launchpad/demo desbloquea las recompensas
// (ver launchpad_rewards), esta misma tarjeta se vuelve un link a
// /dashboard/launchpad/rewards -- el estado se recibe ya calculado
// server-side, nunca se infiere acá.
export function LaunchpadRewardTeaser({ unlocked }: { unlocked: boolean }) {
  const t = useTranslations("Launchpad.dashboard");

  const content = (
    <CardContent className="flex items-center gap-4 pt-6">
      <span
        className={
          "flex size-10 shrink-0 items-center justify-center rounded-full " +
          (unlocked ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white" : "bg-muted")
        }
      >
        <Gift className={unlocked ? "size-5" : "size-5 text-muted-foreground"} />
      </span>
      <div className="flex-1">
        <p className="font-medium">{t("rewardTitle")}</p>
        <p className="text-sm text-muted-foreground">{unlocked ? t("rewardUnlockedSubtitle") : t("rewardSubtitle")}</p>
      </div>
      {unlocked && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
    </CardContent>
  );

  if (!unlocked) return <Card className="border-dashed">{content}</Card>;

  return (
    <Link href="/dashboard/launchpad/rewards">
      <Card className="transition-colors hover:bg-muted/40">{content}</Card>
    </Link>
  );
}
