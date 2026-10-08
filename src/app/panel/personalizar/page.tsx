import { redirect } from "next/navigation";

import { getPanelViewer } from "@/lib/wefunnels/site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { SiteEditor } from "../site-editor";

type SearchParams = Promise<{ bienvenida?: string }>;

export default async function PanelPersonalizePage({ searchParams }: { searchParams: SearchParams }) {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/personalizar");
  if (!viewer.site) redirect("/panel");
  const { bienvenida } = await searchParams;

  return (
    <SiteEditor
      site={viewer.site}
      emailVerified={viewer.emailVerified}
      wefunnelsHost={WEFUNNELS_HOST}
      welcome={bienvenida === "1"}
    />
  );
}
