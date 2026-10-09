"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { claimWeFunnelSite, type ClaimState } from "@/lib/actions/wefunnel-site";
import { normalizeSlug, proposeSlug } from "@/lib/wefunnels/slug";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="wf-cta rounded-xl bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-6 py-4 text-[17px] font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Creando…" : "Crear mi página"}
    </button>
  );
}

export function ClaimForm() {
  const [state, formAction] = useActionState<ClaimState, FormData>(claimWeFunnelSite, null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  // Proposed, not asked for: the address follows the name as it is typed
  // until the person edits it themselves, and from then on it is theirs.
  const effectiveSlug = slugTouched ? slug : proposeSlug(name);

  return (
    <form action={formAction} className="flex max-w-[560px] flex-col gap-6">
      <div>
        <h1 className="m-0 text-[32px] leading-tight font-extrabold tracking-tight">
          Crea tu página
        </h1>
        <p className="mt-2 mb-0 text-[16px] leading-relaxed text-[#C1D1E6]">
          Tu nombre y tu dirección. Lo demás lo llenas después, y nada se publica hasta
          que tú lo digas.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="claim-name" className="text-[length:var(--wf-small)] font-semibold text-[#C1D1E6]">
          Tu nombre
        </label>
        <input
          id="claim-name"
          name="displayName"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Carlos Medina"
          className="w-full rounded-[10px] border border-[#2D3E57] bg-[#0E192A] px-3.5 py-3.5 text-[16px] text-white outline-none focus-visible:border-[#43E2EE]"
        />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[#2D3E57] bg-[#0E192A] p-4">
        <label htmlFor="claim-slug" className="text-[length:var(--wf-small)] font-semibold tracking-[0.08em] text-[#8498B4] uppercase">
          Tu dirección
        </label>
        <div
          className="text-[length:var(--wf-body)] break-all text-[#8498B4]"
          style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
        >
          {WEFUNNELS_HOST}/<span className="font-medium text-[#43E2EE]">{effectiveSlug || "tunombre"}</span>
        </div>
        <input
          id="claim-slug"
          name="slug"
          type="text"
          value={effectiveSlug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(normalizeSlug(event.target.value));
          }}
          className="w-full rounded-[10px] border border-[#2D3E57] bg-[#050509] px-3 py-3 text-[length:var(--wf-body)] text-white outline-none focus-visible:border-[#43E2EE]"
          style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
        />
        <p className="m-0 text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]">
          Puedes cambiarla hasta que publiques. Después queda fija, porque un enlace que
          ya circuló no puede llevar a otra persona.
        </p>
      </div>

      {state && "error" in state && (
        <p role="alert" className="m-0 text-[length:var(--wf-body)] text-[#FF8A8A]">
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  );
}
