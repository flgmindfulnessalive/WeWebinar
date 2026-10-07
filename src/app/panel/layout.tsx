import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import { getPanelViewer } from "@/lib/wefunnels/site";
import { countLeads } from "@/lib/wefunnels/counts";
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
    <div
      className={`${archivo.variable} ${plexMono.variable} min-h-svh bg-black text-white`}
      style={{ fontFamily: "var(--font-wefunnels), system-ui, sans-serif" }}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1A1A2A] px-5 py-3.5 sm:px-7">
        <Link href="/panel" className="text-xl font-extrabold tracking-tight text-[#7FC9BE] no-underline">
          WeFunnels
        </Link>
        <span className="truncate text-sm text-[#6E7694]">{viewer.email}</span>
      </header>

      <div className="flex flex-wrap items-start gap-5 px-5 py-6 sm:gap-7 sm:px-7">
        <PanelNav hasSite={Boolean(viewer.site)} leadCount={leadCount} />
        <div className="min-w-0 flex-[999_1_620px]">{children}</div>
      </div>
    </div>
  );
}
