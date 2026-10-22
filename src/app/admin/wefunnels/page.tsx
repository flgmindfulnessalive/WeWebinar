import Link from "next/link";
import { AlertTriangle, FilePen, FileText, Rocket, UserRoundX } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ClearButton, SuspendButton } from "./moderation-actions";
import { CreateAccountForm, GrantLicenseForm } from "./console-forms";
import { GrantSiteForm } from "./unclaimed-form";
import { ReferrerForm } from "./referrer-form";
import { proposeSlug } from "@/lib/wefunnels/slug";
import { ResourceManager } from "./resource-forms";
import { TemplateManager } from "./template-forms";
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

const DATE_SHORT = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

const SOURCE_LABEL: Record<string, string> = {
  filter: "Filtro",
  report: "Reporte",
};

type View = "vigilar" | "altas" | "contenido";
type Estado = "todas" | "publicadas" | "borrador" | "suspendidas";

// Las pestañas y los filtros viven en la URL, no en estado de cliente:
// esta pantalla ya es un componente de servidor con todos los datos en la
// mano, así que filtrar aquí no cuesta una consulta más y a cambio cada
// vista queda enlazable -- «mándame el enlace de las suspendidas» es un
// enlace de verdad, y recargar no pierde dónde estabas.
const VIEWS: { key: View; label: string }[] = [
  { key: "vigilar", label: "Vigilar" },
  { key: "altas", label: "Altas manuales" },
  { key: "contenido", label: "Contenido del panel" },
];

