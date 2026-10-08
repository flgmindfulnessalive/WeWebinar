"use client";

import { useActionState, useState } from "react";

import { useTurnstile } from "@/hooks/use-turnstile";
import { weFunnelSignUp, type WeFunnelSignUpState } from "@/lib/actions/wefunnel-signup";
import { WEFUNNELS_HOST, wefunnelAppUrl } from "@/lib/wefunnels/host";
import { proposeSlug } from "@/lib/wefunnels/slug";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const FIELD =
  "w-full rounded-[10px] border border-[#2D3E57] bg-[#0B1423] px-3.5 py-3 text-[15px] text-[#F3F7FF] outline-none placeholder:text-[#5E7290] focus-visible:border-[#43E2EE] focus-visible:ring-2 focus-visible:ring-[#43E2EE]/30";
const LABEL = "block text-[13px] font-semibold text-[#D2DFEF]";
const HELP = "m-0 mt-1.5 text-xs leading-relaxed text-[#8498B4]";

// Two doors into the same form. "regalo" is somebody accepting a
// distributor's gift; "compra" is somebody buying the licence from the
// official web. Only the words and the destination differ -- the account,
// the validation and the confirmation email are one thing.
export function WeFunnelSignUpForm({ intent = "regalo" }: { intent?: "regalo" | "compra" }) {
  const buying = intent === "compra";
  const [state, formAction, isPending] = useActionState<WeFunnelSignUpState, FormData>(
    weFunnelSignUp,
    null
  );
  const { containerRef: turnstileRef, token: captchaToken } = useTurnstile(TURNSTILE_SITE_KEY);
  const [name, setName] = useState("");
  const [visible, setVisible] = useState(false);

  // The suggestion is informational, exactly as approved: there is no fourth
  // field to fill in. It uses the project's own proposeSlug, which joins the
  // name instead of hyphenating it -- these links get dictated out loud as
  // often as they get clicked.
  const suggestion = proposeSlug(name) || "tunombre";

  if (state && "sent" in state) {
    return (
      <div className="rounded-[15px] border border-[#43E2EE] bg-[#0B1423] p-[clamp(22px,3vw,30px)]">
        <p className="m-0 text-[11px] font-bold tracking-[0.155em] text-[#70E9EF] uppercase">
          Un paso más
        </p>
        <h2 className="m-0 mt-3 text-[clamp(22px,3vw,27px)] leading-tight font-bold tracking-[-0.025em] text-[#F3F7FF]">
          Revisa tu correo
        </h2>
        <p className="m-0 mt-3 text-[15px] leading-relaxed text-[#B7C7DC]">
          Te mandamos un enlace a <strong className="text-[#F3F7FF]">{state.sent}</strong>.
          {buying
            ? " Ábrelo y te llevamos a activar tu licencia Distribuidor."
            : " Ábrelo y tu página queda creada, lista para personalizar."}
        </p>
        <p className={HELP}>
          Si no llega en unos minutos, revisa el correo no deseado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[15px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(22px,3vw,30px)]">
      <p className="m-0 text-[11px] font-bold tracking-[0.155em] text-[#70E9EF] uppercase">
        {buying ? "Paso 1 de 2 · Licencia Distribuidor" : "Gratis de por vida · Sin tarjeta"}
      </p>
      <h1 className="m-0 mt-3 text-[clamp(27px,4vw,36px)] leading-[1.1] font-extrabold tracking-[-0.035em] text-[#F3F7FF]">
        {buying ? "Crea tu cuenta" : "Crea tu cuenta gratis"}
      </h1>
      <p className="m-0 mt-2.5 text-[15px] leading-relaxed text-[#B7C7DC]">
        {buying
          ? "El pago viene después, en tu panel. Aquí todavía no se cobra nada."
          : "Después podrás personalizar y publicar tu página."}
      </p>

      <form id="wf-signup-form" action={formAction} className="mt-6 flex flex-col gap-5">
        {/* Read through a fixed map on the server, never as a path. */}
        <input type="hidden" name="destino" value={buying ? "distribuidor" : "regalo"} />
        <div>
          <label className={LABEL} htmlFor="wf-name">
            Tu nombre
          </label>
          <input
            id="wf-name"
            name="name"
            type="text"
            required
            maxLength={80}
            autoComplete="name"
            placeholder="Ej.: Ana Torres"
            className={`${FIELD} mt-2`}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="wf-email">
            Email
          </label>
          <input
            id="wf-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@email.com"
            className={`${FIELD} mt-2`}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="wf-password">
            Contraseña
          </label>
          <div className="relative mt-2">
            <input
              id="wf-password"
              name="password"
              type={visible ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Crea una contraseña"
              aria-describedby="wf-password-hint"
              className={`${FIELD} pr-[88px]`}
            />
            <button
              type="button"
              onClick={() => setVisible((previous) => !previous)}
              aria-pressed={visible}
              className="absolute inset-y-0 right-0 px-3.5 text-[13px] font-semibold text-[#77E8EF]"
            >
              {visible ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <p className={HELP} id="wf-password-hint">
            Usa al menos 8 caracteres.
          </p>
        </div>

        <div className="rounded-[10px] border border-dashed border-[#2D3E57] bg-[#091221] px-3.5 py-3">
          <p className="m-0 text-[11px] tracking-[0.1em] text-[#8498B4] uppercase">
            Tu enlace sugerido
          </p>
          <p
            className="m-0 mt-1.5 text-[14px] break-all text-[#D2DFEF]"
            style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
          >
            {WEFUNNELS_HOST}/<b className="font-semibold text-[#43E2EE]">{suggestion}</b>
          </p>
          <p className={HELP}>Podrás editarlo antes de publicar.</p>
        </div>

        {TURNSTILE_SITE_KEY && <div ref={turnstileRef} />}

        {state && "error" in state && (
          <p className="m-0 text-sm leading-relaxed text-[#FF9A9A]" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
          className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-6 py-4 text-[16px] font-bold text-[#071521] disabled:opacity-60"
        >
          {isPending
            ? "Creando tu cuenta…"
            : buying
              ? "Crear mi cuenta y continuar →"
              : "Crear mi cuenta gratis →"}
        </button>

        <p className="m-0 text-xs leading-relaxed text-[#8498B4]">
          Al crear tu cuenta, aceptas los{" "}
          <a href={wefunnelAppUrl("/terms")} className="text-[#A9C6E6] underline">
            Términos de uso
          </a>{" "}
          y confirmas que has leído la{" "}
          <a href={wefunnelAppUrl("/privacy")} className="text-[#A9C6E6] underline">
            Política de privacidad
          </a>
          .
        </p>
      </form>

      <p className="m-0 mt-5 border-t border-[#1F2A3C] pt-5 text-sm text-[#B7C7DC]">
        ¿Ya tienes cuenta?{" "}
        <a
          href={wefunnelAppUrl(
            `/login?next=${encodeURIComponent(buying ? "/panel/distribuidor" : "/panel")}`
          )}
          className="font-semibold text-[#43E2EE]"
        >
          Inicia sesión
        </a>
      </p>
    </div>
  );
}
