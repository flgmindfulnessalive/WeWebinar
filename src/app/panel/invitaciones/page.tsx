import { redirect } from "next/navigation";

import { getPanelViewer } from "@/lib/wefunnels/site";

// "Mis invitaciones" belonged to the old model, where a free account had
// three invitations. Gifting is now a Distributor right, so the old address
// leads to the gift page for a Distributor and to the panel otherwise.
export default async function LegacyInvitationsPage() {
  const viewer = await getPanelViewer();
  redirect(viewer?.isDistributor ? "/panel/regalo" : "/panel");
}
