import type { Metadata } from "next";

import { AccessShell } from "@/components/wefunnels/access-shell";
import { WeFunnelNewPasswordForm } from "./new-password-form";

export const metadata: Metadata = {
  title: "Nueva contraseña · WeFunnels",
  robots: { index: false, follow: false, nocache: true },
};

// Donde cae el enlace del correo de recuperación. No está protegida por el
// proxy a propósito: quien llega aquí trae la sesión de recuperación que
// creó /auth/confirm, y exigirle estar dentro para poder entrar sería el
// bucle que esta pantalla existe para romper. Lo que decide si puede
// cambiarla es Supabase, al recibir la escritura.
export default function WeFunnelNewPasswordPage() {
  return (
    <AccessShell
      title="Pon tu contraseña nueva"
      intro="Después de guardarla entras directo a tu panel."
    >
      <WeFunnelNewPasswordForm />
    </AccessShell>
  );
}
