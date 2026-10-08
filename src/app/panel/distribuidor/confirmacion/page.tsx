import Link from "next/link";
import { redirect } from "next/navigation";

import { Kicker, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/wefunnels/brand";
import { getPanelViewer } from "@/lib/wefunnels/site";

// Where Whop sends the buyer back. The licence is activated by the
// confirmed-payment webhook, never by this page: if it has not arrived yet,
// the page says so and offers to check again.
export default async function DistributorConfirmationPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/distribuidor/confirmacion");

  if (viewer.isDistributor) {
    return (
      <div className="max-w-[620px]" role="status">
        <Kicker>Licencia activa</Kicker>
        <h1 className="mt-2.5 mb-3 text-[29px] leading-tight font-bold tracking-[-1px]">Ya puedes regalar funnels.</h1>
        <p className="text-[15px] text-[#afc1d9]">
          Tu licencia Distribuidor está activa, con 2 meses de Starter de WeWebinars incluidos.
        </p>
        <Link href={viewer.site ? "/panel/regalo" : "/panel"} className={PRIMARY_BUTTON}>
          {viewer.site ? "Ver mi página de regalo →" : "Crear mi página →"}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[620px]" role="status">
      <Kicker>Confirmando tu pago</Kicker>
      <h1 className="mt-2.5 mb-3 text-[29px] leading-tight font-bold tracking-[-1px]">Estamos confirmando tu pago</h1>
      <p className="text-[15px] text-[#afc1d9]">
        Tu licencia se activa en cuanto recibimos la confirmación del pago. Normalmente tarda unos
        segundos. Si ya pasaron varios minutos, escríbenos y lo revisamos.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/panel/distribuidor/confirmacion" className={PRIMARY_BUTTON}>Comprobar de nuevo</Link>
        <Link href="/panel" className={SECONDARY_BUTTON}>Ir a mi panel</Link>
      </div>
    </div>
  );
}
