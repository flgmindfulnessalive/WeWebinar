"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FIELD, SECONDARY_BUTTON } from "@/components/wefunnels/brand";
import { requestOrientation, type OrientationState } from "@/lib/actions/wefunnel-site";

function Submit({ first }: { first: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={SECONDARY_BUTTON}>
      {pending ? "Enviando…" : `Solicitar orientación de ${first}`}
    </button>
  );
}

// Permission to contact, made explicit. The Distributor who gave the funnel
// learns this person's name and email only if they send this; nothing else
// about the account -- and never its prospects -- is shared.
export function OrientationRequest({
  referrerName,
  alreadyRequested,
}: {
  referrerName: string;
  alreadyRequested: string | null;
}) {
  const [state, action] = useActionState<OrientationState, FormData>(requestOrientation, null);
  const first = referrerName.split(/\s+/)[0] ?? referrerName;

  if (alreadyRequested || (state && "success" in state)) {
    return (
      <div role="status">
        <h2 className="mt-0 mb-1.5 text-[17px] font-bold">Solicitud enviada</h2>
        <p className="m-0 text-[13px] text-[#afc1d9]">
          {first} recibió tu nombre y tu email para orientarte
          {alreadyRequested ? ` (el ${alreadyRequested})` : ""}.
        </p>
      </div>
    );
  }

  return (
    <form action={action}>
      <h2 className="mt-0 mb-1.5 text-[17px] font-bold">¿Quieres orientación de {first}?</h2>
      <p className="mb-3 text-[13px] text-[#afc1d9]">
        Es opcional. Si la solicitas, {first} recibirá tu nombre y tu email para contactarte. No verá
        a las personas que se registren en tu página.
      </p>
      <label htmlFor="orientation-message" className="mb-1.5 block text-[12px] text-[#e2edfc]">
        Mensaje · opcional
      </label>
      <textarea id="orientation-message" name="message" rows={2} maxLength={600} className={`${FIELD} mb-3 min-h-[70px]`} />
      {state && "error" in state && <p role="alert" className="mt-0 mb-3 text-[13px] text-[#ffb4b4]">{state.error}</p>}
      <Submit first={first} />
    </form>
  );
}
