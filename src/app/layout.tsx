import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WhopPixel } from "@/components/whop-pixel";
import { GrowthBeacon } from "@/components/growth-beacon";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription = "Plataforma de webinars evergreen para vender tus productos.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://wewebinars.com"),
  title: "WeWebinars",
  description: siteDescription,
  // Las etiquetas de verificación de propiedad del dominio. Públicas por
  // diseño, igual que el business id del píxel de Whop: su sitio es el
  // HTML de la propia página, que es donde el verificador las busca.
  //
  // La de Google viaja en una variable de entorno y solo se dibuja cuando
  // está puesta --- antes que dibujar una etiqueta vacía, no se dibuja
  // ninguna. La de WeAudit va escrita aquí porque su valor ya lo tenemos y
  // no cambia: con un literal no existe el caso de la etiqueta vacía que
  // motivó lo otro, y así no hace falta tocar Vercel para que empiece a
  // salir.
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    other: {
      "weaudit-site-verification": "HVLk8kvraZkSUC-42waGe2WfhQWjrTD3X9VWGqaIpy8",
    },
  },
  openGraph: {
    title: "WeWebinars",
    description: siteDescription,
    siteName: "WeWebinars",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WeWebinars",
    description: siteDescription,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Deliberately not locale-aware: this is the one root layout for the
  // whole app (Next.js allows only a single <html> tag), so reading the
  // resolved locale here (getLocale()) would pull in a dynamic API and
  // force every route -- including pages with nothing to translate yet --
  // out of static rendering. "es" matches the site's actual default
  // language (this was previously hardcoded to "en", which was wrong).
  // The English marketing pages (/en/...) will report lang="es" here
  // until this gets a proper per-locale-root restructuring.
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WhopPixel />
        <GrowthBeacon />
        {children}
      </body>
    </html>
  );
}
