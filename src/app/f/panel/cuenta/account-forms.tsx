"use client";

import { useActionState } from "react";

import {
  weFunnelChangeEmail,
  weFunnelChangePassword,
  weFunnelResendConfirmation,
  weFunnelUpdateName,
  type WeFunnelSavedState,
} from "@/lib/actions/wefunnel-auth";
import {
  WF_ERROR,
  WF_FIELD,
  WF_HELP,
  WF_LABEL,
} from "@/components/wefunnels/access-shell";

const BUTTON =
  "wf-cta inline-flex items-center justify-center self-start rounded-[10px] border border-[#2D3E57] bg-[#111C2E] px-4 py-2.5 text-[length:var(--wf-small)] font-semibold text-[#E6EFFA] disabled:opacity-60";

function Result({ state }: { state: WeFunnelSavedState }) {
  if (!state) return null;
  const bad = "error" in state;
  return (
    <p
      role={bad ? "alert" : "status"}
      className={
        bad
          ? WF_ERROR
          : "m-0 text-[length:var(--wf-small)] leading-relaxed text-[#8EEFF5]"
      }
    >
      {bad ? state.error : state.success}
    </p>
  );
}

export function NameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<WeFunnelSavedState, FormData>(
    weFunnelUpdateName,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <label className={WF_LABEL} htmlFor="wf-account-name">
          Tu nombre
        </label>
        <input
          id="wf-account-name"
          name="name"
          required
          maxLength={80}
          defaultValue={current}
          aria-describedby="wf-account-name-help"
          className={`${WF_FIELD} mt-2`}
        />
        <p className={WF_HELP} id="wf-account-name-help">
          Es el nombre de tu cuenta, el que sale aquí arriba. El que ven tus visitantes
          se cambia en Mi página.
        </p>
      </div>
      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? "Guardando…" : "Guardar mi nombre"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function EmailForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<WeFunnelSavedState, FormData>(
    weFunnelChangeEmail,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <label className={WF_LABEL} htmlFor="wf-account-email">
          Tu email de acceso
        </label>
        <input
          id="wf-account-email"
          name="email"
          type="email"
          required
          defaultValue={current}
          aria-describedby="wf-account-email-help"
          className={`${WF_FIELD} mt-2`}
        />
        <p className={WF_HELP} id="wf-account-email-help">
          Cambiarlo pide confirmación en las dos direcciones, la de antes y la nueva. El
          cambio no se aplica hasta que abras los dos enlaces.
        </p>
      </div>
      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? "Mandando…" : "Cambiar mi email"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<WeFunnelSavedState, FormData>(
    weFunnelChangePassword,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <label className={WF_LABEL} htmlFor="wf-account-password">
          Contraseña nueva
        </label>
        <input
          id="wf-account-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby="wf-account-password-help"
          className={`${WF_FIELD} mt-2`}
        />
        <p className={WF_HELP} id="wf-account-password-help">
          Al menos 8 caracteres. Tu sesión de aquí sigue abierta.
        </p>
      </div>
      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? "Guardando…" : "Cambiar mi contraseña"}
      </button>
      <Result state={state} />
    </form>
  );
}

// Reenviar el correo de confirmación. Es lo único que puede hacer por sí
// misma una persona atascada antes de publicar: wefunnel_publish_site
// rechaza una dirección sin verificar, y hasta ahora la única instrucción
// era «busca el correo» para un mensaje que pudo llegar hace días.
export function ResendConfirmation() {
  const [state, action, pending] = useActionState<WeFunnelSavedState, FormData>(
    weFunnelResendConfirmation,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? "Mandando…" : "Mandarme el enlace otra vez"}
      </button>
      <Result state={state} />
    </form>
  );
}
