import type { Metadata } from "next";
import type { ReactNode } from "react";

import { WF_FONT } from "@/components/wefunnels/brand";

export const metadata: Metadata = {
  title: "WeFunnels",
  robots: { index: false, follow: false },
};

// WeFunnels pages that need the main host (auth lives here, not on the
// subdomain where strangers publish): registration and the buyer entry.
export default function WeFunnelsAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-[#050913] text-[#f2f6ff] [color-scheme:dark]" style={{ fontFamily: WF_FONT }}>
      {children}
    </div>
  );
}
