import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { REFERRAL_COOKIE, parseTouch } from "@/lib/wefunnels/referral";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { CopyLink } from "@/components/wefunnels/copy-link";
import { PeriodStats } from "./period-stats";

// Mi panel: what their page did, where it lives, their course, and the
// distributor offer. The editor moved to /panel/pagina -- this screen is
// read first and acted on, so the thing it opens with is numbers, not a
// form.
export default async function PanelHomePage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel");

  // No page yet. The invitation rules are explained here rather than in a
  // form that would walk somebody through picking a name and refuse them at
  // the last step.
  if (!viewer.site) {
    const touch = parseTouch((await cookies()).get(REFERRAL_COOKIE)?.value);
    let invited = false;

    if (touch) {
      const supabase = await createClient();
      const { data } = await supabase.rpc("wefunnel_invitation_open", {
        p_slug: touch.slug,
      });
      invited = Boolean(data);
    }

    if (invited) redirect("/panel/pagina");

    return (
      <div className="flex max-w-[620px] flex-col gap-4 rounded-2xl border border-[#2D3E57] bg-[#0E192A] p-6">
        <h1 className="m-0 text-[26px] font-bold tracking-tight text-[#F3F7FF]">
          WeFunnels es por invitación
        </h1>
        <p className="m-0 text-[15px] leading-relaxed text-[#B7C7DC]">
          Las páginas no se piden: te las regala un distribuidor. Si conoces a la persona
          que te habló de esto, pídele su enlace de regalo — con él tu funnel es gratis de
          por vida, sin tarjeta y sin mensualidad.
        </p>
        <p className="m-0 text-sm leading-relaxed text-[#8498B4]">
          Si entraste por un enlace y ves esto, puede que haya pasado demasiado tiempo o
          que ese enlace no sea el de regalo. Vuelve a abrir el que te pasaron.
        </p>
      </div>
    );
  }

  const site = viewer.site;
  const isPublished = site.status === "published" && !site.suspended_at;
  const siteUrl = `https://${WEFUNNELS_HOST}/${site.slug}`;
  const firstName = site.display_name.split(/\s+/)[0] ?? site.display_name;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="m-0 text-[clamp(26px,4vw,32px)] font-extrabold tracking-[-0.03em] text-[#F3F7FF]">
          Hola, {firstName}.
        </h1>
        <p className="m-0 mt-2 text-[15px] leading-relaxed text-[#B7C7DC]">
          {isPublished
            ? "Tu página está activa. Dale seguimiento a las personas que mostraron interés."
            : "Tu página está en borrador. Publícala para que empiece a captar registros."}
        </p>
      </div>

      {/* The period selector governs all three figures at once, which is why
          they come from one call on one calendar window: on separate
          windows the conversion rate would be wrong at the edges. */}
      <PeriodStats />

      <section className="flex flex-col gap-3.5 rounded-[14px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(18px,2.4vw,24px)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <strong className="text-[16px] font-semibold text-[#F3F7FF]">
            Tu funnel personal
          </strong>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] ${
              site.suspended_at
                ? "border-[#FF8A8A] text-[#FF8A8A]"
                : isPublished
                  ? "border-[#4ED8A8] text-[#4ED8A8]"
                  : "border-[#F5BE52] text-[#F5BE52]"
            }`}
          >
            {site.suspended_at ? "Suspendida" : isPublished ? "Publicada" : "Borrador"}
          </span>
        </div>
        <CopyLink url={siteUrl} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm leading-relaxed text-[#8498B4]">
            {isPublished
              ? "Comparte tu enlace en contenido y conversaciones."
              : "Tu enlace queda vivo en cuanto publiques."}
          </span>
          <Link
            href="/panel/pagina"
            className="rounded-lg border border-[#2D3E57] px-4 py-2.5 text-sm font-semibold text-[#D2DFEF] no-underline"
          >
            Ver y editar mi página
          </Link>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(18px,2.4vw,24px)]">
          <p className="m-0 text-[11px] font-bold tracking-[0.155em] text-[#70E9EF] uppercase">
            Curso incluido
          </p>
          <h2 className="m-0 text-[20px] leading-tight font-bold tracking-[-0.02em] text-[#F3F7FF]">
            Cómo NUNCA quedarte sin prospectos
          </h2>
          <p className="m-0 text-sm leading-relaxed text-[#B7C7DC]">
            Aprende a llevar tráfico a tu funnel. Un video, en WeWebinars.
          </p>
          <Link
            href="/panel/curso"
            className="mt-1 inline-flex min-h-[46px] items-center justify-center rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-5 py-3 text-[15px] font-bold text-[#071521] no-underline"
          >
            Ver mi curso →
          </Link>
        </section>

        {!viewer.distributor && <DistributorOffer />}
        {viewer.distributor && (
          <section className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(18px,2.4vw,24px)]">
            <p className="m-0 text-[11px] font-bold tracking-[0.155em] text-[#70E9EF] uppercase">
              Eres Distribuidor
            </p>
            <h2 className="m-0 text-[20px] leading-tight font-bold tracking-[-0.02em] text-[#F3F7FF]">
              Reparte funnels sin límite.
            </h2>
            <p className="m-0 text-sm leading-relaxed text-[#B7C7DC]">
              Tu página de regalo y el embudo de lo que reparte están en Funnels
              repartidos.
            </p>
            <Link
              href="/panel/repartir"
              className="mt-1 inline-flex min-h-[46px] items-center justify-center rounded-lg border border-[#2D3E57] px-5 py-3 text-[15px] font-semibold text-[#D2DFEF] no-underline"
            >
              Ir a Funnels repartidos →
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

// The price is not written in here. /panel/distribuidor reads it from
// wefunnel_license_price, which decides it from the account's own referral
// rows -- so this card invites them to the screen that knows, rather than
// naming a figure this one would have to guess.
function DistributorOffer() {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-[#A855F7] bg-gradient-to-br from-[#0B1230] to-[#1B0C2E] p-[clamp(18px,2.4vw,24px)]">
      <p className="m-0 text-[11px] font-bold tracking-[0.155em] text-[#D8B4FE] uppercase">
        Tu siguiente opción
      </p>
      <h2 className="m-0 text-[20px] leading-tight font-bold tracking-[-0.02em] text-[#F3F7FF]">
        Ahora tú puedes regalar funnels.
      </h2>
      <p className="m-0 text-sm leading-relaxed text-[#B7C7DC]">
        Activa Distribuidor y regala funnels ilimitados de por vida.
      </p>
      <Link
        href="/panel/distribuidor"
        className="mt-1 inline-flex min-h-[46px] items-center justify-center rounded-lg border border-[#A855F7] px-5 py-3 text-[15px] font-semibold text-[#E9D5FF] no-underline"
      >
        Conocer los beneficios →
      </Link>
      <p className="m-0 text-xs leading-relaxed text-[#8498B4]">
        Opcional. Tu cuenta gratuita sigue activa.
      </p>
    </section>
  );
}
