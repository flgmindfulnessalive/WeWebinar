import { createAdminClient } from "@/lib/supabase/admin";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ClearButton, SuspendButton } from "./moderation-actions";
import { CreateAccountForm, GrantLicenseForm } from "./console-forms";
import { createClient } from "@/lib/supabase/server";

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

  // Los distribuidores se leen con la sesión del administrador, no con la
  // clave de servicio: la función comprueba is_platform_admin() por su
  // cuenta y con el cliente de servicio esa comprobación no correría.
  const asAdmin = await createClient();

  const [
    { data: reviews },
    { data: sites },
    { data: distributors, error: consoleError },
    { data: licensed },
    { data: slugs },
  ] = await Promise.all([
    supabase
      .from("wefunnel_reviews")
      .select("id, site_id, source, rule, detail, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("wefunnel_sites")
      .select("id, account_id, slug, display_name, status, suspended_at, published_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    asAdmin.rpc("wefunnel_admin_distributors"),
    // Quién tiene licencia, para poder distinguir en la lista de páginas
    // una gratuita de la de un distribuidor. Sin esto las dos se ven
    // exactamente igual, que es lo que hacía parecer que las cuentas
    // gratuitas no salían: salían, sin nada que las identificara.
    supabase.from("wefunnel_distributors").select("account_id"),
    // Para resolver quién invitó a quién. Va aparte de la lista de arriba
    // porque el que invitó puede no estar entre las últimas cien páginas.
    supabase.from("wefunnel_sites").select("id, slug"),
  ]);

  const openReviews = reviews ?? [];
  const allSites = sites ?? [];
  const siteById = new Map(allSites.map((site) => [site.id, site]));
  const allDistributors = distributors ?? [];
  const licensedAccounts = new Set((licensed ?? []).map((row) => row.account_id));
  const slugBySiteId = new Map((slugs ?? []).map((row) => [row.id, row.slug]));

  // El dueño real y su origen. Dependen de las cuentas que devolvió la
  // consulta de arriba, así que no caben en el mismo Promise.all.
  const accountIds = [
    ...new Set(allSites.map((site) => site.account_id).filter((id): id is string => Boolean(id))),
  ];
  const [{ data: owners }, { data: referrals }] = accountIds.length
    ? await Promise.all([
        supabase.from("users").select("account_id, email, role").in("account_id", accountIds),
        supabase
          .from("wefunnel_referrals")
          .select("referred_account_id, referrer_site_id")
          .in("referred_account_id", accountIds),
      ])
    : [{ data: [] }, { data: [] }];

  // El dueño, no un miembro cualquiera. Una cuenta puede tener equipo, y
  // quedarse con la última fila que llegue mostraría en el panel un correo
  // que no es el de quien reclamó la página -- exactamente el dato por el
  // que se mira esta tabla.
  const emailByAccount = new Map<string, string>();
  for (const row of owners ?? []) {
    if (!row.account_id) continue;
    const current = emailByAccount.get(row.account_id);
    if (!current || row.role === "owner") emailByAccount.set(row.account_id, row.email);
  }
  const referrerByAccount = new Map(
    (referrals ?? []).map((row) => [
      row.referred_account_id,
      slugBySiteId.get(row.referrer_site_id) ?? null,
    ])
  );
  // La consola entera depende de una migración. Si falta, la tabla saldría
  // vacía sin decir por qué y los formularios fallarían uno a uno.
  const migrationPending = consoleError?.code === "PGRST202";

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

      {migrationPending && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <strong className="font-semibold">Falta aplicar la migración.</strong> La consola
          necesita <code>20261009000001_wefunnel_admin_console.sql</code>. Ejecuta{" "}
          <code>supabase db push</code> y recarga esta página. Si ya la aplicaste, recarga la
          caché de esquema con <code>notify pgrst, &apos;reload schema&apos;;</code>.
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Crear una cuenta</h2>
        <p className="text-sm text-muted-foreground">
          Crea la cuenta y la página de alguien sin que pase por el embudo ni pague.
          Queda en borrador, a su nombre, y con el email ya confirmado para que pueda
          publicarla. La licencia que se da aquí se marca como regalada: no entra en
          los ingresos.
        </p>
        <Card>
          <CardContent className="pt-6">
            <CreateAccountForm />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Dar la licencia a una cuenta que ya existe
        </h2>
        <p className="text-sm text-muted-foreground">
          Para quien ya se registró y solo le falta el nivel Distribuidor.
        </p>
        <Card>
          <CardContent className="pt-6">
            <GrantLicenseForm />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Distribuidores <span className="text-muted-foreground">({allDistributors.length})</span>
        </h2>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="border-b px-4 py-3 font-medium">Cuenta</th>
                  <th className="border-b px-4 py-3 font-medium">Dirección</th>
                  <th className="border-b px-4 py-3 font-medium">Licencia</th>
                  <th className="border-b px-4 py-3 font-medium">Starter hasta</th>
                </tr>
              </thead>
              <tbody>
                {allDistributors.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      Todavía no hay distribuidores.
                    </td>
                  </tr>
                ) : (
                  allDistributors.map((d) => (
                    <tr key={d.account_id}>
                      <td className="border-b px-4 py-3">
                        <div className="font-medium">{d.account_name}</div>
                        <div className="text-xs text-muted-foreground">{d.owner_email}</div>
                      </td>
                      <td className="border-b px-4 py-3 whitespace-nowrap">
                        {d.slug ? (
                          <a
                            href={`https://${WEFUNNELS_HOST}/${d.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2"
                          >
                            /{d.slug}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">sin página</span>
                        )}
                        {d.site_status === "draft" && (
                          <Badge variant="secondary" className="ml-2">
                            Borrador
                          </Badge>
                        )}
                      </td>
                      <td className="border-b px-4 py-3 whitespace-nowrap">
                        {d.license_source === "granted" ? (
                          <Badge variant="secondary">Regalada</Badge>
                        ) : (
                          <span className="tabular-nums">
                            {d.license_source === "invited" ? "Invitación" : "Público"}
                            {d.license_price_usd != null && ` · $${d.license_price_usd}`}
                          </span>
                        )}
                      </td>
                      <td className="border-b px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                        {d.starter_until ? DATE.format(new Date(d.starter_until)) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

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
        <h2 className="text-lg font-semibold tracking-tight">
          Páginas <span className="text-muted-foreground">({allSites.length})</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Todas, gratuitas y de distribuidor. Una página gratuita solo nace cuando
          alguien reclama por el enlace de regalo de un distribuidor, así que la
          columna «Invitó» dice de quién vino cada una.
        </p>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th scope="col" className="border-b px-4 py-3 font-medium">Dirección</th>
                  <th scope="col" className="border-b px-4 py-3 font-medium">Dueño</th>
                  <th scope="col" className="border-b px-4 py-3 font-medium">Tipo</th>
                  <th scope="col" className="border-b px-4 py-3 font-medium">Invitó</th>
                  <th scope="col" className="border-b px-4 py-3 font-medium">Estado</th>
                  <th scope="col" className="border-b px-4 py-3 font-medium">Creada</th>
                  <th scope="col" className="border-b px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {allSites.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-muted-foreground">
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
                      <td className="border-b px-4 py-3">
                        <div className="font-medium">{site.display_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(site.account_id && emailByAccount.get(site.account_id)) ?? "—"}
                        </div>
                      </td>
                      <td className="border-b px-4 py-3 whitespace-nowrap">
                        {site.account_id && licensedAccounts.has(site.account_id) ? (
                          <Badge variant="secondary">Distribuidor</Badge>
                        ) : (
                          <Badge variant="outline">Gratis</Badge>
                        )}
                      </td>
                      <td className="border-b px-4 py-3 whitespace-nowrap">
                        {/* Sin fila de referido no hay a quién atribuirla: o la
                            creó la consola de arriba, o la reclamó alguien que
                            llegó sin pasar por una página de regalo. */}
                        {(() => {
                          const from = site.account_id
                            ? referrerByAccount.get(site.account_id)
                            : undefined;
                          return from ? (
                            <a
                              href={`https://${WEFUNNELS_HOST}/${from}`}
                              target="_blank"
                              rel="noreferrer"
                              className="underline underline-offset-2"
                            >
                              /{from}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          );
                        })()}
                      </td>
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
