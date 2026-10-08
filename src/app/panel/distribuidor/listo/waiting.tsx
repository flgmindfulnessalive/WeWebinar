"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// The licence arrives by webhook, so returning from Whop can land here
// before it has. This refreshes the screen until it does, with a ceiling:
// after that the page says what to do instead of spinning forever, because
// a webhook that never arrives is our problem to look at, not something to
// hide behind an animation.
const EVERY_MS = 3000;
const CEILING = 20;

export function WaitingForLicence() {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= CEILING) return;
    const timer = setTimeout(() => {
      setTries((previous) => previous + 1);
      router.refresh();
    }, EVERY_MS);
    return () => clearTimeout(timer);
  }, [tries, router]);

  const gaveUp = tries >= CEILING;

  return (
    <div className="flex max-w-[620px] flex-col gap-4 rounded-[16px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(20px,3vw,30px)]">
      <p className="m-0 text-[11px] font-bold tracking-[0.155em] text-[#70E9EF] uppercase">
        {gaveUp ? "Tarda más de lo normal" : "Confirmando tu pago"}
      </p>
      <h1 className="m-0 text-[clamp(24px,3.6vw,30px)] leading-tight font-extrabold tracking-[-0.03em] text-[#F3F7FF]">
        {gaveUp ? "Seguimos esperando la confirmación" : "Un momento"}
      </h1>
      {gaveUp ? (
        <>
          <p className="m-0 text-[15px] leading-relaxed text-[#B7C7DC]">
            Tu pago puede estar cobrado y la activación todavía en camino. No vuelvas a
            pagar: escríbenos y lo revisamos nosotros.
          </p>
          <p className="m-0 text-sm leading-relaxed text-[#8498B4]">
            Si ya tienes tu funnel, puedes seguir usándolo mientras tanto. Nada de lo que
            tenías se toca.
          </p>
        </>
      ) : (
        <>
          <p className="m-0 text-[15px] leading-relaxed text-[#B7C7DC]">
            Estamos confirmando tu pago con la pasarela. Esta pantalla se actualiza sola —
            no hace falta recargar ni volver a pagar.
          </p>
          <div
            className="h-1 overflow-hidden rounded-full bg-[#1C2A3F]"
            role="progressbar"
            aria-label="Confirmando tu pago"
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF]" />
          </div>
        </>
      )}
    </div>
  );
}
