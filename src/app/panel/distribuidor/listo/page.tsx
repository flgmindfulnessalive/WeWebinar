import Link from "next/link";
import { redirect } from "next/navigation";

import { getPanelViewer } from "@/lib/wefunnels/site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { CopyLink } from "@/components/wefunnels/copy-link";
import { WaitingForLicence } from "./waiting";
import { AddressPicker } from "./address-picker";

// Where the payment returns. Three states, in the order they happen:
//
//   the licence has not landed yet -- the webhook is asynchronous, so this
//   is the normal first second, not an error;
//
//   it landed and they have no page -- the address picker, which is where a
//   public buyer gets theirs. Claiming only becomes possible here, after the
//   payment, which is what keeps the free funnel behind an invitation;
//
//   it landed and they have a page -- their gift link is live, so this says
//   so and hands it over.
export default async function DistributorReadyPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/distribuidor/listo");

  if (!viewer.distributor) return <WaitingForLicence />;

  if (!viewer.site) {
    return (
      <div className="flex max-w-[620px] flex-col gap-5">
        <div>
          <p className="m-0 text-[length:var(--wf-kicker)] font-bold tracking-[0.155em] text-[#4ED8A8] uppercase">
            Listo · Ya eres Distribuidor
          </p>
          <h1 className="m-0 mt-2.5 text-[clamp(26px,4vw,34px)] leading-tight font-extrabold tracking-[-0.03em] text-[#F3F7FF]">
            Elige tu dirección
          </h1>
          <p className="m-0 mt-3 text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]">
            Es la última cosa que falta. Tu página de regalo y tu funnel personal viven en
            esta dirección, y una vez publicada ya no cambia.
          </p>
        </div>
        <AddressPicker suggestedFrom={viewer.email} />
      </div>
    );
  }

  const siteUrl = `https://${WEFUNNELS_HOST}/${viewer.site.slug}`;

  return (
    <div className="flex max-w-[680px] flex-col gap-6">
      <div>
        <p className="m-0 text-[length:var(--wf-kicker)] font-bold tracking-[0.155em] text-[#4ED8A8] uppercase">
          Listo · Ya eres Distribuidor
        </p>
        <h1 className="m-0 mt-2.5 text-[clamp(26px,4vw,34px)] leading-tight font-extrabold tracking-[-0.03em] text-[#F3F7FF]">
          Ya puedes regalar funnels.
        </h1>
        <p className="m-0 mt-3 text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]">
          Este es el enlace que repartes. Quien entre por aquí recibe su propio funnel, su
          panel y el curso — y queda registrado como tuyo.
        </p>
      </div>

      <section className="flex flex-col gap-3.5 rounded-[14px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(18px,2.4vw,24px)]">
        <span className="text-[length:var(--wf-kicker)] font-bold tracking-[0.14em] text-[#70E9EF] uppercase">
          Tu página de regalo
        </span>
        <CopyLink url={`${siteUrl}/regalo`} />
        {viewer.site.status !== "published" && (
          <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[#F5BE52]">
            Tu página está en borrador, así que este enlace todavía no abre. Publícala y
            queda vivo.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/panel/repartir"
          className="wf-cta inline-flex min-h-[48px] items-center justify-center rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-5 py-3.5 text-[length:var(--wf-body)] font-bold text-[#071521] no-underline"
        >
          Ir a Funnels repartidos →
        </Link>
        <Link
          href="/panel/pagina"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#2D3E57] px-5 py-3.5 text-[length:var(--wf-body)] font-semibold text-[#D2DFEF] no-underline"
        >
          Personalizar mi página
        </Link>
      </div>

      <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[#8498B4]">
        Tus 2 meses de Starter de WeWebinars ya están corriendo. Continuar después es
        opcional: tu licencia, tu funnel y tu sala del curso permanecen activos.
      </p>
    </div>
  );
}
