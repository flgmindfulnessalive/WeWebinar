import { redirect } from "next/navigation";

import { checklist, getPanelViewer } from "@/lib/wefunnels/site";
import { ClaimForm } from "./claim-form";
import { SiteEditor } from "./site-editor";

export default async function PanelHomePage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel");

  // No page yet is the normal first visit, not an error state: this screen
  // is the claim, and it is the only thing in the panel until it is done.
  if (!viewer.site) {
    return <ClaimForm />;
  }

  return <SiteEditor site={viewer.site} steps={checklist(viewer.site)} />;
}
