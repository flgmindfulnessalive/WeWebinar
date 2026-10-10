"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { claimWeFunnelSite, type ClaimState } from "@/lib/actions/wefunnel-site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { proposeSlug } from "@/lib/wefunnels/slug";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="wf-cta inline-flex min-h-[52px] items-center justify-center rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-6 py-4 text-[16px] font-bold text-[var(--wf-on-cta)] disabled:opacity-60"
    >
      {pending ? "Reservando…" : "Reservar mi dirección →"}
    </button>
  );
}

// The address for somebody who bought from the public web. Nobody invited
// them, so there is no name on file from a gift page -- the first field is
// theirs to fill, and the address is proposed from it as they type.
export function AddressPicker({ suggestedFrom }: { suggestedFrom: string }) {
  const [state, action] = useActionState<ClaimState, FormData>(claimWeFunnelSite, null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [edited, setEdited] = useState(false);

  const proposed = proposeSlug(name) || proposeSlug(suggestedFrom.split("@")[0] ?? "") || "";
  const value = edited ? slug : proposed;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label className="block text-[length:var(--wf-small)] font-semibold text-[var(--wf-fg-2)]" htmlFor="ap-name">
          Tu nombre público
        </label>
        <input
          id="ap-name"
          name="displayName"
          required
          maxLength={60}
          autoComplete="name"
          placeholder="Ej.: Lucía Pérez"
          className="mt-2 w-full rounded-[10px] border border-[var(--wf-edge)] bg-[var(--wf-card-2)] px-3.5 py-3 text-[length:var(--wf-body)] text-[var(--wf-fg)] outline-none placeholder:text-[var(--wf-fg-faint)] focus-visible:border-[var(--wf-accent)]"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div>
        <label className="block text-[length:var(--wf-small)] font-semibold text-[var(--wf-fg-2)]" htmlFor="ap-slug">
          Tu dirección
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-1 rounded-[10px] border border-[var(--wf-edge)] bg-[var(--wf-card-2)] px-3.5 py-2.5">
          <span
            className="text-[length:var(--wf-small)] text-[var(--wf-fg-faint)]"
            style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
          >
            {WEFUNNELS_HOST}/
          </span>
          <input
            id="ap-slug"
            name="slug"
            required
            maxLength={32}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className="min-w-[8ch] flex-1 bg-transparent text-[length:var(--wf-body)] text-[var(--wf-accent)] outline-none"
            style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
            value={value}
            onChange={(event) => {
              setEdited(true);
              setSlug(event.target.value);
            }}
          />
        </div>
        <p className="m-0 mt-1.5 text-[length:var(--wf-small)] leading-relaxed text-[var(--wf-fg-muted)]">
          Letras minúsculas, números y guiones. Se propone desde tu nombre; cámbiala si
          quieres. Una vez publicada ya no cambia.
        </p>
      </div>

      {state && "error" in state && (
        <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-danger)]" role="alert">
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  );
}
