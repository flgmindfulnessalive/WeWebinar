import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { CopyLink } from "@/components/wefunnels/copy-link";

// Replaces the old "Mi badge" screen. There is no badge any more: a funnel
// page no longer offers one to whoever scrolls to the bottom, because a
// product that hands itself out makes the person who hands it out
// pointless. What a page has instead is this link, and a number of times it
// can be used.
export default async function PanelInvitationsPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/invitaciones");
  if (!viewer.site) redirect("/panel");

  const supabase = await createClient();
  const { data } = await supabase.rpc("wefunnel_invitations");
  const stats = data?.[0];
  const used = Number(stats?.used ?? 0);
  const unlimited = Boolean(stats?.unlimited);
  const remaining = stats?.remaining ?? 0;

  const inviteUrl = `https://${WEFUNNELS_HOST}/r/${viewer.site.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Mis invitaciones</h1>

      <div className="flex flex-col gap-3.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
        <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
          Tu enlace de invitación
        </span>
        <CopyLink url={inviteUrl} />
        <span className="text-sm leading-relaxed text-[#6E7694]">
          Quien entre por aquí puede reclamar su propia página gratis de por vida, y queda
          registrado como tuyo. Sin este enlace no hay forma de crear una: WeFunnels no se
          encuentra, se regala.
        </span>
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
          <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
            Ya invitaste
          </span>
          <span className="text-[58px] leading-none font-extrabold tracking-tighter text-[#2BD7F5] tabular-nums">
            {used}
          </span>
          <span className="text-[15px] leading-snug text-[#A9B0C9]">
            {used === 1 ? "persona reclamó" : "personas reclamaron"} su funnel con tu
            enlace
          </span>
        </div>

        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
          <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
            Te quedan
          </span>
          <span className="text-[58px] leading-none font-extrabold tracking-tighter tabular-nums">
            {unlimited ? "∞" : remaining}
          </span>
          <span className="text-[15px] leading-snug text-[#A9B0C9]">
            {unlimited
              ? "Como distribuidor repartes sin límite."
              : remaining === 0
                ? "Gastaste tus tres invitaciones."
                : remaining === 1
                  ? "invitación disponible"
                  : "invitaciones disponibles"}
          </span>
        </div>
      </div>

      {/* The offer lands here and nowhere earlier, on somebody who has
          already given the product away three times and watched it work.
          Shown spent or not, because the ceiling is the argument. */}
      {!unlimited && (
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[18px] border border-[#A855F7] bg-gradient-to-br from-[#0B1230] to-[#1B0C2E] p-7">
          <div className="min-w-0 flex-[999_1_380px]">
            <strong className="text-[25px] leading-snug font-extrabold tracking-tight text-balance">
              {remaining === 0
                ? "Para seguir repartiendo, activa tu nivel distribuidor"
                : "Tres no son muchas"}
            </strong>
            <p className="mt-2.5 mb-0 text-[16px] leading-relaxed text-[#A9B0C9]">
              Con el nivel distribuidor repartes sin límite, con tu sala del curso a tu
              nombre, y te quedas con el 20% del plan de quien llegue por ti — cada mes,
              mientras lo tenga.
            </p>
          </div>
          <Link
            href="/panel/distribuidor"
            className="flex-none rounded-xl bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-7 py-4 text-[16px] font-semibold text-white no-underline"
          >
            Ver cómo
          </Link>
        </div>
      )}

      <p className="m-0 text-sm leading-relaxed text-[#6E7694]">
        Tu página vive en{" "}
        <a
          href={`https://${WEFUNNELS_HOST}/${viewer.site.slug}`}
          className="no-underline"
          style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
        >
          {WEFUNNELS_HOST}/{viewer.site.slug}
        </a>{" "}
        y no lleva ninguna marca nuestra. Es tuya y se ve tuya.
      </p>
    </div>
  );
}
