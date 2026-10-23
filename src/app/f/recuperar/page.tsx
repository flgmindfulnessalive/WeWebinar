import type { Metadata } from "next";

import { AccessShell } from "@/components/wefunnels/access-shell";
import { WeFunnelResetRequestForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Recuperar mi contraseña · WeFunnels",
  robots: { index: false, follow: false, nocache: true },
};

// Una sola pantalla, dos motivos para llegar a ella.
//
// Lo que hace por dentro es siempre lo mismo: manda un enlace nuevo al
// correo. Pero a ella no se llega solo olvidando la contraseña --- también
// llega quien pulsó el botón de su correo de alta cuando ese enlace ya
// había caducado, y a esa persona «Olvidé mi contraseña» le dice que se ha
// equivocado de puerta cuando no lo ha hecho. Muchos se van ahí.
//
// Así que el motivo viaja en la dirección y solo cambia lo que se lee. Un
// valor raro cae en el texto de siempre, que es el que sirve para quien
// llega escribiendo la dirección o desde «Olvidé mi contraseña».
export default async function WeFunnelRecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const fromSignup = motivo === "alta";

  return (
    <AccessShell
      title={fromSignup ? "Te mandamos otro enlace" : "Olvidé mi contraseña"}
      intro={
        fromSignup
          ? "Escribe el email con el que creaste tu cuenta y te mandamos un enlace nuevo para entrar."
          : "Escribe tu email y te mandamos un enlace para poner una nueva."
      }
    >
      <WeFunnelResetRequestForm />
    </AccessShell>
  );
}
