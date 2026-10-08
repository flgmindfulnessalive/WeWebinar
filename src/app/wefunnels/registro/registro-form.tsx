"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { FIELD, Kicker, LABEL, PRIMARY_BUTTON } from "@/components/wefunnels/brand";
import { useTurnstile } from "@/hooks/use-turnstile";
import { signUpForWeFunnels, type WeFunnelSignupState } from "@/lib/actions/wefunnel-signup";
import { proposeSlug } from "@/lib/wefunnels/slug";

function Submit({ label, blocked }: { label: string; blocked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || blocked} className={`${PRIMARY_BUTTON} w-full`}>
      {pending ? "Creando tu cuenta…" : label} {!pending && <span aria-hidden="true">→</span>}
    </button>
  );
}

export function RegistroForm({
  giftSlug,
  isBuyer,
  wefunnelsHost,
  termsUrl,
  privacyUrl,
  loginHref,
  turnstileSiteKey,
}: {
  giftSlug: string | null;
  isBuyer: boolean;
  wefunnelsHost: string;
  termsUrl: string;
  privacyUrl: string;
  loginHref: string;
  turnstileSiteKey: string | undefined;
}) {
  const [state, formAction] = useActionState<WeFunnelSignupState, FormData>(signUpForWeFunnels, null);
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { containerRef, token } = useTurnstile(turnstileSiteKey);

  if (state && "checkEmail" in state) {
    return (
      <div role="status" aria-live="polite">
        <Kicker>Último paso</Kicker>
        <h1 className="mt-2 mb-3 text-[28px] leading-tight font-bold tracking-[-1px]">Revisa tu email</h1>
        <p className="text-[15px] leading-relaxed text-[#b5c5da]">
          Enviamos un enlace de confirmación a <strong className="text-[#e9f2ff]">{state.email}</strong>.
          Ábrelo para entrar a tu panel
          {isBuyer ? " y continuar con la activación." : ", donde ya estará tu funnel en borrador."}
        </p>
        <p className="text-[13px] leading-relaxed text-[#a9bcd5]">
          Si no lo ves en unos minutos, revisa la carpeta de spam. Si ya tenías una cuenta con este
          email, <Link href={loginHref} className="text-[#83e4ee] underline underline-offset-4">inicia sesión</Link>.
        </p>
      </div>
    );
  }

  const suggested = proposeSlug(name);

  return (
    <>
      <Kicker>{isBuyer ? "Licencia Distribuidor" : "Gratis de por vida · Sin tarjeta"}</Kicker>
      <h1 className="mt-2 mb-2.5 text-[28px] leading-[1.15] font-bold tracking-[-1px] sm:text-[30px]">
        {isBuyer ? "Crea tu cuenta" : "Crea tu cuenta gratis"}
      </h1>
      <p className="mb-6 text-[13px] text-[#b5c5da]">
        {isBuyer
          ? "Después activarás tu licencia y crearás tu página de regalo."
          : "Después podrás personalizar y publicar tu página."}
      </p>

      <form action={formAction}>
        {giftSlug && <input type="hidden" name="de" value={giftSlug} />}
        {isBuyer && <input type="hidden" name="plan" value="distribuidor" />}

        <div className="mb-4">
          <label htmlFor="ws-name" className={LABEL}>Tu nombre</label>
          <input
            id="ws-name"
            name="name"
            required
            maxLength={80}
            autoComplete="name"
            placeholder="Tu nombre y apellido"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="ws-email" className={LABEL}>Email</label>
          <input id="ws-email" name="email" type="email" required autoComplete="email" placeholder="tu@email.com" className={FIELD} />
        </div>

        <div className="mb-4">
          <label htmlFor="ws-pass" className={LABEL}>Contraseña</label>
          <div className="flex items-center rounded-lg border border-[#40516b] bg-[#070e1a] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#53dfe9]">
            <input
              id="ws-pass"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Crea una contraseña"
              aria-describedby="ws-pass-hint"
              className="min-h-[48px] min-w-0 flex-1 border-0 bg-transparent px-3 text-[16px] text-[#f5f8ff] outline-none placeholder:text-[#8fa3bd]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              className="min-h-[46px] px-3 text-[13px] text-[#7de6ee]"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <p id="ws-pass-hint" className="mt-1.5 mb-0 text-[12px] text-[#abbed5]">Usa al menos 8 caracteres.</p>
        </div>

        {!isBuyer && (
          <div className="mt-1 mb-5 rounded-lg bg-[#142133] px-4 py-3">
            <small className="block text-[11px] text-[#acbdd5]">Tu enlace sugerido</small>
            <span className="mt-1 block text-[13px] break-all text-[#d6edff]">
              {wefunnelsHost}/<b>{suggested || "tu-nombre"}</b>
            </span>
            <p className="mt-1.5 mb-0 text-[12px] text-[#abbed5]">
              Podrás editarlo antes de publicar. Si ya está en uso, te proponemos uno parecido.
            </p>
          </div>
        )}

        {turnstileSiteKey && <div ref={containerRef} className="mb-4" />}

        {state && "error" in state && (
          <p role="alert" className="mb-4 text-[14px] leading-relaxed text-[#ffb4b4]">{state.error}</p>
        )}

        <Submit
          label={isBuyer ? "Crear mi cuenta" : "Crear mi cuenta gratis"}
          blocked={Boolean(turnstileSiteKey) && !token}
        />

        <p className="my-4 text-[12px] leading-relaxed text-[#afc0d6]">
          Al crear tu cuenta, aceptas los{" "}
          <a href={termsUrl} className="text-[#83e4ee] underline underline-offset-4">Términos de uso</a> y
          confirmas que has leído la{" "}
          <a href={privacyUrl} className="text-[#83e4ee] underline underline-offset-4">Política de privacidad</a>.
        </p>
      </form>

      <p className="mt-4 border-t border-[#28364b] pt-4 text-center text-[13px] text-[#b4c5db]">
        ¿Ya tienes cuenta?{" "}
        <Link href={loginHref} className="text-[#83e4ee] underline underline-offset-4">Inicia sesión</Link>
      </p>
    </>
  );
}
