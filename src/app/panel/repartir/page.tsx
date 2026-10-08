import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { CopyLink } from "@/components/wefunnels/copy-link";

const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" });

export default async function PanelSharePage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/repartir");
  if (!viewer.site) redirect("/panel");
  if (!viewer.distributor) redirect("/panel/distribuidor");

  const supabase = await createClient();
  const { data: stats } = await supabase.rpc("wefunnel_referral_stats");
  const claimed = stats?.[0]?.arrivals ?? 0;

  const siteUrl = `https://${WEFUNNELS_HOST}/${viewer.site.slug}`;
  const roomUrl = `${siteUrl}/curso`;
  const starterUntil = viewer.distributor.starter_until
    ? new Date(viewer.distributor.starter_until)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Funnels repartidos</h1>

      {/* The two links the course tells them to keep straight, in the same
          order it does: the room is what they share to give the product
          away, the funnel is what presents them. Both credit them, because
          the badge at the foot of the funnel points at the same /r/<slug>
          the room's button does. */}
      <div className="flex flex-col gap-3.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
        <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
          Tu sala del curso — el enlace que repartes
        </span>
        <CopyLink url={roomUrl} />
        <span className="text-sm leading-relaxed text-[#6E7694]">
          Ofrece el curso y el funnel gratis. Quien entre por aquí recibe su propia
          página y queda registrado como tuyo.
        </span>
      </div>

      <div className="flex flex-col gap-3.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
        <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
          Tu funnel personal
        </span>
        <CopyLink url={siteUrl} />
        <span className="text-sm leading-relaxed text-[#6E7694]">
          Presenta lo que haces y capta interesados en tu propuesta. El badge a su pie
          lleva al mismo sitio, así que lo que mandes ahí también cuenta.
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
          Tus 2 meses de WeWebinars Starter van hasta el {DATE.format(starterUntil)}. Después
          son $15 al mes: repartir funnels y tu sala del curso no dependen de eso y no se
          apagan: lo que necesita plan activo es cobrar tu 20%.
        </p>
      )}
    </div>
  );
}
