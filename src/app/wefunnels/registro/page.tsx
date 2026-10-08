import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartNoAxesCombined, PanelTop, Play } from "lucide-react";

import { Avatar, Kicker, PublicHeader, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/wefunnels/brand";
import { createClient } from "@/lib/supabase/server";
import { claimGiftAsSignedIn } from "@/lib/actions/wefunnel-signup";
import { normalizeSlug } from "@/lib/wefunnels/slug";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { privacyUrl, termsUrl } from "@/lib/wefunnels/legal";
import { PUBLIC_PRICE_LABEL } from "@/lib/wefunnels/pricing";
import { RegistroForm } from "./registro-form";

export const metadata: Metadata = { title: "Crea tu cuenta gratis — WeFunnels" };

const BENEFITS = [
  { Icon: PanelTop, title: "Tu funnel personal", body: "Con tu nombre, tu propuesta y tu enlace." },
  { Icon: ChartNoAxesCombined, title: "Tu panel de prospectos", body: "Visitas, registros y conversión en un solo lugar." },
  { Icon: Play, title: "Tu curso incluido", body: "Cómo NUNCA quedarte sin prospectos." },
];

type SearchParams = Promise<{ de?: string; plan?: string }>;

export default async function WeFunnelsRegistroPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const isBuyer = params.plan === "distribuidor";
  const giftSlug = normalizeSlug(params.de ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isBuyer && user) redirect("/panel/distribuidor");

  // Who is giving the funnel. Checked on the server; an invalid or retired
  // link says so instead of creating an account that cannot get a page.
  let referrer: { slug: string; display_name: string; photo_url: string | null } | null = null;
  if (!isBuyer && giftSlug) {
    const { data: siteId } = await supabase.rpc("wefunnel_gift_referrer", { p_slug: giftSlug });
    if (siteId) {
      const { data } = await supabase
        .from("wefunnel_sites")
        .select("slug, display_name, photo_url")
        .eq("id", siteId)
        .maybeSingle();
      referrer = data ?? null;
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(isBuyer ? "/panel/distribuidor" : "/panel")}`;

  if (!isBuyer && !referrer) {
    return (
      <>
        <PublicHeader right={<span className="text-[11px] tracking-[1.4px] text-[#adc0d6]">POR WEWEBINARS</span>} />
        <main className="mx-auto max-w-[560px] px-5 py-16">
          <Kicker>Tu funnel gratuito</Kicker>
          <h1 className="mt-3 mb-4 text-[30px] leading-tight font-bold tracking-[-1px]">
            El regalo se recibe a través de un Distribuidor
          </h1>
          <p className="text-[16px] leading-relaxed text-[#b6c5dc]">
            Abre el enlace de la página de regalo que te compartieron. Si el enlace ya no funciona,
            pide a esa persona su enlace actual.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={`https://${WEFUNNELS_HOST}/`} className={SECONDARY_BUTTON}>Conocer WeFunnels</a>
            <Link href={loginHref} className={SECONDARY_BUTTON}>Iniciar sesión</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PublicHeader right={<span className="text-[11px] tracking-[1.4px] text-[#adc0d6]">POR WEWEBINARS</span>} />
      <main className="grid items-center gap-8 bg-[radial-gradient(ellipse_at_0_90%,#14395344,transparent_55%)] px-4 py-8 sm:px-[6%] sm:py-12 md:grid-cols-[1fr_1.08fr] md:gap-14">
        <section>
          <Kicker>{isBuyer ? "Licencia Distribuidor" : "Tu regalo empieza aquí"}</Kicker>
          <h2 className="mt-3 mb-4 text-[31px] leading-[1.12] font-bold tracking-[-1.2px] sm:text-[43px] sm:tracking-[-1.7px]">
            {isBuyer ? (
              <>
                Primero, tu cuenta.
                <br />
                <span className="text-[#78d8ff]">Después, tu licencia.</span>
              </>
            ) : (
              <>
                Tu funnel.
                <br />
                Tu panel.
                <br />
                <span className="text-[#78d8ff]">Tu próximo paso.</span>
              </>
            )}
          </h2>
          <p className="mb-5 text-[15px] text-[#b6c5dc] sm:text-[16px]">
            {isBuyer
              ? `Crea tu cuenta y continúa a la activación de la licencia Distribuidor: ${PUBLIC_PRICE_LABEL}, pago único.`
              : "Todo lo que recibes para empezar a prospectar con tu propio enlace."}
          </p>
          {!isBuyer &&
            BENEFITS.map(({ Icon, title, body }) => (
              <div key={title} className="my-3.5 flex items-start gap-3">
                <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-[#132c38] text-[#67e7ef]">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <strong className="text-[14px]">{title}</strong>
                  <p className="mt-0.5 mb-0 text-[13px] text-[#a9bcd5]">{body}</p>
                </div>
              </div>
            ))}
          {referrer && (
            <div className="mt-6 flex items-center gap-3 border-t border-[#26354a] pt-5">
              <Avatar name={referrer.display_name} photoUrl={referrer.photo_url} size={40} />
              <div>
                <small className="text-[11px] text-[#acbdd2]">Recibes este regalo de</small>
                <strong className="block text-[14px]">{referrer.display_name}</strong>
              </div>
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-[#2d3b52] bg-[#0e1726] p-5 shadow-[0_20px_60px_#0004] sm:p-8">
          {user ? (
            <div>
              <Kicker>Ya tienes una sesión abierta</Kicker>
              <h1 className="mt-2 mb-2.5 text-[28px] leading-tight font-bold tracking-[-1px]">
                Recibe tu funnel con esta cuenta
              </h1>
              <p className="mb-5 text-[14px] text-[#b5c5da]">
                Entraste como <strong className="text-[#e9f2ff]">{user.email}</strong>. No necesitas
                crear otra cuenta.
              </p>
              <form action={claimGiftAsSignedIn}>
                <input type="hidden" name="de" value={referrer?.slug ?? ""} />
                <button type="submit" className={`${PRIMARY_BUTTON} w-full`}>
                  Continuar con esta cuenta <span aria-hidden="true">→</span>
                </button>
              </form>
            </div>
          ) : (
            <RegistroForm
              giftSlug={referrer?.slug ?? null}
              isBuyer={isBuyer}
              wefunnelsHost={WEFUNNELS_HOST}
              termsUrl={termsUrl()}
              privacyUrl={privacyUrl()}
              loginHref={loginHref}
              turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            />
          )}
        </section>
      </main>
      <footer className="border-t border-[#202c3f] px-4 py-3 text-[11px] text-[#a5b7ce] sm:px-[6%]">
        WeFunnels · Una solución de WeWebinars
      </footer>
    </>
  );
}
