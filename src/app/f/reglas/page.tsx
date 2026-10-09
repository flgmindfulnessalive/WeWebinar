import Link from "next/link";
import type { Metadata } from "next";

import { Wordmark } from "@/components/wefunnels/wordmark";
import { BackToTop } from "@/components/wefunnels/back-to-top";

export const metadata: Metadata = {
  title: "Reglas de contenido · WeFunnels",
  robots: { index: false, follow: false },
};

const SHELL = "mx-auto w-full max-w-[760px] px-[clamp(20px,5vw,34px)]";
const H2 =
  "m-0 mt-10 text-[length:var(--wf-h3)] font-bold tracking-[-0.02em] text-[#F3F7FF]";
const BODY = "m-0 mt-3 text-[length:var(--wf-body)] leading-[1.7] text-[#C1D1E6]";
const LI = "text-[length:var(--wf-body)] leading-[1.7] text-[#C1D1E6]";

// Las reglas de contenido, escritas desde el filtro que de verdad corre.
//
// Esta página existía en el pie de la web oficial como enlace a
// /reglas-wefunnels en el host de la app, y esa dirección nunca se escribió:
// devolvía 404 en producción. Lo que hay aquí no es una redacción nueva --
// es lo que wefunnel_blocked_terms ya aplica (20261007000003), dicho en
// palabras, para que nadie se entere de una regla al ver su página en
// borrador sin explicación.
export default function WeFunnelsRulesPage() {
  return (
    <main id="top" className="pb-16">
      <BackToTop />

      <header className="border-b border-[#202A3B] py-6">
        <div className={`${SHELL} flex items-center justify-between gap-4`}>
          <Link href="/" className="wf-home" aria-label="WeFunnels, ir al inicio">
            <Wordmark size="sm" />
          </Link>
          <Link
            href="/entrar"
            className="text-[length:var(--wf-small)] font-semibold text-[#43E2EE] no-underline"
          >
            Entrar
          </Link>
        </div>
      </header>

      <div className={`${SHELL} pt-10`}>
        <h1 className="m-0 text-[length:var(--wf-h2)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance">
          Reglas de contenido
        </h1>
        <p className="mt-4 mb-0 text-[length:var(--wf-lead)] leading-relaxed text-[#C1D1E6]">
          Todas las páginas de WeFunnels viven bajo la misma dirección. Eso significa que
          lo que una publique afecta a las demás: si WhatsApp o Meta bloquean el dominio
          por una, lo bloquean para todas. Estas reglas son lo que impide que eso pase.
        </p>

        <h2 className={H2}>Qué se bloquea al instante</h2>
        <p className={BODY}>
          Si tu página contiene esto, se pasa a borrador en el mismo momento en que lo
          guardas, sin que nadie lo revise primero. No es una sanción: es que ese texto
          no puede estar vivo ni un minuto.
        </p>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">Datos bancarios.</strong>{" "}
            IBAN, SWIFT, CLABE, números de cuenta o de tarjeta. Tu página pide un nombre y
            un teléfono; no hay ninguna razón para que pida un número de cuenta.
          </li>
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">Criptomonedas.</strong>{" "}
            Monederos, exchanges o tokens. Está fuera por regla, no por criterio.
          </li>
        </ul>

        <h2 className={H2}>Qué pasa a revisión</h2>
        <p className={BODY}>
          Tu página sigue publicada y una persona la mira. Si está bien, no vuelves a oír
          del asunto.
        </p>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">
              Promesas de ingresos.
            </strong>{" "}
            «Dinero fácil», «ingresos pasivos», «libertad financiera», rentabilidad,
            inversión, trading, apuestas, préstamos. Lo que ofreces en público es una
            herramienta gratuita, nunca una ganancia.
          </li>
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">Reclutamiento.</strong>{" "}
            «Oportunidad de negocio», «plan de compensación», «únete a mi equipo»,
            multinivel. Esa conversación es tuya y va después, no en la página.
          </li>
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">Salud.</strong> Curas,
            milagros, «antes y después», adelgazar.
          </li>
          <li className={LI}>
            <strong className="font-semibold text-[#F3F7FF]">
              Nombres de empresas y marcas.
            </strong>{" "}
            Habla de lo que ofreces, no de para quién trabajas. Además de protegerte a
            ti, es lo que mantiene tu página dentro del cumplimiento de tu propia
            compañía.
          </li>
        </ul>

        <h2 className={H2}>Lo que siempre puedes hacer</h2>
        <p className={BODY}>
          Retirar tu página de internet, desde Mi página, cuando quieras y sin pedir
          permiso. Tu dirección sigue siendo tuya mientras la reescribes: nadie puede
          quedarse con tu nombre.
        </p>

        <h2 className={H2}>Si ves una página que no cumple</h2>
        <p className={BODY}>
          Cada página lleva un enlace para reportarla, y no hace falta tener cuenta para
          usarlo.{" "}
          <Link href="/reportar" className="font-semibold text-[#43E2EE] no-underline">
            También puedes reportar desde aquí
          </Link>
          . No decimos a nadie quién reportó qué.
        </p>

        <h2 className={H2}>Si tu página se suspendió</h2>
        <p className={BODY}>
          Lo verás en Mi página, con la regla que la paró. Una suspensión no la levanta su
          dueño -- eso sería el filtro sin filtro -- así que escríbenos a{" "}
          <a
            href="mailto:operaciones@wewebinars.com?subject=Revisi%C3%B3n%20de%20mi%20p%C3%A1gina%20de%20WeFunnels"
            className="font-semibold text-[#43E2EE]"
          >
            operaciones@wewebinars.com
          </a>{" "}
          y la revisamos. Tus registros y tu curso no se tocan mientras tanto.
        </p>

        <p className="mt-10 mb-0 text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]">
          Esta lista crece con lo que aparece en la cola de revisión, sin que haya que
          publicar una versión nueva de la plataforma. Si una regla te parece
          desproporcionada para tu caso, dilo: se mira.
        </p>
      </div>
    </main>
  );
}
