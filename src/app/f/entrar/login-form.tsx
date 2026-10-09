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

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function WeFunnelLoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState<WeFunnelAuthState, FormData>(
    weFunnelSignIn,
    null
  );
  const { containerRef: turnstileRef, token: captchaToken } = useTurnstile(TURNSTILE_SITE_KEY);
  const [visible, setVisible] = useState(false);

  return (
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
          autoFocus
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

      <button type="submit" disabled={isPending} className={WF_BUTTON}>
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
  );
}
