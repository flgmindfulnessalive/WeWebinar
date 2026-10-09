import type { Metadata } from "next";

import { AccessShell } from "@/components/wefunnels/access-shell";
import { WeFunnelResetRequestForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Recuperar mi contraseña · WeFunnels",
  robots: { index: false, follow: false, nocache: true },
};

export default function WeFunnelRecoverPage() {
  return (
    <AccessShell
      title="Olvidé mi contraseña"
      intro="Escribe tu email y te mandamos un enlace para poner una nueva."
    >
      <WeFunnelResetRequestForm />
    </AccessShell>
  );
}
