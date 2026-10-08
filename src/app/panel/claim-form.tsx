"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { FIELD, Kicker, LABEL, PRIMARY_BUTTON } from "@/components/wefunnels/brand";
import { claimWeFunnelSite, type ClaimState } from "@/lib/actions/wefunnel-site";
import { normalizeSlug, proposeSlug } from "@/lib/wefunnels/slug";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON} self-start`}>
      {pending ? "Creando…" : label}
    </button>
  );
}

// Creates the page: for an active Distributor (no invitation needed) and
// for the legacy invitation-cookie path. New invited users never see this:
// their page is created automatically from the server-side attribution
// recorded at signup.
export function ClaimForm({
  title,
  intro,
  defaultName = "",
  submitLabel = "Crear mi página",
}: {
  title: string;
  intro: string;
  defaultName?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<ClaimState, FormData>(claimWeFunnelSite, null);
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const effectiveSlug = slugTouched ? slug : proposeSlug(name);

  return (
    <form action={formAction} className="flex max-w-[560px] flex-col gap-5">
      <div>
        <Kicker>Tu página</Kicker>
        <h1 className="mt-2 mb-2 text-[29px] leading-tight font-bold tracking-[-1px]">{title}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-[#afc1d9]">{intro}</p>
      </div>

      <div>
        <label htmlFor="claim-name" className={LABEL}>Nombre público</label>
        <input
          id="claim-name"
          name="displayName"
          type="text"
          required
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="claim-slug" className={LABEL}>Elige tu dirección</label>
        <input
          id="claim-slug"
          name="slug"
          type="text"
          value={effectiveSlug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(normalizeSlug(event.target.value));
          }}
          aria-describedby="claim-slug-help"
          className={FIELD}
        />
        <p id="claim-slug-help" className="mt-1.5 mb-0 text-[12px] break-all text-[#84e1ed]">
          {WEFUNNELS_HOST}/{effectiveSlug || "tu-nombre"}
        </p>
        <p className="mt-1 mb-0 text-[12px] text-[#a8bdd5]">
          Letras minúsculas, números y guiones. Puedes cambiarla hasta que publiques.
        </p>
      </div>

      {state && "error" in state && (
        <p role="alert" className="m-0 text-[14px] text-[#ffb4b4]">{state.error}</p>
      )}

      <Submit label={submitLabel} />
    </form>
  );
}
