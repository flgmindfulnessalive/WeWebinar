import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Logo, WF_FONT } from "@/components/wefunnels/brand";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { countLeads } from "@/lib/wefunnels/counts";
import { signOut } from "@/lib/actions/auth";
import { PanelNav } from "./panel-nav";

export const metadata: Metadata = {
  title: "WeFunnels",
  robots: { index: false, follow: false },
};

// The WeFunnels panel is its own shell, not a section of the WeWebinars
// dashboard. It lives on the main host (auth lives there); the WeFunnels
// subdomain only serves public pages.
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const viewer = await getPanelViewer();

  if (!viewer) {
    redirect("/login?next=/panel");
  }

  const leadCount = viewer.site ? await countLeads(viewer.site.id) : 0;
  const name = viewer.site?.display_name || viewer.fullName || viewer.email;

  return (
    <div className="min-h-svh bg-[#070d18] text-[#edf5ff] [color-scheme:dark]" style={{ fontFamily: WF_FONT }}>
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-[#25354b] px-4 py-4 sm:px-[4%]">
        <Link href="/panel" className="no-underline" aria-label="WeFunnels, ir a mi panel">
          <Logo size="sm" />
        </Link>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#bacde4]">
          <span className="max-w-[220px] truncate">{name}</span>
          <span className="rounded-[5px] bg-[#193a3c] px-2 py-1 text-[11px] text-[#a0f0df]">
            {viewer.isDistributor ? "Distribuidor" : "Cuenta gratuita"}
          </span>
          <form action={signOut}>
            <button type="submit" className="min-h-[36px] text-[12px] text-[#9fb6d0] underline-offset-4 hover:underline">
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className="grid min-h-[calc(100svh-70px)] md:grid-cols-[190px_minmax(0,1fr)]">
        <PanelNav hasSite={Boolean(viewer.site)} leadCount={leadCount} isDistributor={viewer.isDistributor} />
        <main className="min-w-0 px-4 py-6 sm:px-7 sm:py-7">{children}</main>
      </div>
    </div>
  );
}
