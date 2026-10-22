import Link from "next/link";
import { Video } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { formatDurationLabel } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WebinarRowActions } from "./webinar-row-actions";
import { AttentionBadge } from "./attention-badge";
import { attentionReason } from "@/lib/webinar-attention";

type Filtro = "todos" | "publicados" | "borrador" | "archivados" | "atencion";

// El filtro y la búsqueda viven en la URL, no en estado de cliente: esta
// pantalla ya es un componente de servidor con todas las filas en la
// mano, así que filtrar aquí no cuesta una consulta más, funciona sin
// JavaScript y cada vista queda enlazable.
//
// "atencion" sigue aceptando el viejo ?attention=1 con el que enlaza la
// tarjeta del Resumen: un enlace que alguien pudo guardar no se rompe
// porque hayamos cambiado el nombre del parámetro.
const FILTROS: Filtro[] = ["todos", "publicados", "borrador", "archivados", "atencion"];

// Verde publicado, gris borrador, ámbar "necesita algo". El filo de
// color es lo que deja leer una lista de veinte de un vistazo, sin tener
// que recorrer la columna de etiquetas.
const EDGE: Record<string, string> = {
  published: "bg-emerald-500",
  draft: "bg-zinc-300 dark:bg-zinc-600",
  archived: "bg-zinc-200 dark:bg-zinc-700",
  atencion: "bg-amber-500",
};

export default async function WebinarsPage({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string; estado?: string; q?: string }>;
}) {
  const current = await getCurrentAccount();
  if (!current) return null;

  const params = await searchParams;
  const estado: Filtro = params.attention === "1"
    ? "atencion"
    : FILTROS.includes(params.estado as Filtro)
      ? (params.estado as Filtro)
      : "todos";
  const query = (params.q ?? "").trim();

  const locale = await getLocale();
  const t = await getTranslations("WebinarsList");
  const tAttention = await getTranslations("WebinarAttention");
  const tStatus = await getTranslations("WebinarStatusLabel");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("webinars")
    .select(
      "id, title, status, attendee_count, created_at, video_source, schedule_mode, duration_seconds"
    )
    .eq("account_id", current.account.id)
    .order("created_at", { ascending: false });

  const withAttention = (rows ?? []).map((webinar) => ({
    ...webinar,
    attention: attentionReason(webinar, tAttention),
  }));
  // Lo que necesita algo sube; dentro de cada grupo manda la consulta
  // (created_at desc), que la ordenación es estable.
  withAttention.sort((a, b) => Number(b.attention !== null) - Number(a.attention !== null));

  const counts = {
    todos: withAttention.length,
    publicados: withAttention.filter((w) => w.status === "published").length,
    borrador: withAttention.filter((w) => w.status === "draft").length,
    archivados: withAttention.filter((w) => w.status === "archived").length,
    atencion: withAttention.filter((w) => w.attention !== null).length,
  };

  const needle = query.toLowerCase();
  const webinars = withAttention.filter((webinar) => {
    const matches =
      estado === "todos" ||
      (estado === "atencion" && webinar.attention !== null) ||
      (estado === "publicados" && webinar.status === "published") ||
      (estado === "borrador" && webinar.status === "draft") ||
      (estado === "archivados" && webinar.status === "archived");
    if (!matches) return false;
    return !needle || webinar.title.toLowerCase().includes(needle);
  });

  const totalRegistrants = withAttention.reduce((sum, w) => sum + (w.attendee_count ?? 0), 0);
  const canManage = current.user.role === "owner" || current.user.role === "editor";
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const filtroHref = (next: Filtro) =>
    `/dashboard/webinars?estado=${next}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Webinars</h1>
          {/* Lo que antes había que sumar a ojo recorriendo la lista. */}
          <p className="mt-1 text-sm text-muted-foreground">
            {t("summaryLine", {
              total: counts.todos,
              published: counts.publicados,
              registrants: totalRegistrants,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Un GET normal: sin JavaScript la búsqueda sigue funcionando
              y el resultado se puede enlazar. */}
          <form method="get" action="/dashboard/webinars" className="flex gap-2">
            <input type="hidden" name="estado" value={estado} />
            <label htmlFor="q" className="sr-only">
              {t("searchLabel")}
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder={t("searchPlaceholder")}
              className="h-9 w-52 rounded-full border bg-background px-3.5 text-sm"
            />
            <Button type="submit" variant="outline" size="sm" className="rounded-full">
              {t("search")}
            </Button>
          </form>
          {canManage && (
            <Button asChild>
              <Link href="/dashboard/webinars/new">{t("createWebinar")}</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((item) => {
          const active = item === estado;
          const isAttention = item === "atencion";
          if (isAttention && counts.atencion === 0 && !active) return null;
          return (
            <Link
              key={item}
              href={filtroHref(item)}
              aria-current={active ? "true" : undefined}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium no-underline transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : isAttention
                    ? "border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {t(`filter.${item}`)}
              <span className="tabular-nums opacity-70">{counts[item]}</span>
            </Link>
          );
        })}
      </div>

      {webinars.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Video className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {counts.todos === 0
                ? t("emptyState")
                : estado === "atencion"
                  ? t("attentionEmptyState")
                  : t("noMatches")}
            </p>
            {counts.todos === 0 && canManage && (
              <Button asChild>
                <Link href="/dashboard/webinars/new">{t("createFirstWebinar")}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {webinars.map((webinar) => {
            const edge = webinar.attention ? EDGE.atencion : EDGE[webinar.status];
            return (
              <div
                key={webinar.id}
                className={`flex items-stretch overflow-hidden rounded-xl border bg-card ${
                  webinar.attention ? "border-amber-300 dark:border-amber-800" : ""
                } ${webinar.status === "archived" ? "bg-muted/30" : ""}`}
              >
                <div className={`w-1 shrink-0 ${edge}`} aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1 basis-[280px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/webinars/${webinar.id}`}
                        className={`font-semibold tracking-tight hover:underline ${
                          webinar.status === "archived" ? "text-muted-foreground" : ""
                        }`}
                      >
                        {webinar.title}
                      </Link>
                      {webinar.attention && <AttentionBadge>{webinar.attention}</AttentionBadge>}
                    </div>
                    {/* Fecha, registrados, modo y duración: todo esto ya
                        venía en la consulta y la lista lo tiraba. */}
                    <p className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
                      <span>{t("createdOn", { date: date.format(new Date(webinar.created_at)) })}</span>
                      <span className="tabular-nums">
                        {t("registrantsCount", { count: webinar.attendee_count })}
                      </span>
                      {webinar.duration_seconds ? (
                        <span>{formatDurationLabel(webinar.duration_seconds)}</span>
                      ) : (
                        <span>{t("noVideoYet")}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full border px-2.5 py-1 text-xs font-medium">
                      {tStatus(webinar.status)}
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/webinars/${webinar.id}`}>
                        {webinar.status === "draft" ? t("continue") : t("open")}
                      </Link>
                    </Button>
                    {canManage && (
                      <WebinarRowActions
                        webinarId={webinar.id}
                        webinarTitle={webinar.title}
                        status={webinar.status}
                        isOwner={current.user.role === "owner"}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
