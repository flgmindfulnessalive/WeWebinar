import { getTranslations } from "next-intl/server";
import { Clapperboard } from "lucide-react";

import { PromoVideoEmbed } from "@/components/promo-video-embed";

// El video en sí es un asset editorial (WeWebinars grabando cómo se usa
// su propio wizard), no algo que este código pueda generar -- se
// referencia por URL vía env var, mismo mecanismo que
// waiting_room_config.promo_video_url (YouTube/Vimeo/link directo, sin
// credenciales). Mientras no esté cargada, el resto de la etapa
// (checklist + progreso + CTA a crear el webinar) sigue siendo
// completamente funcional -- el video no bloquea nada.
export async function ImplementationVideo() {
  const t = await getTranslations("Launchpad.implementation");
  const videoUrl = process.env.NEXT_PUBLIC_LAUNCHPAD_IMPLEMENTATION_VIDEO_URL;

  if (!videoUrl) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 text-center">
        <Clapperboard className="size-8 text-muted-foreground" />
        <p className="max-w-xs text-sm font-medium">{t("videoComingSoonTitle")}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{t("videoComingSoonBody")}</p>
      </div>
    );
  }

  return <PromoVideoEmbed url={videoUrl} className="aspect-video w-full overflow-hidden rounded-xl" />;
}
