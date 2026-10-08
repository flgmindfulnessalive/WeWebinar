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
      className="inline-flex min-h-[52px] items-center justify-center rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-6 py-4 text-[16px] font-bold text-[#071521] disabled:opacity-60"
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
        <label className="block text-[13px] font-semibold text-[#D2DFEF]" htmlFor="ap-name">
          Tu nombre público
        </label>
        <input
          id="ap-name"
          name="displayName"
          required
          maxLength={60}
          autoComplete="name"
          placeholder="Ej.: Lucía Pérez"
          className="mt-2 w-full rounded-[10px] border border-[#2D3E57] bg-[#0B1423] px-3.5 py-3 text-[15px] text-[#F3F7FF] outline-none placeholder:text-[#5E7290] focus-visible:border-[#43E2EE]"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-[#D2DFEF]" htmlFor="ap-slug">
          Tu dirección
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-1 rounded-[10px] border border-[#2D3E57] bg-[#0B1423] px-3.5 py-2.5">
          <span
            className="text-[13px] text-[#5E7290]"
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
            className="min-w-[8ch] flex-1 bg-transparent text-[15px] text-[#43E2EE] outline-none"
            style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
            value={value}
            onChange={(event) => {
              setEdited(true);
              setSlug(event.target.value);
            }}
          />
        </div>
        <p className="m-0 mt-1.5 text-xs leading-relaxed text-[#8498B4]">
          Letras minúsculas, números y guiones. Se propone desde tu nombre; cámbiala si
          quieres. Una vez publicada ya no cambia.
        </p>
      </div>

      {state && "error" in state && (
        <p className="m-0 text-sm leading-relaxed text-[#FF8A8A]" role="alert">
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  );
}
