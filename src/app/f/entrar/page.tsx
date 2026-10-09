import Link from "next/link";
import type { Metadata } from "next";

import { AccessShell } from "@/components/wefunnels/access-shell";
import { WeFunnelLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar · WeFunnels",
  robots: { index: false, follow: false, nocache: true },
};

// WeFunnels' own door, on WeFunnels' own host.
//
// It used to be /login on the app host: the WeWebinars logo, the WeWebinars
// name and a tagline about webinars, for somebody who bought a funnel. And
// since the WeFunnels subdomain rewrites every path onto /f, there was no
// login on the WeFunnels host at all -- wefunnels.wewebinars.com/entrar and
// /panel both 404'd, so the whole product after the sale lived on the other
// brand's address.
//
// The session behind it is the same one: same Supabase project, same users
// table, same cookie on the registrable domain. What changes is everything
// the person sees.
export default async function WeFunnelLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only ever a panel path. The value arrives in a query string, which means
  // anybody can write it, and it ends up in a redirect after a successful
  // sign-in -- so the action re-checks it as well.
  const destination =
    next?.startsWith("/panel") && !next.startsWith("//") ? next : "/panel";

  return (
    <AccessShell
      title="Entra a tu panel"
      intro="Tu funnel, tus registros y tu curso."
      footer={
        <>
          <p className="m-0">
            ¿Todavía no tienes cuenta? Las páginas de WeFunnels no se piden: te las regala
            un distribuidor.{" "}
            <Link href="/registro" className="font-semibold text-[#43E2EE] no-underline">
              Tengo un enlace de regalo
            </Link>
            .
          </p>
          <p className="m-0 mt-2.5">
            ¿Quieres repartir funnels sin límite?{" "}
            <Link href="/" className="font-semibold text-[#43E2EE] no-underline">
              Mira la licencia Distribuidor
            </Link>
            .
          </p>
        </>
      }
    >
      <WeFunnelLoginForm next={destination} />
    </AccessShell>
  );
}
