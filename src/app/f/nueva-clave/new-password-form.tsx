"use client";

import { useActionState } from "react";

import { weFunnelSetPassword, type WeFunnelAuthState } from "@/lib/actions/wefunnel-auth";
import {
  WF_BUTTON,
  WF_ERROR,
  WF_FIELD,
  WF_HELP,
  WF_LABEL,
} from "@/components/wefunnels/access-shell";

export function WeFunnelNewPasswordForm() {
  const [state, formAction, isPending] = useActionState<WeFunnelAuthState, FormData>(
    weFunnelSetPassword,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className={WF_LABEL} htmlFor="wf-new-password">
          Tu contraseña nueva
        </label>
        <input
          id="wf-new-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          aria-describedby="wf-new-password-help"
          className={`${WF_FIELD} mt-2`}
        />
        <p className={WF_HELP} id="wf-new-password-help">
          Al menos 8 caracteres.
        </p>
      </div>

      {/* Repetirla no es burocracia aquí: quien llega a esta pantalla no
          puede comprobar si se equivocó escribiéndola, porque la anterior ya
          no le sirve para nada. */}
      <div>
        <label className={WF_LABEL} htmlFor="wf-repeat-password">
          Repítela
        </label>
        <input
          id="wf-repeat-password"
          name="repeat"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={`${WF_FIELD} mt-2`}
        />
      </div>

      <button type="submit" disabled={isPending} className={WF_BUTTON}>
        {isPending ? "Guardando…" : "Guardar y entrar →"}
      </button>

      {state && "error" in state && (
        <p className={WF_ERROR} role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
