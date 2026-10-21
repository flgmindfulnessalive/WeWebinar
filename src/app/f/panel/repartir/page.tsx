import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { CopyLink } from "@/components/wefunnels/copy-link";

const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" });

// Written from their side, in the order a visitor moves through it. The
// numbers live in wefunnel_site_stats (20261007000010).
//
// Dos pasos y no tres. El de en medio contaba registros al curso, y ese
// camino dejó de existir cuando el botón de la página de regalo pasó a
// llevar directo al alta: el número llevaba meses en cero sin que
// significara nada, que es la peor clase de métrica -- parece un fallo del
// que mira.
const STEPS = [
  {
    label: "Abrieron tu página de regalo",
    body: "Visitas al enlace que repartes.",
  },
  {
    label: "Reclamaron su funnel",
    body: "Ya tienen su página, y te quedan en Mis registros.",
  },
];

export default async function PanelSharePage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/entrar?next=/panel/repartir");
  if (!viewer.site) redirect("/panel");
  if (!viewer.distributor) redirect("/panel/distribuidor");

  const supabase = await createClient();
  // The gift page's chain. Its window is the same one the free panel uses,
  // so the two screens never disagree about what "últimos 30 días" covers.
  const { data: stats } = await supabase.rpc("wefunnel_site_stats", { p_days: 30 });
  const visits = Number(stats?.[0]?.gift_visits ?? 0);
  const claimed = Number(stats?.[0]?.claims ?? 0);

  // The rate that tells them which half to work on: traffic, or the page.
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
          order it does: the gift page is what they share to give the
          product away, the funnel is what presents them. Both credit them,
          because the badge at the foot of the funnel points at the same
          /r/<slug> the gift page's button does. */}
      <div className="flex flex-col gap-3.5 rounded-2xl border border-[var(--wf-edge)] bg-[var(--wf-card)] p-6">
        <span className="text-[length:var(--wf-small)] font-semibold tracking-[0.08em] text-[var(--wf-fg-muted)] uppercase">
          Tu página de regalo — el enlace que repartes
        </span>
        <CopyLink url={giftUrl} />
        <span className="text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-muted)]">
          Ofrece el curso y el funnel gratis. Quien entre por aquí recibe su propia
          página y queda registrado como tuyo.
        </span>
      </div>

      <div className="flex flex-col gap-3.5 rounded-2xl border border-[var(--wf-edge)] bg-[var(--wf-card)] p-6">
        <span className="text-[length:var(--wf-small)] font-semibold tracking-[0.08em] text-[var(--wf-fg-muted)] uppercase">
          Tu funnel personal
        </span>
        <CopyLink url={siteUrl} />
        {/* No longer "the badge counts too": the foot of a funnel page stopped
            offering a claim when the tier went invitation-only
            (20261007000009), so the room above is the only door. Saying
            otherwise would have them sending traffic to the wrong link. */}
        <span className="text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-muted)]">
          Presenta lo que haces y capta interesados en tu propuesta. Para repartir
          funnels, el enlace es el de arriba: es el único por el que se reclaman.
        </span>
      </div>

      {/* Los dos pasos de la página de regalo, en el orden en que pasan.
          Separados porque cada uno falla por su cuenta: sin visitas es un
          problema de tráfico, y visitas sin reclamos es la página. Un solo
          número de "reclamados" no diría cuál de los dos. */}
      <div className="flex flex-col gap-5 rounded-2xl border border-[var(--wf-edge)] bg-[var(--wf-card)] p-6">
        <span className="text-[length:var(--wf-small)] font-semibold tracking-[0.08em] text-[var(--wf-fg-muted)] uppercase">
          Tu embudo
        </span>
        <ol className="m-0 flex list-none flex-col gap-4 p-0 sm:flex-row sm:gap-3">
          {STEPS.map((step, index) => (
            <li
              key={step.label}
              className="flex min-w-0 flex-1 flex-col gap-1 border-[var(--wf-edge-soft)] sm:border-l sm:pl-4 sm:first:border-l-0 sm:first:pl-0"
            >
              <span
                className={`text-[44px] leading-none font-extrabold tracking-tighter tabular-nums ${
                  index === 0 ? "text-[var(--wf-fg)]" : "text-[var(--wf-accent)]"
                }`}
              >
                {[visits, claimed][index]}
              </span>
              <span className="text-[length:var(--wf-body)] font-semibold">{step.label}</span>
              <span className="text-[length:var(--wf-body)] leading-snug text-[var(--wf-fg-muted)]">{step.body}</span>
            </li>
          ))}
        </ol>
        {claimRate !== null && (
          <span className="text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-muted)]">
            De cada 100 personas que abren tu página de regalo, {claimRate} se queda con su funnel.
          </span>
        )}
        {/* La frase que contesta la pregunta antes de que la hagan. De cada
            persona que reclama se ve su nombre y su correo, que es lo que
            hace falta para acompañarla el primer día; sus registrados no,
            y eso no lo decide esta pantalla al no enseñarlos: cada página
            pertenece a la cuenta que la recibió. */}
        <span className="max-w-[52ch] border-t border-[var(--wf-edge-soft)] pt-4 text-[length:var(--wf-body)] leading-snug text-[var(--wf-fg-3)]">
          De quien reclama ves su nombre y su correo, en Mis registros. Lo que esa persona
          capte con su funnel es suyo, igual que lo tuyo es solo tuyo.
        </span>
      </div>

      {starterUntil && (
        <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-muted)]">
          Tus 2 meses de WeWebinars Starter van hasta el {DATE.format(starterUntil)}. Son una
          prueba de la plataforma: si te sirve, eliges un plan; si no, no pagas nada y ese
          día se apaga solo el lado WeWebinars (tus webinarios quedan archivados, no
          borrados). Repartir funnels, tu sala del curso y tu 20% no dependen de eso y no
          se apagan nunca.
        </p>
      )}
    </div>
  );
}
