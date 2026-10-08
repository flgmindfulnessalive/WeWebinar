import { redirect } from "next/navigation";

import { getPanelViewer } from "@/lib/wefunnels/site";
import { courseEntryFor } from "@/lib/wefunnels/course-access";

// "Ver mi curso". A route handler because it registers them if they are not
// registered yet, and a GET that writes belongs in a handler rather than in
// a page's render.
export async function GET() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/curso/ver");

  const entry = await courseEntryFor({
    name: viewer.site?.display_name || viewer.email.split("@")[0] || "",
    email: viewer.email,
  });

  // Unavailable means the course is not recorded or published yet, which
  // /panel/curso says in words rather than as a broken link.
  if (entry.kind === "unavailable") redirect("/panel/curso");

  redirect(entry.url);
}
