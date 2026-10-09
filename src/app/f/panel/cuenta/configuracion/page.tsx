import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { getPanelViewer } from "@/lib/wefunnels/site";
import { weFunnelSignOutEverywhere } from "@/lib/actions/wefunnel-auth";
import { PasswordForm } from "../account-forms";

export const metadata: Metadata = {
  title: "Configuración · WeFunnels",
  robots: { index: false, follow: false },
};

const H1 =
  "m-0 text-[clamp(24px,3.6vw,30px)] font-extrabold tracking-[-0.03em] text-[#F3F7FF]";
const H2 = "m-0 text-[length:var(--wf-h3)] font-semibold text-[#F3F7FF]";
const CARD = "rounded-[14px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(18px,2.6vw,24px)]";
const BODY = "m-0 text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]";
const SMALL = "m-0 text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]";

const SUPPORT_EMAIL = "operaciones@wewebinars.com";

// Configuración: lo que de verdad se puede configurar.
//
// Deliberadamente corta. Las opciones de una página -- el color, el píxel,
// el titular, la pregunta del formulario -- viven en Mi página, que es donde
// se ven mientras se tocan; traerlas aquí las duplicaría. Lo que queda es lo
// que pertenece a la cuenta y no a la página, y nada de lo que hay en esta
// pantalla es decorativo.
export default async function PanelSettingsPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/entrar?next=/panel/cuenta/configuracion");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className={H1}>Configuración</h1>
        <p className="m-0 mt-2 text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]">
          Tu acceso y tus sesiones. El aspecto de tu página se configura en{" "}
          <Link href="/panel/pagina" className="font-semibold text-[#43E2EE] no-underline">
            Mi página
          </Link>
          .
        </p>
      </div>

      <section className={`${CARD} flex flex-col gap-4`}>
        <h2 className={H2}>Cambiar mi contraseña</h2>
        <PasswordForm />
      </section>

      <section className={`${CARD} flex flex-col gap-4`}>
        <h2 className={H2}>Cerrar sesión en todos mis dispositivos</h2>
        <p className={BODY}>
          Úsalo si entraste desde un ordenador que no es tuyo, o si crees que alguien
          más tiene tu contraseña. Cierra también esta sesión: volverás a entrar con tu
          email y tu contraseña.
        </p>
        <form action={weFunnelSignOutEverywhere}>
          <button
            type="submit"
            className="wf-cta inline-flex items-center justify-center rounded-[10px] border border-[#5A3540] bg-[#1C1016] px-4 py-2.5 text-[length:var(--wf-small)] font-semibold text-[#FFB4B4]"
          >
            Cerrar todas mis sesiones
          </button>
        </form>
      </section>

      <section className={`${CARD} flex flex-col gap-3`}>
        <h2 className={H2}>Dar de baja mi página</h2>
        {/* Dicho como es, no como un botón que no existe. Una página no se
            borra: las personas que dejaron sus datos en ella son un registro
            de quién pidió qué, y la base de datos no tiene ninguna ruta de
            borrado para el dueño precisamente por eso. Lo que sí puede hacer
            cualquiera, hoy y sin pedirlo, es despublicarla desde Mi página. */}
        <p className={BODY}>
          Puedes retirarla de internet tú mismo y cuando quieras: en{" "}
          <Link href="/panel/pagina" className="font-semibold text-[#43E2EE] no-underline">
            Mi página
          </Link>{" "}
          la pasas a borrador y deja de ser visible al instante. Tu dirección sigue
          siendo tuya, así que nadie puede quedarse con tu nombre mientras la
          reescribes.
        </p>
        <p className={SMALL}>
          Borrar la cuenta entera es otra cosa y se hace a mano: los registros que
          alguien dejó en tu página son la prueba de quién pidió qué, y no se eliminan
          sin pedirlo. Escríbenos a{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Baja de mi cuenta de WeFunnels")}`}
            className="font-semibold text-[#43E2EE]"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          desde {viewer.email} y lo hacemos.
        </p>
      </section>
    </div>
  );
}
