import { createAdminClient } from "@/lib/supabase/admin";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ClearButton, MountCourseRoomsButton, SuspendButton } from "./moderation-actions";

// Spanish only, unlike the rest of the admin: WeFunnels ships in Spanish,
// and a moderation screen quoting Spanish page copy next to English chrome
// reads worse than one that simply matches the thing being moderated.

const DATE = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const SOURCE_LABEL: Record<string, string> = {
  filter: "Filtro",
  report: "Reporte",
};

export default async function AdminWeFunnelsPage() {
  // Service role on purpose: wefunnel_reviews has no client policies, and
  // the queue has to show pages that are already suspended -- which RLS
  // hides from everyone but their owner.
  const supabase = createAdminClient();

  const [{ data: reviews }, { data: sites }, { count: distributorCount }, { count: pendingRoomCount }] = await Promise.all([
    supabase
      .from("wefunnel_reviews")
      .select("id, site_id, source, rule, detail, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("wefunnel_sites")
      .select("id, slug, display_name, status, suspended_at, published_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("wefunnel_distributors")
      .select("account_id", { count: "exact", head: true }),
    supabase
      .from("wefunnel_distributors")
      .select("account_id", { count: "exact", head: true })
      .is("course_webinar_id", null),
  ]);

  const distributors = distributorCount ?? 0;
  const pendingRooms = pendingRoomCount ?? 0;
  const openReviews = reviews ?? [];
  const allSites = sites ?? [];
  const siteById = new Map(allSites.map((site) => [site.id, site]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">WeFunnels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas las páginas comparten dominio registrable con wewebinars.com, así que lo
          que se publica aquí afecta la reputación de los enlaces de los clientes que
          pagan. Bajar una página es inmediato y no necesita deploy.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Cola de revisión
          {openReviews.length > 0 && (
            <span className="ml-2 text-muted-foreground">{openReviews.length}</span>
          )}
        </h2>

        {openReviews.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Nada pendiente. Aquí caen los avisos del filtro de términos y los reportes
              de visitantes.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {openReviews.map((review) => {
              const site = siteById.get(review.site_id);
              return (
                <Card key={review.id}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={review.source === "report" ? "destructive" : "secondary"}>
                          {SOURCE_LABEL[review.source] ?? review.source}
                        </Badge>
                        <span className="font-medium">{review.rule}</span>
                        {site?.suspended_at && <Badge variant="outline">Ya suspendida</Badge>}
                      </div>
                      <p className="mt-1 text-sm break-all text-muted-foreground">
                        {site ? (
                          <a
                            href={`https://${WEFUNNELS_HOST}/${site.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {WEFUNNELS_HOST}/{site.slug}
                          </a>
                        ) : (
                          "página borrada"
                        )}
                        {site && ` · ${site.display_name}`}
                      </p>
                      {review.detail && (
                        <p className="mt-1 text-sm">{review.detail}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {DATE.format(new Date(review.created_at))}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ClearButton reviewId={review.id} />
                      {site && (
                        <SuspendButton
                          siteId={site.id}
                          suspended={Boolean(site.suspended_at)}
                          rule={review.rule}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Distribuidores</h2>
        <Card>
          <CardContent className="flex flex-col gap-3 py-5">
            <p className="text-sm text-muted-foreground">
              {distributors === 0
                ? "Todavía no hay distribuidores."
                : `${distributors} distribuidor${distributors === 1 ? "" : "es"}, ${pendingRooms} sin sala del curso.`}
              {" "}
              La sala se monta sola al activar el nivel; esto es para los que
              compraron antes de que el curso existiera, o mientras
              WEFUNNELS_COURSE_WEBINAR_ID estuvo vacío. Repetirlo no duplica nada.
            </p>
            <MountCourseRoomsButton />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Páginas</h2>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th scope="col" className="border-b px-4 py-3 font-medium">Dirección</th>
                  <th scope="col" className="border-b px-4 py-3 font-medium">Dueño</th>
                  <th scope="col" className="border-b px-4 py-3 font-medium">Estado</th>
                  <th scope="col" className="border-b px-4 py-3 font-medium">Creada</th>
                  <th scope="col" className="border-b px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {allSites.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                      Todavía no hay páginas.
                    </td>
                  </tr>
                ) : (
                  allSites.map((site) => (
                    <tr key={site.id}>
                      <td className="border-b px-4 py-3 break-all">
                        <a
                          href={`https://${WEFUNNELS_HOST}/${site.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          /{site.slug}
                        </a>
                      </td>
                      <td className="border-b px-4 py-3">{site.display_name}</td>
                      <td className="border-b px-4 py-3">
                        {site.suspended_at ? (
                          <Badge variant="destructive">Suspendida</Badge>
                        ) : site.status === "published" ? (
                          <Badge>Publicada</Badge>
                        ) : (
                          <Badge variant="secondary">Borrador</Badge>
                        )}
                      </td>
                      <td className="border-b px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                        {DATE.format(new Date(site.created_at))}
                      </td>
                      <td className="border-b px-4 py-3 text-right">
                        <SuspendButton
                          siteId={site.id}
                          suspended={Boolean(site.suspended_at)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
