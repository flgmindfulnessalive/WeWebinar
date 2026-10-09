"use client";

import Link from "next/link";
import { useActionState } from "react";

import { useTurnstile } from "@/hooks/use-turnstile";
import { weFunnelRequestReset, type WeFunnelSentState } from "@/lib/actions/wefunnel-auth";
import {
  WF_BUTTON,
  WF_ERROR,
  WF_FIELD,
  WF_LABEL,
} from "@/components/wefunnels/access-shell";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function WeFunnelResetRequestForm() {
  const [state, formAction, isPending] = useActionState<WeFunnelSentState, FormData>(
    weFunnelRequestReset,
    null
  );
  const { containerRef: turnstileRef, token: captchaToken } = useTurnstile(TURNSTILE_SITE_KEY, state);

  // Said without naming the address back, and without saying whether it had
  // an account: this screen is open to anyone.
  if (state && "sent" in state) {
    return (
      <div className="flex flex-col gap-3">
        <strong className="text-[length:var(--wf-h3)] font-semibold text-[#8EEFF5]">
          Revisa tu correo
        </strong>
        <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[#C1D1E6]">
          Si esa dirección tiene cuenta en WeFunnels, acaba de salir un enlace para
          poner una contraseña nueva. Sirve una sola vez y caduca, así que ábrelo
          cuando lo tengas a mano.
        </p>
        <p className="m-0 text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]">
          Si no aparece en unos minutos, mira en spam o en «promociones».
        </p>
        <Link
          href="/entrar"
          className="self-start text-[length:var(--wf-small)] font-semibold text-[#43E2EE] no-underline hover:underline"
        >
          Volver a entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {captchaToken && (
        <input type="hidden" name="cf-turnstile-response" value={captchaToken} />
      )}

      <div>
        <label className={WF_LABEL} htmlFor="wf-reset-email">
          Tu email
        </label>
        <input
          id="wf-reset-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="tu@email.com"
          className={`${WF_FIELD} mt-2`}
        />
      </div>

      {TURNSTILE_SITE_KEY && <div ref={turnstileRef} />}

      <button type="submit" disabled={isPending} className={WF_BUTTON}>
        {isPending ? "Mandando…" : "Mandarme el enlace →"}
      </button>

      {state && "error" in state && (
        <p className={WF_ERROR} role="alert">
          {state.error}
        </p>
      )}

      <Link
        href="/entrar"
        className="self-start text-[length:var(--wf-small)] font-semibold text-[#43E2EE] no-underline hover:underline"
      >
        Me acordé, quiero entrar
      </Link>
    </form>
  );
}
