import { redirect } from "next/navigation";
import Link from "next/link";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getPanelViewer } from "@/lib/wefunnels/site";
import { countLeads } from "@/lib/wefunnels/counts";
import { Wordmark } from "@/components/wefunnels/wordmark";
import { PanelNav } from "./panel-nav";
import { AccountMenu } from "./account-menu";

export const metadata: Metadata = {
  title: "WeFunnels",
  robots: { index: false, follow: false },
};

// El panel de WeFunnels: su propio sitio, no una sección del panel de
// WeWebinars. Cuatro entradas y nada más, a propósito: todo el producto de
// un usuario gratuito es una página, una lista y el curso, y un backoffice
// con diez entradas esconde las dos que importan.
//
// Vive bajo /f como el resto de WeFunnels, así que sale en
// wefunnels.wewebinars.com/panel. Antes estaba en el host de la app, donde
// la dirección decía WeWebinars mientras el contenido decía WeFunnels --
// y en el host de WeFunnels devolvía 404, porque el subdominio reescribe
// todo sobre /f. El proxy manda aquí las dos direcciones, así que ningún
// enlace antiguo se rompe.
//
// La tipografía, el fondo y la escala los trae el layout de /f. Lo que no
// viaja hasta aquí son las rejillas ni las apariciones al bajar: un panel se
// opera, no se lee de arriba abajo, y animar lo que alguien abre quince
// veces al día es ruido, no diseño.
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const viewer = await getPanelViewer();

  if (!viewer) {
    redirect("/entrar?next=/panel");
  }

  const leadCount = viewer.site ? await countLeads(viewer.site.id) : 0;

  return (
    <div className="min-h-svh text-[#F3F7FF]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1B2538] px-5 py-4 sm:px-7">
        <Link href="/panel" className="wf-home no-underline">
          <Wordmark size="sm" />
        </Link>
        <AccountMenu
          email={viewer.email}
          name={viewer.displayName}
          photoUrl={viewer.site?.photo_url ?? null}
        />
      </header>

      <div className="flex flex-wrap items-start gap-5 px-5 py-7 sm:gap-7 sm:px-7">
        <PanelNav
          hasSite={Boolean(viewer.site)}
          leadCount={leadCount}
          isDistributor={Boolean(viewer.distributor)}
        />
        <div className="min-w-0 flex-[999_1_620px]">{children}</div>
      </div>
    </div>
  );
}
