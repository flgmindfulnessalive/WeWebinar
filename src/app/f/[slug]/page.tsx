import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Avatar, Kicker } from "@/components/wefunnels/brand";
import { VisitBeacon } from "@/components/wefunnels/visit-beacon";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { wefunnelAppUrl } from "@/lib/wefunnels/host";
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

function Footer({ slug }: { slug?: string }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#23334b] px-1 pt-4 pb-8 text-[12px] text-[#9fb3cf]">
      <span>Creado con WeFunnels</span>
      {/* The report link is the only way a visitor can flag an abusive
          page; the shared-domain reputation posture depends on it being on
          every page. It stays on this host. */}
      <a
        href={slug ? `/reportar?p=${encodeURIComponent(slug)}` : "/reportar"}
        className="text-[#8ea3bf] underline-offset-4 hover:underline"
      >
        Reportar
      </a>
    </div>
  );
}

// Shown to anyone who isn't the owner when the page exists but isn't live:
// still a draft, or suspended. The two cases read the same on purpose.
function NotLiveYet() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[440px] flex-col justify-center px-6">
      <h1 className="m-0 text-[26px] leading-tight font-bold tracking-tight text-[#f2f7ff]">
        Esta página todavía no está publicada
      </h1>
      <p className="mt-3 mb-0 text-[16px] leading-relaxed text-[#b4c6dc]">
        Su dueño aún la está preparando. Vuelve a intentarlo más tarde.
      </p>
      <Footer />
    </main>
  );
}

// A free user's personal funnel: wefunnels.wewebinars.com/<slug>
//
// It presents THEIR proposal and captures THEIR prospects. It never offers
// to give funnels away -- that is a Distributor's gift page, at a separate
// address, so an already published personal page is never turned into one.
export default async function WeFunnelSitePage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // RLS does the state machine: an anonymous visitor only gets the row when
  // it is published and unsuspended; a member of the owning account gets
  // it in any state. So a row that came back and isn't live means the
  // person looking at it is the owner.
  const { data: site } = await supabase
    .from("wefunnel_sites")
    .select(
      "id, slug, status, display_name, location, headline, description, photo_url, bullets, video_url, accent, question_label, suspended_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!site) {
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_100%_0,#32225955,transparent_55%),#0a1322]">
      {isLive && <VisitBeacon slug={site.slug} page="funnel" />}
      <main className="mx-auto max-w-[560px] px-5 pb-2 sm:px-6">
        {!isLive && (
          <div className="-mx-5 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#354460] bg-[#151e31] px-5 py-3.5 sm:-mx-6">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-bold tracking-[1.4px] text-[#75e4ef] uppercase">
                {site.suspended_at ? "Suspendida" : "Borrador · No publicada"}
              </p>
              <p className="m-0 text-[13px] leading-snug text-[#c3d2e8]">
                {site.suspended_at ? "Escríbenos para revisarla." : "Solo tú la ves así."}
              </p>
            </div>
            {!site.suspended_at && (
              <a href={wefunnelAppUrl("/panel/personalizar")} className="wf-btn-primary rounded-lg px-4 py-2.5 text-[14px] font-bold no-underline">
                Editar y publicar
              </a>
            )}
          </div>
        )}

        <div className={isLive ? "" : "opacity-70"}>
          <div className="flex items-center gap-3 pt-8">
            <Avatar name={site.display_name} photoUrl={site.photo_url} size={57} />
            <div className="min-w-0">
              <p className="m-0 text-[16px] font-bold text-[#f2f7ff]">{site.display_name}</p>
              {site.location && <p className="m-0 text-[13px] text-[#a8bdd5]">{site.location}</p>}
            </div>
          </div>

          <Kicker className="mt-7">Conoce mi propuesta</Kicker>
          {site.headline && (
            <h1 className="mt-3 mb-0 text-[30px] leading-[1.16] font-bold tracking-[-0.7px] text-balance text-[#f2f7ff]">
              {site.headline}
            </h1>
          )}
          {site.description && (
            <p className="mt-4 mb-0 text-[15px] leading-relaxed whitespace-pre-line text-[#b4c6dc]">
              {site.description}
            </p>
          )}

          {video && (
            <div className="mt-6 aspect-video overflow-hidden rounded-[13px] border border-[#3d526d] bg-[#070d18]">
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
            <ul className="mt-6 flex list-none flex-col gap-3 p-0">
              {bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} aria-hidden="true" />
                  <span className="text-[15px] leading-snug text-[#d7e3f3]">{bullet}</span>
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

        <Footer slug={site.slug} />
      </main>
    </div>
  );
}
