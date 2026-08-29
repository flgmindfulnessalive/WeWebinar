import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
