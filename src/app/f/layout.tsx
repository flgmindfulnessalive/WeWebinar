import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import "./wefunnels.css";

// WeFunnels has its own type system, separate from the app shell's Geist:
// Archivo is the closest grotesque to the wordmark, and the mono is there
// for one thing only -- the address with the person's name in it, which is
// the product's whole motif.
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
      className={`wf ${archivo.variable} ${plexMono.variable} min-h-screen`}
      style={{
        fontFamily: "var(--font-wefunnels), system-ui, sans-serif",
        // The approved ground: very dark blue, near black, not black. Set
        // here so every surface under /f shares it -- the official web, a
        // distributor's gift page and somebody's personal funnel are one
        // family, and a page that was pure black read as a different
        // product sitting next to the other two.
        background: "#050913",
        color: "#EDF4FF",
      }}
    >
      {children}
    </div>
  );
}
