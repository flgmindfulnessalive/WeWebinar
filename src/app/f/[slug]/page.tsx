import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WEFUNNELS_HOST, wefunnelAppUrl } from "@/lib/wefunnels/host";
import { LeadForm } from "./lead-form";

type RouteParams = { slug: string };

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

const ACCENTS: Record<string, string> = {
  cyan: "#2BD7F5",
  blue: "#2E63FF",
  violet: "#A855F7",
  pink: "#F0479B",
  green: "#28C98B",
  amber: "#F5A524",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// YouTube and Vimeo are the only two the editor accepts, and the URL is
// re-parsed here rather than trusted as stored: the column holds whatever
// the owner typed, and this is the last place before it becomes an iframe
// src. Anything that doesn't match a known watch URL renders nothing.
function embedUrl(raw: string | null): string | null {
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = parsed.searchParams.get("v");
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "vimeo.com") {
    const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

function Badge({ slug }: { slug?: string }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#1A1A2A] px-6 pt-4 pb-8 text-[13px] text-[#6E7694]">
      <a href={`https://${WEFUNNELS_HOST}`} className="no-underline">
        Creado con <span className="text-[#A9B0C9]">WeFunnels</span> — consigue el tuyo gratis
      </a>
      {/* Stays on this host: the visitor reporting a page should not be
          bounced to another domain mid-decision, and /reportar resolves
          here because a static segment beats [slug] and the name is in the
          reserved list. */}
      <a
        href={slug ? `/reportar?p=${encodeURIComponent(slug)}` : "/reportar"}
        className="text-xs text-[#4A5173] no-underline"
      >
        Reportar
      </a>
    </div>
  );
}

// Shown to anyone who isn't the owner when the page exists but isn't live:
// still a draft, or suspended. The two cases read the same on purpose --
// a moderation decision is not something to broadcast to visitors.
function NotLiveYet() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6">
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-tight">
        Esta página todavía no está publicada
      </h1>
      <p className="mt-3 mb-0 text-[16px] leading-relaxed text-[#A9B0C9]">
        Su dueño aún la está preparando. Vuelve a intentarlo más tarde.
      </p>
      <Badge />
    </main>
  );
}

export default async function WeFunnelSitePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // RLS does the state machine here. An anonymous visitor only ever gets
  // the row back when it is published and unsuspended; a member of the
  // owning account gets it in any state. So if the row came back at all
  // and isn't live, the person looking at it is the owner.
  const { data: site } = await supabase
    .from("wefunnel_sites")
    .select(
      "id, slug, status, display_name, location, headline, bullets, video_url, accent, question_label, suspended_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!site) {
    // Nothing readable. Either the name was never claimed, or it was and
    // the viewer has no business seeing it. Those deserve different pages,
    // and only the service role can tell them apart.
    const admin = createAdminClient();
    const { data: exists } = await admin
      .from("wefunnel_sites")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!exists) notFound();
    return <NotLiveYet />;
  }

  const isLive = site.status === "published" && !site.suspended_at;
  const accent = ACCENTS[site.accent] ?? ACCENTS.cyan;
  const video = embedUrl(site.video_url);
  const bullets = (site.bullets ?? []).filter(Boolean);

  return (
    <main className="mx-auto max-w-[460px] px-6 pb-2">
      {!isLive && (
        <div className="-mx-6 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#A855F7] bg-gradient-to-br from-[#10163A] to-[#250F3D] px-5 py-3.5">
          <div className="min-w-0">
            <p className="m-0 text-xs font-semibold tracking-[0.08em] text-[#E879F9] uppercase">
              {site.suspended_at ? "Suspendida" : "Borrador"}
            </p>
            <p className="m-0 text-[13px] leading-snug text-[#A9B0C9]">
              {site.suspended_at
                ? "Escríbenos para revisarla."
                : "Solo tú la ves así"}
            </p>
          </div>
          {!site.suspended_at && (
            <a
              href={wefunnelAppUrl("/panel")}
              className="rounded-[10px] bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-5 py-3 text-[15px] font-semibold text-white no-underline"
            >
              Publicar
            </a>
          )}
        </div>
      )}

      <div className={isLive ? "" : "opacity-60"}>
        <div className="flex items-center gap-3.5 pt-8">
          <span
            className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] text-[22px] font-bold text-white"
            aria-hidden="true"
          >
            {initials(site.display_name)}
          </span>
          <div className="min-w-0">
            <p className="m-0 text-[18px] font-semibold">{site.display_name}</p>
            {site.location && (
              <p className="m-0 text-sm text-[#6E7694]">{site.location}</p>
            )}
          </div>
        </div>

        {site.headline && (
          <h1 className="mt-5 mb-0 text-[29px] leading-[1.1] font-extrabold tracking-tight text-balance">
            {site.headline}
          </h1>
        )}

        {video && (
          <div className="mt-5 aspect-video overflow-hidden rounded-[14px] border border-[#1A1A2A] bg-[#07070C]">
            <iframe
              src={video}
              title={`Video de ${site.display_name}`}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        )}

        {bullets.length > 0 && (
          <ul className="mt-5 flex list-none flex-col gap-3 p-0">
            {bullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-3">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: accent }}
                  aria-hidden="true"
                />
                <span className="text-[16px] leading-snug text-[#D7DCEC]">{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        <LeadForm
          siteId={site.id}
          ownerName={site.display_name}
          questionLabel={site.question_label}
          disabled={!isLive}
        />
      </div>

      <Badge slug={site.slug} />
    </main>
  );
}
