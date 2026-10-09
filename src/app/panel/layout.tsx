import { redirect } from "next/navigation";
import Link from "next/link";

import "@/app/f/wefunnels.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import { getPanelViewer } from "@/lib/wefunnels/site";
import { countLeads } from "@/lib/wefunnels/counts";
import { Wordmark } from "@/components/wefunnels/wordmark";
import { PanelNav } from "./panel-nav";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-wefunnels",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-wefunnels-mono",
});

export const metadata: Metadata = {
  title: "WeFunnels",
  robots: { index: false, follow: false },
};

// The WeFunnels panel is its own shell, not a section of the WeWebinars
// dashboard. Four items and nothing else, by design: a free user's whole
// product is a page, a list and the course, and a backoffice with ten
// entries hides the two that matter.
//
// It lives on the main host rather than the WeFunnels subdomain because
// that subdomain rewrites every path onto /f -- which is what keeps auth
// and admin routes from resolving on the host where strangers publish.
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const viewer = await getPanelViewer();

  if (!viewer) {
    redirect("/login?next=/panel");
  }

  const leadCount = viewer.site ? await countLeads(viewer.site.id) : 0;

  return (
    // La clase wf trae la escala tipográfica y los estados de las páginas
    // públicas, y el fondo pasa del negro puro al azul muy oscuro aprobado.
    // Un distribuidor venía de su página de regalo y entraba a algo que
    // parecía un tercer producto: otro fondo, otro acento, otros tamaños.
    //
    // Lo que no viaja hasta aquí son las rejillas ni las apariciones al
    // bajar. Un panel se opera, no se lee de arriba abajo, y animar lo que
    // alguien abre quince veces al día es ruido, no diseño.
    <div
      className={`wf ${archivo.variable} ${plexMono.variable} min-h-svh text-[#F3F7FF]`}
      style={{
        fontFamily: "var(--font-wefunnels), system-ui, sans-serif",
        background: "#050913",
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1B2538] px-5 py-4 sm:px-7">
        <Link href="/panel" className="no-underline">
          <Wordmark size="sm" />
        </Link>
        <span className="truncate text-[length:var(--wf-small)] text-[#8498B4]">
          {viewer.email}
        </span>
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
