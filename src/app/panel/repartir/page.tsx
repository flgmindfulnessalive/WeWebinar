import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { CopyLink } from "@/components/wefunnels/copy-link";

const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" });

// Written from their side, in the order a visitor moves through it. The
// numbers live in wefunnel_site_stats (20261007000010).
const STEPS = [
  {
    label: "Abrieron tu sala",
    body: "Visitas al enlace que repartes.",
  },
  {
    label: "Se registraron al curso",
    body: "Y te quedaron en Mis registrados.",
  },
  {
    label: "Reclamaron su funnel",
    body: "Ya tienen su página, de por vida.",
  },
];

export default async function PanelSharePage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/repartir");
  if (!viewer.site) redirect("/panel");
  if (!viewer.distributor) redirect("/panel/distribuidor");

  const supabase = await createClient();
  // The gift page's chain. Its window is the same one the free panel uses,
  // so the two screens never disagree about what "últimos 30 días" covers.
  const { data: stats } = await supabase.rpc("wefunnel_site_stats", { p_days: 30 });
  const visits = Number(stats?.[0]?.gift_visits ?? 0);
  const registrations = Number(
    (await supabase
      .from("wefunnel_leads")
      .select("id", { count: "exact", head: true })
      .eq("site_id", viewer.site.id)
      .eq("source", "course")).count ?? 0
  );
  const claimed = Number(stats?.[0]?.claims ?? 0);

  // The rate that tells them which half to work on: traffic, or the room.
  // Shown only once there is traffic, because a percentage of nothing reads
  // as a judgement.
  const claimRate = visits > 0 ? Math.round((claimed / visits) * 100) : null;

  const siteUrl = `https://${WEFUNNELS_HOST}/${viewer.site.slug}`;
  const giftUrl = `${siteUrl}/regalo`;
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
          Tu página de regalo — el enlace que repartes
        </span>
        <CopyLink url={giftUrl} />
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
        {/* No longer "the badge counts too": the foot of a funnel page stopped
            offering a claim when the tier went invitation-only
            (20261007000009), so the room above is the only door. Saying
            otherwise would have them sending traffic to the wrong link. */}
        <span className="text-sm leading-relaxed text-[#6E7694]">
          Presenta lo que haces y capta interesados en tu propuesta. Para repartir
          funnels, el enlace es el de arriba: es el único por el que se reclaman.
        </span>
      </div>

      {/* The three steps of the room, in the order they happen. Separated
          because each one fails for a different reason: no visits is a
          traffic problem, visits without registrations is the room, and
          registrations without claims is the course. A single "reclamados"
          number could not tell them which. */}
      <div className="flex flex-col gap-5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
        <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
          Tu embudo
        </span>
        <ol className="m-0 flex list-none flex-col gap-4 p-0 sm:flex-row sm:gap-3">
          {STEPS.map((step, index) => (
            <li
              key={step.label}
              className="flex min-w-0 flex-1 flex-col gap-1 border-[#1A1A2A] sm:border-l sm:pl-4 sm:first:border-l-0 sm:first:pl-0"
            >
              <span
                className={`text-[44px] leading-none font-extrabold tracking-tighter tabular-nums ${
                  index === 0 ? "text-[#F4F5FA]" : index === 1 ? "text-[#A9B0C9]" : "text-[#2BD7F5]"
                }`}
              >
                {[visits, registrations, claimed][index]}
              </span>
              <span className="text-[15px] font-semibold">{step.label}</span>
              <span className="text-sm leading-snug text-[#6E7694]">{step.body}</span>
            </li>
          ))}
        </ol>
        {claimRate !== null && (
          <span className="text-sm leading-relaxed text-[#6E7694]">
            De cada 100 personas que abren tu sala, {claimRate} se queda con su funnel.
          </span>
        )}
        {/* The sentence that answers the question before it gets asked. The
            giver never sees these people's leads -- each page belongs to the
            account that received it, and that is enforced by the schema, not
            by this screen choosing not to show them. */}
        <span className="max-w-[52ch] border-t border-[#1A1A2A] pt-4 text-[15px] leading-snug text-[#A9B0C9]">
          De los funnels que repartiste solo ves cuántos: los registrados de cada uno son
          de su dueño, igual que los tuyos son solo tuyos.
        </span>
      </div>

      {starterUntil && (
        <p className="m-0 text-sm leading-relaxed text-[#6E7694]">
          Tus 2 meses de WeWebinars Starter van hasta el {DATE.format(starterUntil)}. Son una
          prueba de la plataforma: si te sirve, siguen $15 al mes; si no, no pagas nada.
          Repartir funnels, tu sala del curso y tu 20% no dependen de eso y no se apagan.
        </p>
      )}
    </div>
  );
}