const ESTADOS: { key: Estado; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "publicadas", label: "Publicadas" },
  { key: "borrador", label: "Borrador" },
  { key: "suspendidas", label: "Suspendidas" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

type StarterState = { label: string; urgent: boolean; muted: boolean };

// Qué decir en la columna «Starter» de un distribuidor. Vivía arriba como
// una tarjeta («Starter vence en 7 días») y de ahí se fue por dos razones:
// marcaba cero casi todos los días -- y una fila de tarjetas siempre en
// cero enseña a no mirar ninguna, incluida la que sí tiene que gritar --
// y, peor, contaba también a quien ya paga su propio plan, a quien no se
// le apaga nada. Aquí, al lado de la fecha, el mismo dato sí dice algo:
// de los que recibieron dos meses gratis, quién acabó pagando.
//
// Fuera del componente porque lee el reloj, y eso dentro del render es
// justo lo que el compilador de React marca como impuro.
function describeStarter(row: {
  starterUntil: string | null;
  startedPaying: boolean;
  endedAt: string | null;
}): StarterState {
  if (row.startedPaying) {
    return { label: "Ya paga su plan", urgent: false, muted: false };
  }
  if (row.endedAt) {
    return {
      label: `Terminado el ${DATE_SHORT.format(new Date(row.endedAt))}`,
      urgent: false,
      muted: true,
    };
  }
  if (!row.starterUntil) {
    return { label: "—", urgent: false, muted: true };
  }

  const until = new Date(row.starterUntil);
  const fecha = DATE_SHORT.format(until);
  const days = Math.ceil((until.getTime() - Date.now()) / DAY_MS);

  if (days < 0) {
    // La fecha pasó y la cuenta sigue con el plan regalado: el cron de
    // send-reminders todavía no ha llegado, o el aviso de 7 días aún no
    // cumple su semana. Dura un rato, no es un error.
    return { label: `${fecha} · venció`, urgent: true, muted: false };
  }
  if (days <= 7) {
    return {
      label: `${fecha} · ${days === 0 ? "vence hoy" : `vence en ${days} d`}`,
      urgent: true,
      muted: false,
    };
  }
  return { label: `${fecha} · quedan ${days} d`, urgent: false, muted: true };
}

export default async function AdminWeFunnelsPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; estado?: string; q?: string }>;
}) {
  const params = await searchParams;
  const view: View = VIEWS.some((v) => v.key === params.v) ? (params.v as View) : "vigilar";
  const estado: Estado = ESTADOS.some((e) => e.key === params.estado)
    ? (params.estado as Estado)
    : "todas";
  const query = (params.q ?? "").trim();

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
    { data: unclaimedSignups, error: unclaimedError },
    { data: licensed },
    { data: slugs },
    { data: resourceSections },
    { data: resourceItems },
    { data: templates },
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
    // Quien se registró y nunca llegó a reclamar. No sale en ninguna otra
    // parte de esta consola porque todavía no tiene ni cuenta ni página:
    // claim_wefunnel_site crea las dos, y esa gente no llegó hasta ahí.
    asAdmin.rpc("wefunnel_admin_unclaimed_signups"),
    // Quién tiene licencia, para poder distinguir en la lista de páginas
    // una gratuita de la de un distribuidor. Sin esto las dos se ven
    // exactamente igual, que es lo que hacía parecer que las cuentas
    // gratuitas no salían: salían, sin nada que las identificara.
    supabase.from("wefunnel_distributors").select("account_id"),
    // Para resolver quién invitó a quién. Va aparte de la lista de arriba
    // porque el que invitó puede no estar entre las últimas cien páginas.
    supabase.from("wefunnel_sites").select("id, slug"),
    supabase
      .from("wefunnel_resource_sections")
      .select("id, title, description, position, published")
      .order("position")
      .order("created_at"),
    supabase
      .from("wefunnel_resources")
      .select("id, section_id, title, description, youtube_id, duration_label, position, published")
      .order("position")
      .order("created_at"),
    supabase
      .from("wefunnel_templates")
      .select("id, kind, title, format_label, art_text, body, notes, image_url, position, published")
      .order("kind")
      .order("position")
      .order("created_at")
  ]);

  const openReviews = reviews ?? [];
  const allSites = sites ?? [];
  const siteById = new Map(allSites.map((site) => [site.id, site]));
  const allDistributors = distributors ?? [];
  const unclaimed = unclaimedSignups ?? [];
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

  // Quién de los distribuidores paga ya su propio plan, y a quién se le
  // acabó el regalo. La consola no puede saberlo sola:
  // wefunnel_admin_distributors() no devuelve nada de facturación, y sin
  // eso una fecha cercana parece un apagado inminente aunque la cuenta
  // lleve meses pagando Pro. Dos consultas por una lista de doscientas
  // filas como mucho.
  const distributorAccountIds = allDistributors.map((d) => d.account_id);
  const [{ data: distributorAccounts }, { data: starterEndings }] = distributorAccountIds.length
    ? await Promise.all([
        supabase
          .from("accounts")
          .select("id, billing_subscription_id")
          .in("id", distributorAccountIds),
        supabase
          .from("wefunnel_distributors")
          .select("account_id, starter_ended_at")
          .in("account_id", distributorAccountIds),
      ])
    : [{ data: [] }, { data: [] }];

  const payingAccounts = new Set(
    (distributorAccounts ?? [])
      .filter((row) => row.billing_subscription_id)
      .map((row) => row.id)
  );
  const starterEndedAt = new Map(
    (starterEndings ?? []).map((row) => [row.account_id, row.starter_ended_at])
  );

  // Lo que se enseña arriba. Son cuentas de lo ya cargado, no consultas
  // nuevas: la página ya traía todas las filas para pintar las tablas.
  const publishedCount = allSites.filter(
    (site) => site.status === "published" && !site.suspended_at
  ).length;
  const suspendedCount = allSites.filter((site) => site.suspended_at).length;
  const draftCount = allSites.length - publishedCount - suspendedCount;

  const needle = query.toLowerCase();
  const visibleSites = allSites.filter((site) => {
    const matchesEstado =
      estado === "todas" ||
      (estado === "suspendidas" && site.suspended_at) ||
      (estado === "publicadas" && site.status === "published" && !site.suspended_at) ||
      (estado === "borrador" && site.status !== "published" && !site.suspended_at);
    if (!matchesEstado) return false;
    if (!needle) return true;
    const email = (site.account_id && emailByAccount.get(site.account_id)) ?? "";
    return (
      site.slug.toLowerCase().includes(needle) ||
      site.display_name.toLowerCase().includes(needle) ||
      email.toLowerCase().includes(needle)
    );
  });

  const viewHref = (next: View) => `/admin/wefunnels?v=${next}`;
  const estadoHref = (next: Estado) =>
    `/admin/wefunnels?v=vigilar&estado=${next}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">WeFunnels</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Todas las páginas comparten dominio registrable con wewebinars.com, así que lo
            que se publica aquí afecta la reputación de los enlaces de los clientes que
            pagan. Bajar una página es inmediato y no necesita deploy.
          </p>
        </div>
        {/* Dar de alta es una acción, no una sección que se lee: sube a la
            cabecera y la pestaña queda para el formulario entero. */}
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={viewHref("altas")}
            className="inline-flex h-9 items-center rounded-md border px-3.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            Dar licencia
          </Link>
          <Link
            href={viewHref("altas")}
            className="inline-flex h-9 items-center rounded-md bg-foreground px-3.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Crear cuenta
          </Link>
        </div>
      </div>

      {migrationPending && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <strong className="font-semibold">Falta aplicar la migración.</strong> La consola
          necesita <code>20261009000001_wefunnel_admin_console.sql</code>. Ejecuta{" "}
          <code>supabase db push</code> y recarga esta página. Si ya la aplicaste, recarga la
          caché de esquema con <code>notify pgrst, &apos;reload schema&apos;;</code>.
        </div>
      )}

      {/* Cuatro cifras, y la primera es la única que puede ponerse roja:
          un panel donde todo grita no avisa de nada. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={openReviews.length > 0 ? "border-destructive/50" : undefined}>
          <CardContent className="flex items-start justify-between gap-3 py-4">
            <div>
              <p
                className={`text-xs font-medium ${openReviews.length > 0 ? "text-destructive" : "text-muted-foreground"}`}
              >
                En revisión
              </p>
              <p
                className={`mt-1 text-2xl font-semibold tabular-nums ${openReviews.length > 0 ? "text-destructive" : ""}`}
              >
                {openReviews.length}
              </p>
            </div>
            <AlertTriangle
              className={`size-4 ${openReviews.length > 0 ? "text-destructive" : "text-muted-foreground"}`}
              aria-hidden="true"
            />
          </CardContent>
        </Card>

        {/* Estas dos llevan a su filtro: son las únicas cifras de la fila
            con un sitio al que ir. */}
        <Link href={estadoHref("publicadas")} className="no-underline">
          <Card className="transition-colors hover:border-foreground/30">
            <CardContent className="flex items-start justify-between gap-3 py-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Páginas publicadas</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {publishedCount}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    de {allSites.length}
                  </span>
                </p>
              </div>
              <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardContent>
          </Card>
        </Link>

        {/* Altas a medias. Es la única cifra de la fila que cuenta
            personas en vez de páginas, y por eso va la última: no suma
            con las otras tres. */}
        <Link href="#altas-sin-reclamar" className="no-underline">
          <Card
            className={
              unclaimed.length > 0 ? "border-amber-400/60 transition-colors" : "transition-colors hover:border-foreground/30"
            }
          >
            <CardContent className="flex items-start justify-between gap-3 py-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Altas sin reclamar</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{unclaimed.length}</p>
              </div>
              <UserRoundX className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardContent>
          </Card>
        </Link>

        <Link href={estadoHref("borrador")} className="no-underline">
          <Card className="transition-colors hover:border-foreground/30">
            <CardContent className="flex items-start justify-between gap-3 py-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sin publicar</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{draftCount}</p>
              </div>
              <FilePen className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="flex items-start justify-between gap-3 py-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Distribuidores</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {allDistributors.length}
              </p>
            </div>
            <Rocket className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardContent>
        </Card>

      </div>

      <nav className="flex flex-wrap items-center gap-1 border-b" aria-label="Secciones">
        {VIEWS.map((item) => {
          const active = item.key === view;
          return (
            <Link
              key={item.key}
              href={viewHref(item.key)}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm no-underline transition-colors ${
                active
                  ? "border-foreground font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              {item.key === "vigilar" && openReviews.length > 0 && (
                <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                  {openReviews.length}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {view === "vigilar" && (
        <>
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
                    <Card key={review.id} className="border-destructive/40">
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
                          {review.detail && <p className="mt-1 text-sm">{review.detail}</p>}
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
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight">
                  Páginas{" "}
                  <span className="text-muted-foreground">
                    {visibleSites.length === allSites.length
                      ? allSites.length
                      : `${visibleSites.length} de ${allSites.length}`}
                  </span>
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Todas, gratuitas y de distribuidor. Una página gratuita solo nace cuando
                  alguien reclama por el enlace de regalo de un distribuidor, así que la
                  columna «Invitó» dice de quién vino cada una.
                </p>
              </div>
              {/* Un GET de toda la vida: sin JavaScript, el buscador sigue
                  funcionando y el resultado se puede enlazar. */}
              <form method="get" action="/admin/wefunnels" className="flex shrink-0 gap-2">
                <input type="hidden" name="v" value="vigilar" />
                <input type="hidden" name="estado" value={estado} />
                <label htmlFor="q" className="sr-only">
                  Buscar una página
                </label>
                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Dirección, nombre o correo"
                  className="h-9 w-56 rounded-full border bg-background px-3.5 text-sm"
                />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Buscar
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-2">
              {ESTADOS.map((item) => {
                const active = item.key === estado;
                const count =
                  item.key === "todas"
                    ? allSites.length
                    : item.key === "publicadas"
                      ? publishedCount
                      : item.key === "suspendidas"
                        ? suspendedCount
                        : allSites.length - publishedCount - suspendedCount;
                return (
                  <Link
                    key={item.key}
                    href={estadoHref(item.key)}
                    aria-current={active ? "true" : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium no-underline transition-colors ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {item.label}
                    <span className="tabular-nums opacity-70">{count}</span>
                  </Link>
                );
              })}
            </div>

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
                    {visibleSites.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-muted-foreground">
                          {allSites.length === 0
                            ? "Todavía no hay páginas."
                            : "Ninguna página coincide con este filtro."}
                        </td>
                      </tr>
                    ) : (
                      visibleSites.map((site) => (
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
                          <td className="border-b px-4 py-3">
                            {/* Sin fila de referido no hay a quién atribuirla: o la
                                creó la consola de arriba, o la reclamó alguien que
                                llegó sin pasar por una página de regalo. */}
                            {(() => {
                              const from = site.account_id
                                ? referrerByAccount.get(site.account_id)
                                : undefined;
                              // Sin fila de referido no hay a quién
                              // atribuirla -- la creó la consola, o la
                              // reclamó alguien que llegó sin pasar por
                              // una página de regalo -- pero quien
                              // reparte sí lo sabe. El guion deja de ser
                              // el final y pasa a ser un campo.
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
                                <ReferrerForm siteId={site.id} />
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

          <section id="altas-sin-reclamar" className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Altas sin reclamar{" "}
              <span className="text-muted-foreground">({unclaimed.length})</span>
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Se registraron con el enlace de regalo de alguien y nunca llegaron a elegir
              la dirección de su funnel, así que no tienen cuenta ni página. Darles la
              suya desde aquí hace lo mismo que el reclamo: crea su página y se la
              acredita a quien les invitó. Los dos campos son la dirección que tendrá su
              funnel y quién le invitó; el segundo viene puesto si su alta lo guardó, y
              se puede escribir si no.
            </p>
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th scope="col" className="border-b px-4 py-3 font-medium">Persona</th>
                      <th scope="col" className="border-b px-4 py-3 font-medium">Se registró</th>
                      <th scope="col" className="border-b px-4 py-3 font-medium">Confirmó</th>
                      <th scope="col" className="border-b px-4 py-3 font-medium">Invitó</th>
                      <th scope="col" className="border-b px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Un cero puede significar dos cosas muy distintas:
                        que no hay nadie atascado, o que esta consulta no
                        corrió. Decirlas igual sería enseñar "nadie se
                        quedó a medias" mientras la gente se queda a
                        medias, que es peor que no enseñar nada. */}
                    {unclaimedError ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-sm text-destructive">
                          No se pudo leer el listado ({unclaimedError.code ?? "error"}).
                          {unclaimedError.code === "PGRST202" && (
                            <>
                              {" "}
                              Falta aplicar <code>20261022000003_unclaimed_signups.sql</code>,
                              o la caché de esquema no se ha recargado:{" "}
                              <code>notify pgrst, &apos;reload schema&apos;;</code>
                            </>
                          )}
                        </td>
                      </tr>
                    ) : unclaimed.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                          Nadie se ha quedado a medias. Aquí caen los que se registran y
                          no terminan.
                        </td>
                      </tr>
                    ) : (
                      unclaimed.map((signup) => {
                        const name = signup.full_name ?? signup.email.split("@")[0];
                        return (
                          <tr key={signup.user_id}>
                            <td className="border-b px-4 py-3">
                              <div className="font-medium">{name}</div>
                              <div className="text-xs text-muted-foreground">{signup.email}</div>
                            </td>
                            <td className="border-b px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                              {DATE.format(new Date(signup.created_at))}
                            </td>
                            <td className="border-b px-4 py-3">
                              {signup.confirmed ? (
                                <Badge variant="secondary">Sí</Badge>
                              ) : (
                                <Badge variant="outline">Todavía no</Badge>
                              )}
                            </td>
                            <td className="border-b px-4 py-3 whitespace-nowrap">
                              {signup.invited_slug ? (
                                <a
                                  href={`https://${WEFUNNELS_HOST}/${signup.invited_slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline underline-offset-2"
                                >
                                  /{signup.invited_slug}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="border-b px-4 py-3">
                              <GrantSiteForm
                                userId={signup.user_id}
                                name={name}
                                proposedSlug={proposeSlug(name)}
                                invitedSlug={signup.invited_slug}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Distribuidores{" "}
              <span className="text-muted-foreground">({allDistributors.length})</span>
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              La columna «Starter» dice en qué acabaron los dos meses incluidos: quién
              convirtió a un plan de pago, a quién le quedan días y a quién ya se le
              apagó el lado WeWebinars.
            </p>
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th scope="col" className="border-b px-4 py-3 font-medium">Cuenta</th>
                      <th scope="col" className="border-b px-4 py-3 font-medium">Dirección</th>
                      <th scope="col" className="border-b px-4 py-3 font-medium">Licencia</th>
                      <th scope="col" className="border-b px-4 py-3 font-medium">Starter</th>
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
                          <td className="border-b px-4 py-3 whitespace-nowrap">
                            {(() => {
                              const starter = describeStarter({
                                starterUntil: d.starter_until,
                                startedPaying: payingAccounts.has(d.account_id),
                                endedAt: starterEndedAt.get(d.account_id) ?? null,
                              });
                              return (
                                <span
                                  className={
                                    starter.urgent
                                      ? "font-medium text-amber-600 tabular-nums dark:text-amber-500"
                                      : starter.muted
                                        ? "text-muted-foreground tabular-nums"
                                        : "font-medium tabular-nums"
                                  }
                                >
                                  {starter.label}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {view === "altas" && (
        <div className="grid gap-6 lg:grid-cols-2">
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
        </div>
      )}

      {view === "contenido" && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Recursos{" "}
              <span className="text-muted-foreground">
                ({resourceSections?.length ?? 0} cursos · {resourceItems?.length ?? 0} vídeos)
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Los cursos de anuncios y de contenido en redes que ve todo el mundo en su
              panel, gratuito o distribuidor. Van aparte del curso de WeFunnels y de su PDF:
              esto se añade y se reordena sin tocar código. Un curso sin publicar no se ve, y
              uno publicado sin vídeos visibles tampoco se dibuja.
            </p>
            <ResourceManager
              sections={resourceSections ?? []}
              resources={resourceItems ?? []}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Plantillas de contenido{" "}
              <span className="text-muted-foreground">({templates?.length ?? 0})</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Textos para que un distribuidor cuente que regala funnels: publicaciones y
              guiones de reel. Solo las ve quien tiene licencia, porque son material para
              repartir funnels y eso es lo que compra el nivel. Nada de lo que se escriba
              aquí debería prometer ingresos ni mencionar ganar por traer gente: las normas
              de Meta sobre fraude lo prohíben y el modelo tampoco paga por eso.
            </p>
            <TemplateManager templates={templates ?? []} />
          </section>
        </>
      )}
    </div>
  );
}
