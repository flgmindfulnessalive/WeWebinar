import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { createClient } from "@/lib/supabase/server";
import { resolveBrandColors } from "@/lib/brand-colors";

// Next.js wires this up automatically for every /w/[accountSlug]/
// [webinarSlug] URL, overriding the generic root opengraph-image.tsx for
// this route segment -- what gets shared to WhatsApp/social is the actual
// webinar's title and the host's own logo/brand colors (Configuración ->
// Marca), not generic WeWebinars branding.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Webinar en WeWebinars";

const TITLE_MAX_LENGTH = 70;

export default async function WebinarOpengraphImage({
  params,
}: {
  params: Promise<{ accountSlug: string; webinarSlug: string }>;
}) {
  const { accountSlug, webinarSlug } = await params;
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("account_public_profile")
    .select("id, name, branding")
    .eq("slug", accountSlug)
    .maybeSingle();

  const { data: webinar } = account
    ? await supabase
        .from("webinars")
        .select("title")
        .eq("account_id", account.id)
        .eq("slug", webinarSlug)
        .eq("status", "published")
        .maybeSingle()
    : { data: null };

  const branding = (account?.branding as Record<string, string | null>) ?? {};
  const { a: brandColorA, b: brandColorB } = resolveBrandColors(branding);
  const accountName = account?.name ?? "WeWebinars";
  const rawTitle = webinar?.title ?? "Webinar en vivo";
  const title =
    rawTitle.length > TITLE_MAX_LENGTH
      ? `${rawTitle.slice(0, TITLE_MAX_LENGTH - 1)}…`
      : rawTitle;
  const logoUrl = branding.logo_url;

  const fontsDir = join(process.cwd(), "src/app/og-fonts");
  const [bold, regular] = await Promise.all([
    readFile(join(fontsDir, "Geist-Bold.ttf")),
    readFile(join(fontsDir, "Geist-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          background: `linear-gradient(135deg, ${brandColorA}, ${brandColorB})`,
          fontFamily: "Geist",
          padding: "70px 90px",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              width={56}
              height={56}
              style={{ borderRadius: 12, objectFit: "contain", background: "#ffffff" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "rgba(255,255,255,0.18)",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {accountName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 28, opacity: 0.9 }}>{accountName} presenta</div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 62,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, opacity: 0.85 }}>
          <div
            style={{
              display: "flex",
              width: 32,
              height: 32,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.18)",
            }}
          >
            <svg width="12" height="14" viewBox="0 0 46 52">
              <polygon points="0,0 46,26 0,52" fill="#ffffff" />
            </svg>
          </div>
          Webinar gratuito · WeWebinars
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: bold, weight: 700, style: "normal" },
        { name: "Geist", data: regular, weight: 400, style: "normal" },
      ],
    }
  );
}
