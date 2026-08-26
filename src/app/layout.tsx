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
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
