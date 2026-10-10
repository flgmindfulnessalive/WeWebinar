import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { checklist, getPanelViewer } from "@/lib/wefunnels/site";
import { REFERRAL_COOKIE, parseTouch } from "@/lib/wefunnels/referral";
import { ClaimForm } from "./claim-form";
import { SiteEditor } from "./site-editor";

export default async function PanelPageEditor() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/entrar?next=/panel/pagina");

  // No page yet is the normal first visit, not an error state: this screen
  // is the claim, and it is the only thing in the panel until it is done.
  //
  // But the claim now needs a live invitation, so the form only appears
  // when there is one. Showing it otherwise would walk somebody through
  // picking a name and then refuse them at the last step, which is the
  // worst place to tell them.
  if (!viewer.site) {
    const touch = parseTouch((await cookies()).get(REFERRAL_COOKIE)?.value);

    // The same two exceptions claim_wefunnel_site makes to the invitation
    // rule (20261007000014): a platform admin, so the first page in the
    // system can exist at all, and an account that already paid for the
    // licence. Without them this screen would turn somebody the database
    // would accept away at the door.
    let invited = viewer.isPlatformAdmin || Boolean(viewer.distributor);

    if (!invited && touch) {
      const supabase = await createClient();
      const { data } = await supabase.rpc("wefunnel_invitation_open", {
        p_slug: touch.slug,
      });
      invited = Boolean(data);
    }

    if (!invited) {
      return (
        <div className="flex max-w-[560px] flex-col gap-4">
          <h1 className="m-0 text-[28px] font-bold tracking-tight">
            WeFunnels es por invitación
          </h1>
          <p className="m-0 text-[16px] leading-relaxed text-[var(--wf-fg-3)]">
            Las páginas no se piden: te las regala un distribuidor. Si conoces a la
            persona que te habló de esto, pídele su enlace de regalo — con él tu funnel
            es gratis de por vida, sin tarjeta y sin mensualidad.
          </p>
          <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-muted)]">
            Si entraste por un enlace y ves esto, puede que haya pasado demasiado tiempo
            o que ese enlace no sea el de regalo. Vuelve a abrir el que te pasaron.
          </p>
        </div>
      );
    }

    return <ClaimForm />;
  }

  return (
    <SiteEditor
      site={viewer.site}
      steps={checklist(viewer.site)}
      emailVerified={viewer.emailVerified}
    />
  );
}
