import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";

export const metadata: Metadata = {
  title: "Recursos · WeFunnels",
  robots: { index: false, follow: false },
};

// Recursos: la formación que se añade con el tiempo.
//
// Separada de Mi curso a propósito. El curso es una pieza terminada que
// enseña a llevar tráfico al funnel y acaba donde acaba; esto crece --
// cursos de anuncios y de contenido en redes que se suben cuando se
// graban. Juntarlos habría convertido una pieza cerrada en un contenedor,
// y habría obligado a tocar código por cada vídeo nuevo.
//
// La misma pantalla para la cuenta gratuita y para la de Distribuidor: lo
// que se enseña aquí es cómo llevar gente al funnel, y eso le hace falta a
// quien tiene uno, haya pagado o no.
//
// Los vídeos están en YouTube, incrustados en modo sin cookies. No son
// secretos -- quien tenga el enlace puede verlos en YouTube -- así que la
// pantalla no finge una exclusividad que el alojamiento no da.
export default async function PanelResourcesPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/entrar?next=/panel/recursos");

  const supabase = await createClient();

  // Dos lecturas y no un join anidado: RLS ya esconde lo no publicado en
  // las dos tablas, y agrupar aquí deja el orden explícito en vez de
  // depender del que devuelva el planificador para las filas hijas.
  const [{ data: sections }, { data: resources }] = await Promise.all([
    supabase
      .from("wefunnel_resource_sections")
      .select("id, title, description")
      .order("position")
      .order("created_at"),
    supabase
      .from("wefunnel_resources")
      .select("id, section_id, title, description, youtube_id, duration_label")
      .order("position")
      .order("created_at"),
  ]);

  const bySection = new Map<string, NonNullable<typeof resources>>();
  for (const item of resources ?? []) {
    const list = bySection.get(item.section_id) ?? [];
    list.push(item);
    bySection.set(item.section_id, list);
  }

  // Un curso sin vídeos visibles no se dibuja: sería un titular con un
  // hueco debajo, y quien lo viera volvería a mirar si creció.
  const visible = (sections ?? []).filter((s) => (bySection.get(s.id)?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 text-[clamp(24px,3.6vw,30px)] font-extrabold tracking-[-0.03em] text-[var(--wf-fg)]">
          Recursos
        </h1>
        <p className="m-0 mt-2 max-w-[62ch] text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-body)]">
          Formación para llevar tráfico a tu funnel: anuncios y contenido en redes. Se
          añade con el tiempo y está incluida con tu cuenta.
        </p>
      </div>

      {visible.length === 0 ? (
        <section className="rounded-[14px] border border-[var(--wf-edge)] bg-[var(--wf-card)] p-[clamp(18px,2.6vw,24px)]">
          <p className="m-0 max-w-[52ch] text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-body)]">
            Todavía no hay nada publicado aquí. Estamos grabando los cursos de anuncios y
            de contenido en redes, y aparecerán en esta pantalla en cuanto estén.
          </p>
          <p className="m-0 mt-3 text-[length:var(--wf-small)] leading-relaxed text-[var(--wf-fg-muted)]">
            Mientras tanto, el curso incluido y su PDF están en Mi curso.
          </p>
        </section>
      ) : (
        visible.map((section) => (
          <section key={section.id} className="flex flex-col gap-4">
            <div>
              <h2 className="m-0 text-[clamp(19px,2.6vw,23px)] leading-tight font-bold tracking-[-0.02em] text-[var(--wf-fg)]">
                {section.title}
              </h2>
              {section.description && (
                <p className="m-0 mt-1.5 max-w-[62ch] text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-body)]">
                  {section.description}
                </p>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {(bySection.get(section.id) ?? []).map((item) => (
                <article
                  key={item.id}
                  className="wf-card flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-[var(--wf-edge)] bg-[var(--wf-card)]"
                >
                  {/* Sin cookies y sin vídeos sugeridos al final: esto es
                      material de la casa, y rel=0 evita que YouTube cierre
                      la lección ofreciendo el canal de otro. */}
                  <div className="aspect-video w-full bg-[#050509]">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${item.youtube_id}?rel=0`}
                      title={item.title}
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 p-[clamp(16px,2.2vw,20px)]">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="m-0 text-[17px] leading-snug font-semibold text-[var(--wf-fg)]">
                        {item.title}
                      </h3>
                      {item.duration_label && (
                        <span className="text-[length:var(--wf-kicker)] whitespace-nowrap text-[var(--wf-fg-muted)]">
                          {item.duration_label}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="m-0 text-[length:var(--wf-small)] leading-relaxed text-[var(--wf-fg-body)]">
                        {item.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
