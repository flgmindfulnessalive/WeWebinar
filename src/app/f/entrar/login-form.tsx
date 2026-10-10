"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { useTurnstile } from "@/hooks/use-turnstile";
import { weFunnelSignIn, type WeFunnelAuthState } from "@/lib/actions/wefunnel-auth";
import {
  WF_BUTTON,
  WF_ERROR,
  WF_FIELD,
  WF_LABEL,
} from "@/components/wefunnels/access-shell";
import { WeFunnelsGoogleButton } from "@/components/wefunnels/google-button";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function WeFunnelLoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState<WeFunnelAuthState, FormData>(
    weFunnelSignIn,
    null
  );
  const { containerRef: turnstileRef, token: captchaToken } = useTurnstile(TURNSTILE_SITE_KEY, state);
  const [visible, setVisible] = useState(false);

  // El mismo candado que el login de WeWebinars: si Turnstile está
  // configurado, el botón no se habilita hasta que llega su token. Sin esto
  // el formulario sale sin él y Supabase lo rechaza con un error de captcha
  // que no se parece en nada a lo que la persona acaba de hacer.
  const waitingForCaptcha = Boolean(TURNSTILE_SITE_KEY) && !captchaToken;

  return (
    <div className="flex flex-col gap-5">
      {/* Primero Google, y no por moda: quien creó su cuenta así no tiene
          contraseña, así que ésta no es una alternativa para él sino la
          única puerta que le sirve. Sin este botón escribía su correo,
          probaba contraseñas que nunca existieron y leía que no coinciden
          -- lo cual es verdad y no ayuda en nada. */}
      <WeFunnelsGoogleButton next={next} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <span className="w-full border-t border-[#243249]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#0B1423] px-3 text-[length:var(--wf-kicker)] tracking-[0.1em] text-[#8498B4] uppercase">
            o con tu email
          </span>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        {captchaToken && (
          <input type="hidden" name="cf-turnstile-response" value={captchaToken} />
        )}

        <div>
          <label className={WF_LABEL} htmlFor="wf-email">
            Tu email
          </label>
          <input
            id="wf-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@email.com"
            className={`${WF_FIELD} mt-2`}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label className={WF_LABEL} htmlFor="wf-password">
              Tu contraseña
            </label>
            <button
              type="button"
              onClick={() => setVisible((shown) => !shown)}
              className="border-0 bg-transparent p-0 text-[length:var(--wf-kicker)] font-semibold text-[#8EEFF5] underline"
            >
              {visible ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <input
            id="wf-password"
            name="password"
            type={visible ? "text" : "password"}
            required
            autoComplete="current-password"
            className={`${WF_FIELD} mt-2`}
          />
        </div>

        {TURNSTILE_SITE_KEY && <div ref={turnstileRef} />}

        <button
          type="submit"
          disabled={isPending || waitingForCaptcha}
          className={WF_BUTTON}
        >
          {isPending ? "Entrando…" : "Entrar a mi panel →"}
        </button>

        {state && "error" in state && (
          <p className={WF_ERROR} role="alert">
            {state.error}
          </p>
        )}

        <Link
          href="/recuperar"
          className="self-start text-[length:var(--wf-small)] font-semibold text-[#43E2EE] no-underline hover:underline"
        >
          Olvidé mi contraseña
        </Link>
      </form>
    </div>
  );
}
