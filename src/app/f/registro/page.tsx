import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Gift, PanelTop, ChartNoAxesCombined, Play } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { REFERRAL_COOKIE, parseTouch } from "@/lib/wefunnels/referral";
import { Wordmark } from "@/components/wefunnels/wordmark";
import { WeFunnelSignUpForm } from "./signup-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// The gift page's next step, on the same host it came from. Keeping it here
// rather than on the app host means no change of address and no change of
// branding in the middle of accepting a gift -- the one jump this flow used
// to make and the place it lost people.
//
// The three benefits are repeated here, in the same words the gift page
// used, because a form is where somebody asks themselves what they are
// filling it in for.
const BENEFITS = [
  {
    Icon: PanelTop,
    title: "Tu funnel personal",
    body: "Con tu nombre, tu propuesta y tu enlace.",
  },
  {
    Icon: ChartNoAxesCombined,
    title: "Tu panel de prospectos",
    body: "Visitas, registros y conversión en un solo lugar.",
  },
  {
    Icon: Play,
    title: "Tu curso incluido",
    body: "Cómo NUNCA quedarte sin prospectos.",
  },
];

// Lo que compra quien llega por la web oficial. Sin precio: lo decide el
// panel a partir de las filas de referido de la cuenta, y una cifra escrita
// aquí estaría afirmando un derecho que esta pantalla no puede conceder.
const LICENSE = [
  {
    Icon: Gift,
    title: "Tu página de regalo",
    body: "Reparte funnels sin límite, de por vida.",
  },
  {
    Icon: ChartNoAxesCombined,
    title: "Tu panel y tus registros",
    body: "Quién abre tu página y quién se queda.",
  },
  {
    Icon: Play,
    title: "Tu sala del curso",
    body: "Y 2 meses de Starter de WeWebinars incluidos.",
  },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function WeFunnelSignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ compra?: string }>;
}) {
  // ?compra=1 llega desde /comprar, que es donde apunta "Quiero ser
  // Distribuidor" en la web oficial. Cambia las palabras y el destino del
  // correo de confirmación; la cuenta que se crea es la misma.
  const buying = (await searchParams).compra === "1";
  // Who is giving the gift, read from the cookie and confirmed against the
  // database. A slug that no longer resolves, a suspended page or an owner
  // without the licence simply leaves the block out: the screen never names
  // somebody whose invitation would be refused at the claim.
  const touch = parseTouch((await cookies()).get(REFERRAL_COOKIE)?.value);
  let referrer: string | null = null;

  // Quien viene a comprar no está recibiendo un regalo, así que la tarjeta
  // de quien invita no le dice nada. Su precio sigue decidiéndose en el
  // panel con esas mismas filas, que es donde importa.
  if (touch && !buying) {
    const supabase = await createClient();
    const [{ data: open }, { data: site }] = await Promise.all([
      supabase.rpc("wefunnel_invitation_open", { p_slug: touch.slug }),
      supabase
        .from("wefunnel_sites")
        .select("display_name")
        .eq("slug", touch.slug)
        .maybeSingle(),
    ]);
    if (open) referrer = site?.display_name ?? null;
  }

  return (
    <div className="mx-auto max-w-[1060px]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#202A3B] px-[clamp(20px,5vw,34px)] py-5">
        <Wordmark size="sm" />
        <span className="text-[10px] font-bold tracking-[0.14em] text-[#8498B4] uppercase">
          Por WeWebinars
        </span>
      </header>

      <main className="grid items-start gap-[clamp(28px,4vw,46px)] px-[clamp(20px,5vw,34px)] py-[clamp(28px,5vw,52px)] lg:grid-cols-[1fr_1.05fr]">
        <section className="min-w-0">
          <p className="m-0 text-[11px] font-bold tracking-[0.155em] text-[#70E9EF] uppercase">
            {buying ? "Licencia Distribuidor" : "Tu regalo empieza aquí"}
          </p>
          <h2 className="m-0 mt-3.5 text-[clamp(30px,4.6vw,46px)] leading-[1.06] font-extrabold tracking-[-0.04em] text-[#F3F7FF] text-balance">
            {buying ? (
              <>
                Un solo pago.
                <br />
                Regalos ilimitados.
                <br />
                <span className="bg-gradient-to-r from-[#41E5EC] via-[#83B5FF] to-[#BD8BFF] bg-clip-text text-transparent">
                  De por vida.
                </span>
              </>
            ) : (
              <>
                Tu funnel.
                <br />
                Tu panel.
                <br />
                <span className="bg-gradient-to-r from-[#41E5EC] via-[#83B5FF] to-[#BD8BFF] bg-clip-text text-transparent">
                  Tu próximo paso.
                </span>
              </>
            )}
          </h2>
          <p className="m-0 mt-4 max-w-[42ch] text-[15px] leading-relaxed text-[#B7C7DC]">
            {buying
              ? "Primero tu cuenta, después el pago. Todo en tu panel, sin salir de aquí."
              : "Todo lo que recibes para empezar a prospectar con tu propio enlace."}
          </p>

          <div className="mt-7 flex flex-col gap-5">
            {(buying ? LICENSE : BENEFITS).map(({ Icon, title, body }) => (
              <div key={title} className="flex min-w-0 items-start gap-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] border border-[#2D3E57] bg-[#0E192A]">
                  <Icon className="h-[18px] w-[18px] text-[#73E5EC]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <strong className="text-[15px] font-semibold text-[#F3F7FF]">{title}</strong>
                  <p className="m-0 mt-0.5 text-[13px] leading-relaxed text-[#B7C7DC]">{body}</p>
                </div>
              </div>
            ))}
          </div>

          {referrer && (
            <div className="mt-7 flex items-center gap-3.5 rounded-[13px] border border-[#2D3E57] bg-[#0B1423] p-4">
              <span
                className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] text-[13px] font-bold text-white"
                aria-hidden="true"
              >
                {initials(referrer)}
              </span>
              <div className="min-w-0">
                <p className="m-0 text-[11px] tracking-[0.1em] text-[#8498B4] uppercase">
                  Recibes este regalo de
                </p>
                <p className="m-0 text-[16px] font-semibold text-[#F3F7FF]">{referrer}</p>
              </div>
            </div>
          )}
        </section>

        <section className="min-w-0">
          <WeFunnelSignUpForm intent={buying ? "compra" : "regalo"} />
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1B2538] px-[clamp(20px,5vw,34px)] py-5 text-[11px] text-[#8498B4]">
        <span>WeFunnels · Una solución de WeWebinars</span>
        <span>Tu funnel. Tu enlace. Nuevas conversaciones.</span>
      </footer>
    </div>
  );
}
