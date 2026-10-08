import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { courseTemplateWebinarId } from "@/lib/wefunnels/course-room";
import { CountVisit } from "@/components/wefunnels/count-visit";

type RouteParams = { slug: string };

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// The distributor's course room: wefunnels.wewebinars.com/<slug>/curso.
//
// It is the second of the two links the course itself tells a distributor
// to keep straight -- the personal funnel presents them, this one hands out
// the product -- and it only resolves for an account that bought the tier.
// For everyone else the address does not exist, which is the honest answer:
// a page that said "this person is not a distributor" would leak somebody
// else's billing state to anyone who guessed a slug.
const GETS = [
  {
    n: "01",
    title: "Tu página personal",
    body: "Tu foto, tu propuesta y un formulario.",
  },
  {
    n: "02",
    title: "Tu lista de contactos",
    body: "Los datos de quienes quieren saber más. Tú haces el seguimiento.",
  },
  {
    n: "03",
    title: "El curso completo",
    body: "Aprende a atraer personas y abrir conversaciones.",
  },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function WeFunnelCourseRoomPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;

  // Same anonymous read as the funnel page: RLS hands back the row only
  // when it is published and unsuspended, so a draft or a suspended page
  // cannot be used as a distribution front.
  const supabase = await createClient();
  const { data: site } = await supabase
    .from("wefunnel_sites")
    .select("id, slug, account_id, display_name, location")
    .eq("slug", slug)
    .maybeSingle();

  if (!site) notFound();

  // The entitlement. Service role: wefunnel_distributors is readable only
  // by its own account, and a visitor is nobody here.
  const admin = createAdminClient();
  const { data: distributor } = await admin
    .from("wefunnel_distributors")
    .select("account_id")
    .eq("account_id", site.account_id)
    .maybeSingle();

  if (!distributor) notFound();

  // There is one course room, shared, and the link into it goes through
  // ./ver so the referral is stamped before the visitor leaves this host
  // (see 20261007000009). Null only while the course has not been
  // recorded, which the copy below reads as "coming" rather than as a
  // failure -- the claim is the conversion either way.
  const hasCourse = Boolean(courseTemplateWebinarId());
  const courseUrl = `/${site.slug}/curso/ver`;

  // Through /r/<slug> rather than straight to the offer, exactly like the
  // badge: that route stamps the touch before redirecting, so whoever
  // claims a funnel from this room is credited to this distributor.
  const claimUrl = `/r/${site.slug}`;

  return (
    <main className="mx-auto max-w-[560px] px-6 pb-2">
      {/* The top of the gift funnel. A beacon rather than a write during
          render, so the owner's own reloads and every crawler stay out of
          the number (see lib/wefunnels/visits.ts). */}
      <CountVisit slug={site.slug} surface="gift" />
      <section className="flex flex-col gap-6 pt-10">
        <div className="flex items-center gap-3.5">
          <span
            className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] text-[19px] font-bold text-white"
            aria-hidden="true"
          >
            {initials(site.display_name)}
          </span>
          <div className="min-w-0">
            <p className="m-0 text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
              Te invita
            </p>
            <p className="m-0 text-[17px] font-semibold">{site.display_name}</p>
          </div>
        </div>

        <div>
          <h1 className="m-0 text-[clamp(30px,7vw,40px)] leading-[1.08] font-extrabold tracking-tight text-balance">
            Te regalo tu funnel gratis de por vida.
          </h1>
          <p className="mt-3.5 mb-0 text-[17px] leading-relaxed text-[#A9B0C9]">
            Con el curso para aprender a llevarle tráfico:{" "}
            <span className="text-[#D7DCEC]">cómo nunca quedarte sin prospectos</span>.
          </p>
        </div>

        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {GETS.map((item) => (
            <li key={item.n} className="flex items-start gap-4">
              <span
                className="pt-1 text-[15px] text-[#2BD7F5]"
                style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
                aria-hidden="true"
              >
                {item.n}
              </span>
              <span className="min-w-0">
                <span className="block text-[19px] font-semibold">{item.title}</span>
                <span className="mt-0.5 block text-[15px] leading-snug text-[#A9B0C9]">
                  {item.body}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p className="m-0 text-[16px] font-semibold text-[#2BD7F5]">
          Gratis de por vida · Sin tarjeta · Sin mensualidad
        </p>

        <div className="flex flex-col gap-3">
          <a
            href={claimUrl}
            className="rounded-xl bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-7 py-4 text-center text-[17px] font-semibold text-white no-underline"
          >
            Quiero mi funnel gratis
          </a>
          {hasCourse ? (
            <>
              <a
                href={courseUrl}
                className="rounded-xl border border-[#23233A] px-7 py-4 text-center text-[16px] font-semibold text-[#D7DCEC] no-underline"
              >
                Ver el curso
              </a>
              {/* Said before they go, not after: the course registration
                  form lives on the WeWebinars side and will not mention
                  who invited them, so this page is the only place where
                  the handoff can be stated honestly. */}
              <p className="m-0 text-center text-xs leading-relaxed text-[#4A5173]">
                Al entrar al curso, {site.display_name} recibe tu nombre y tu correo para
                poder acompañarte.
              </p>
            </>
          ) : (
            <p className="m-0 text-center text-sm leading-relaxed text-[#6E7694]">
              El curso abre en unos días y te avisamos por correo. Reclama tu funnel
              ahora: ya es tuyo desde hoy.
            </p>
          )}
        </div>
      </section>

      <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-[#1A1A2A] pt-4 pb-8 text-[13px] text-[#6E7694]">
        <a href={`https://${WEFUNNELS_HOST}/${site.slug}`} className="no-underline">
          La página de <span className="text-[#A9B0C9]">{site.display_name}</span>
        </a>
        <a
          href={`/reportar?p=${encodeURIComponent(site.slug)}`}
          className="text-xs text-[#4A5173] no-underline"
        >
          Reportar
        </a>
      </div>
    </main>
  );
}
