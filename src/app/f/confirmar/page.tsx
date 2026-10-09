import { Suspense } from "react";
import type { Metadata } from "next";

import { AccessShell } from "@/components/wefunnels/access-shell";
import { WeFunnelsConfirmClient } from "./confirm-client";

export const metadata: Metadata = {
  title: "Confirmar · WeFunnels",
  robots: { index: false, follow: false, nocache: true },
};

// Suspense porque el cliente lee la query, y useSearchParams obliga a un
// límite de suspensión en una ruta que no se renderiza en cada petición.
//
// El fallback dice algo. Con `null`, que es lo que hace la pantalla
// equivalente de WeWebinars, el primer fotograma de esta página es una
// tarjeta vacía: la ruta es estática, así que el HTML que llega del
// servidor no trae el botón y éste solo aparece al hidratar. Una línea
// mientras tanto cuesta nada y evita que alguien crea que el enlace de su
// correo llevaba a una página rota.
export default function WeFunnelsConfirmPage() {
  return (
    <AccessShell
      title="Un paso más"
      intro="Pulsa continuar para seguir desde donde lo dejaste."
    >
      <Suspense
        fallback={
          <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[#8498B4]">
            Preparando tu enlace…
          </p>
        }
      >
        <WeFunnelsConfirmClient />
      </Suspense>
    </AccessShell>
  );
}
