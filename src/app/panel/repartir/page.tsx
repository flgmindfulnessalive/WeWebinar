import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { CopyLink } from "./copy-link";

const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" });

export default async function PanelSharePage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/repartir");
  if (!viewer.site) redirect("/panel");
  if (!viewer.distributor) redirect("/panel/distribuidor");

  const supabase = await createClient();
  const { data: stats } = await supabase.rpc("wefunnel_referral_stats");
  const claimed = stats?.[0]?.arrivals ?? 0;

  const shareUrl = `https://${WEFUNNELS_HOST}/r/${viewer.site.slug}`;
  const starterUntil = viewer.distributor.starter_until
    ? new Date(viewer.distributor.starter_until)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Funnels repartidos</h1>

      <div className="flex flex-col gap-3.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
        <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
          Tu enlace para repartir
        </span>
        <CopyLink url={shareUrl} />
        <span className="text-sm leading-relaxed text-[#6E7694]">
          Quien entre por aquí recibe su propia página gratis y queda registrado como
          tuyo. Es el mismo enlace del badge al pie de tu página, así que todo lo que
          mandes ahí también cuenta.
        </span>
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
        <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
          Funnels reclamados
        </span>
        <span className="text-[58px] leading-none font-extrabold tracking-tighter text-[#2BD7F5] tabular-nums">
          {claimed}
        </span>
        {/* The sentence that answers the question before it gets asked. The
            giver never sees these people's leads -- each page belongs to the
            account that received it, and that is enforced by the schema, not
            by this screen choosing not to show them. */}
        <span className="max-w-[46ch] text-[15px] leading-snug text-[#A9B0C9]">
          personas reclamaron su página con tu enlace. Solo ves cuántas: los registrados
          de cada funnel son de su dueño, igual que los tuyos son solo tuyos.
        </span>
      </div>

      {starterUntil && (
        <p className="m-0 text-sm leading-relaxed text-[#6E7694]">
          Tus 3 meses de WeWebinars Starter van hasta el {DATE.format(starterUntil)}.
          Después son $15 al mes solo si quieres seguir con webinario propio y envío de
          emails: repartir funnels no depende de eso, y tu sala del curso no se apaga.
        </p>
      )}
    </div>
  );
}
