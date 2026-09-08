import { Gift } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";

// El sistema de rewards (Playbook + descuento, módulo 16 del brief)
// todavía no está construido -- esta tarjeta existe para que el
// recorrido completo sea visible desde el día 1 (transparencia sobre las
// 7 etapas), no para desbloquear nada todavía. Nunca revela el contenido
// del bonus antes de tiempo.
export function LaunchpadRewardTeaser() {
  const t = useTranslations("Launchpad.dashboard");

  return (
    <Card className="border-dashed">
      <CardContent className="flex items-center gap-4 pt-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Gift className="size-5 text-muted-foreground" />
        </span>
        <div>
          <p className="font-medium">{t("rewardTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("rewardSubtitle")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
