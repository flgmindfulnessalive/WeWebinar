"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { WF_BUTTON, WF_ERROR } from "@/components/wefunnels/access-shell";

// Donde cae el enlace de los correos de WeFunnels.
//
// Existe aparte de /auth/confirm, que es la de WeWebinars, por una razón que
// se ve en la bandeja de entrada: el enlace de un correo de WeFunnels no
// puede decir wewebinars.com. Y no puede ser la misma ruta en los dos hosts
// porque el subdominio reescribe todo sobre /f, así que /auth/confirm no
// resuelve ahí -- y meter /auth en la lista de rutas compartidas haría que
// el host de la app mandara SU /auth/confirm al subdominio, rompiendo el
// flujo de WeWebinars.
//
// Más simple que aquella a propósito, y no por descuido: aquella atiende
// además el parámetro `code` del flujo PKCE, que existe por compatibilidad
// con plantillas antiguas de Supabase. Los correos de WeFunnels los
// construimos nosotros con generateLink, así que siempre traen token_hash y
// nunca lo otro.
//
// Lo que sí se conserva entero es el motivo de que haya un botón: verificar
// al cargar gasta el token de un solo uso en cuanto un escáner antivirus
// corporativo visita el enlace para comprobarlo -- y varios de esos
// escáneres ejecutan JavaScript, así que hacerlo en un efecto tampoco
// basta. Un escáner no pulsa botones.
const TYPES: EmailOtpType[] = ["recovery", "signup", "email_change", "magiclink", "invite"];

function isOtpType(value: string | null): value is EmailOtpType {
  return TYPES.includes(value as EmailOtpType);
}

export function WeFunnelsConfirmClient() {
  const params = useSearchParams();
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const requested = params.get("next");

  // Solo una ruta de WeFunnels. El valor viaja en el enlace de un correo,
  // así que cualquiera puede escribirlo, y acaba en una navegación.
  const next =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/panel";

  const [supabase] = useState(() => createClient());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = Boolean(tokenHash) && isOtpType(type);

  async function confirm() {
    if (!tokenHash || !isOtpType(type)) return;
    setBusy(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (verifyError) {
      setBusy(false);
      if (
        verifyError.code === "otp_expired" ||
        verifyError.message.toLowerCase().includes("expired")
      ) {
        setError(
          "Ese enlace ya no vale: sirve una sola vez y caduca. Pide uno nuevo desde «Olvidé mi contraseña»."
        );
        return;
      }
      setError(verifyError.message);
      return;
    }

    // Navegación del navegador y no del enrutador: la sesión acaba de
    // escribirse en una cookie y la pantalla de destino la lee en el
    // servidor, así que tiene que pedirse entera.
    window.location.assign(next);
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-3">
        <p className={WF_ERROR} role="alert">
          Este enlace no está completo. Cópialo entero desde el correo, o pide uno nuevo.
        </p>
        <Link
          href="/recuperar"
          className="self-start text-[length:var(--wf-small)] font-semibold text-[#43E2EE] no-underline hover:underline"
        >
          Pedir un enlace nuevo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={confirm} disabled={busy} className={WF_BUTTON}>
        {busy ? "Comprobando…" : "Continuar →"}
      </button>

      {error && (
        <>
          <p className={WF_ERROR} role="alert">
            {error}
          </p>
          <Link
            href="/recuperar"
            className="self-start text-[length:var(--wf-small)] font-semibold text-[#43E2EE] no-underline hover:underline"
          >
            Pedir un enlace nuevo
          </Link>
        </>
      )}
    </div>
  );
}
