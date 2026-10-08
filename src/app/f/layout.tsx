import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono } from "next/font/google";

import { WF_FONT } from "@/components/wefunnels/brand";

// The mono is there for one thing only -- an address with a person's name
// in it. Everything else uses the approved designs' type (Arial/Helvetica).
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-wefunnels-mono",
});

// Every page under /f is served from wefunnels.wewebinars.com and is
// deliberately kept out of search engines. Two reasons, both from the
// model: the owner's traffic comes from WhatsApp, Instagram and ads rather
// than Google, so indexing buys them nothing; and thousands of personal
// pages accumulating under a shared registrable domain is exactly how that
// domain earns a spam reputation that would follow the paying product.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function WeFunnelsLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${plexMono.variable} min-h-screen bg-[#050913] text-[#edf4ff] [color-scheme:dark]`}
      style={{ fontFamily: WF_FONT }}
    >
      {children}
    </div>
  );
}
