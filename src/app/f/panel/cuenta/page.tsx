import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { getPanelViewer } from "@/lib/wefunnels/site";
import { EmailForm, NameForm, ResendConfirmation } from "./account-forms";

export const metadata: Metadata = {
  title: "Mi perfil · WeFunnels",
  robots: { index: false, follow: false },
};

const H1 =
  "m-0 text-[clamp(24px,3.6vw,30px)] font-extrabold tracking-[-0.03em] text-[#F3F7FF]";
const H2 = "m-0 text-[length:var(--wf-h3)] font-semibold text-[#F3F7FF]";
const CARD = "rounded-[14px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(18px,2.6vw,24px)]";
const BODY = "m-0 text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]";

// Mi perfil: los datos de la persona, no los de su página.
//
// La distinción es la que hacía falta explicar en pantalla, porque hay dos
// nombres y dos fotos en este producto y hasta ahora no había ningún sitio
// donde se dijera cuál es cuál: lo de aquí es con qué entra y cómo la
// llamamos nosotros; lo de Mi página es lo que leen sus visitantes.
export default async function PanelAccountPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/entrar?next=/panel/cuenta");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className={H1}>Mi perfil</h1>
        <p className="m-0 mt-2 text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]">
          Con qué entras a WeFunnels. Lo que ven tus visitantes se edita en{" "}
          <Link href="/panel/pagina" className="font-semibold text-[#43E2EE] no-underline">
            Mi página
          </Link>
          .
        </p>
      </div>

      <section className={`${CARD} flex flex-col gap-4`}>
        <h2 className={H2}>Tu nombre</h2>
        <NameForm current={viewer.displayName ?? ""} />
      </section>

      <section className={`${CARD} flex flex-col gap-4`}>
        <h2 className={H2}>Tu email</h2>

        {viewer.emailVerified ? (
          <p className="m-0 text-[length:var(--wf-small)] leading-relaxed text-[#8EEFF5]">
            Verificado. Puedes publicar tu página.
          </p>
        ) : (
          // El aviso donde de verdad se puede resolver. Antes esto solo se
          // decía en el editor, y sin nada que pulsar: la única salida era
          // buscar un correo que podía haber llegado días atrás.
          <div className="flex flex-col gap-3 rounded-[12px] border border-[#F5BE52] bg-[#1A1407] p-4">
            <strong className="text-[length:var(--wf-body)] font-semibold text-[#F7D79B]">
              Tu email todavía no está verificado.
            </strong>
            <p className="m-0 text-[length:var(--wf-small)] leading-relaxed text-[#D8C49A]">
              Puedes usar todo el panel y personalizar tu página. Lo único que necesita la
              verificación es publicarla, porque una página publicada es una dirección
              pública con tu nombre.
            </p>
            <ResendConfirmation />
          </div>
        )}

        <EmailForm current={viewer.email} />
      </section>

      <section className={`${CARD} flex flex-col gap-3`}>
        <h2 className={H2}>Tu contraseña y el resto</h2>
        <p className={BODY}>
          Cambiar la contraseña y cerrar la sesión en todos tus dispositivos están en{" "}
          <Link
            href="/panel/cuenta/configuracion"
            className="font-semibold text-[#43E2EE] no-underline"
          >
            Configuración
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
