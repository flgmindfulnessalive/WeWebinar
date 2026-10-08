"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { Avatar, FIELD, Kicker, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/wefunnels/brand";
import {
  resendVerificationEmail,
  saveWeFunnelSite,
  unpublishWeFunnelSite,
  uploadWeFunnelPhoto,
  type SaveState,
} from "@/lib/actions/wefunnel-site";
import { normalizeSlug } from "@/lib/wefunnels/slug";
import type { WeFunnelSite } from "@/lib/wefunnels/site";

const LABEL = "mb-1.5 block text-[13px] text-[#e2edfc]";
const HELP = "mt-1.5 mb-0 text-[12px] text-[#a8bdd5]";

const HEADLINE_EXAMPLE = "Explora una forma de construir tu negocio a tiempo parcial.";
const DESCRIPTION_EXAMPLE =
  "Acompaño a personas que quieren conocer el network marketing y aprender a construir equipo. Déjame tus datos y conversemos sobre lo que estás buscando.";

const ACCENTS: { key: string; hex: string; label: string }[] = [
  { key: "cyan", hex: "#2BD7F5", label: "Cian" },
  { key: "blue", hex: "#2E63FF", label: "Azul" },
  { key: "violet", hex: "#A855F7", label: "Violeta" },
  { key: "pink", hex: "#F0479B", label: "Rosa" },
  { key: "green", hex: "#28C98B", label: "Verde" },
  { key: "amber", hex: "#F5A524", label: "Ámbar" },
];

function IntentButton({ intent, className, children }: { intent: "draft" | "publish"; className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="intent" value={intent} disabled={pending} className={className}>
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function SiteEditor({
  site,
  emailVerified,
  wefunnelsHost,
  welcome,
}: {
  site: WeFunnelSite;
  emailVerified: boolean;
  wefunnelsHost: string;
  welcome: boolean;
}) {
  const [dirty, setDirty] = useState(false);
  const [state, action] = useActionState<SaveState, FormData>(async (prev, formData) => {
    const result = await saveWeFunnelSite(prev, formData);
    if (result && "success" in result) setDirty(false);
    return result;
  }, null);
  const [displayName, setDisplayName] = useState(site.display_name);
  const [headline, setHeadline] = useState(site.headline ?? "");
  const [description, setDescription] = useState(site.description ?? "");
  const [slug, setSlug] = useState(site.slug);
  const [photoUrl, setPhotoUrl] = useState(site.photo_url ?? "");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [resent, setResent] = useState<"idle" | "sent" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  const published = site.status === "published";
  const suspended = Boolean(site.suspended_at);
  const slugLocked = Boolean(site.published_at);

  const stateLabel = published
    ? dirty
      ? "Publicada · Cambios sin guardar"
      : "Publicada"
    : dirty
      ? "Borrador · Cambios sin publicar"
      : "Borrador · No publicada";

  function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setPhotoError("Elige un archivo JPG, PNG o WebP de hasta 5 MB.");
      return;
    }
    setPhotoError(null);
    startUpload(async () => {
      const data = new FormData();
      data.set("file", file);
      const result = await uploadWeFunnelPhoto(data);
      if ("error" in result) setPhotoError(result.error);
      else {
        setPhotoUrl(result.url);
        setDirty(true);
      }
    });
  }

  if (suspended) {
    return (
      <div className="max-w-[640px] rounded-xl border border-[#A855F7] bg-[#151e31] p-5">
        <Kicker>Página suspendida</Kicker>
        <p className="mt-2 mb-0 text-[15px] leading-relaxed text-[#c3d2e8]">
          Tu página no está visible y no puede editarse mientras se revisa. Tus registros siguen
          intactos. Escríbenos para resolverlo.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Kicker>{welcome ? "Tu funnel ya es tuyo" : "Tu funnel"}</Kicker>
        <h1 className="mt-2 mb-2 text-[29px] leading-tight font-bold tracking-[-1px] sm:text-[32px]">
          Personaliza tu funnel
        </h1>
        <p className="m-0 text-[15px] text-[#b4c6dc]">
          {welcome
            ? "Tu funnel ya es tuyo. Ahora hagámoslo a tu medida."
            : "Cuéntale a tus visitantes qué pueden descubrir contigo."}
        </p>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-2">
        <form action={action} onChange={() => setDirty(true)} className="min-w-0 rounded-xl border border-[#293a51] bg-[#0d1727] p-5 sm:p-6">
          <h2 className="mt-0 mb-4 text-[18px] font-bold">Tu identidad y tu propuesta</h2>
          <input type="hidden" name="photoUrl" value={photoUrl} />

          <div className="mb-5 flex flex-wrap items-center gap-3.5">
            <Avatar name={displayName} photoUrl={photoUrl || null} size={57} />
            <div className="min-w-0">
              <span className={LABEL}>Tu foto · opcional</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={SECONDARY_BUTTON}>
                  {uploading ? "Subiendo…" : photoUrl ? "Cambiar foto" : "Subir foto"}
                </button>
                {photoUrl && (
                  <button type="button" onClick={() => { setPhotoUrl(""); setDirty(true); }} className={SECONDARY_BUTTON}>
                    Quitar
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} className="sr-only" aria-label="Elegir foto" tabIndex={-1} />
              <p className={HELP}>JPG, PNG o WebP. Hasta 5 MB.</p>
              {photoError && <p role="alert" className="mt-1 mb-0 text-[13px] text-[#ffb4b4]">{photoError}</p>}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="ed-name" className={LABEL}>Nombre público</label>
            <input id="ed-name" name="displayName" required maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={FIELD} />
          </div>

          <div className="mb-4">
            <label htmlFor="ed-headline" className={LABEL}>¿A quién ayudas y con qué?</label>
            <input id="ed-headline" name="headline" maxLength={110} value={headline} placeholder={HEADLINE_EXAMPLE} onChange={(e) => setHeadline(e.target.value)} className={FIELD} aria-describedby="ed-headline-help" />
            <p id="ed-headline-help" className={HELP}>Esta frase será el titular de tu página.</p>
          </div>

          <div className="mb-4">
            <label htmlFor="ed-description" className={LABEL}>Cuéntales un poco más</label>
            <textarea id="ed-description" name="description" maxLength={300} rows={4} value={description} placeholder={DESCRIPTION_EXAMPLE} onChange={(e) => setDescription(e.target.value)} className={`${FIELD} min-h-[100px] resize-y`} aria-describedby="ed-description-help" />
            <p id="ed-description-help" className={HELP}>Explica tu propuesta con claridad y sin prometer resultados.</p>
          </div>

          <div className="my-5 h-px bg-[#2b3b51]" />
          <h2 className="mt-0 mb-3 text-[18px] font-bold">Tu enlace personal</h2>
          <label htmlFor="ed-slug" className={LABEL}>Elige tu dirección</label>
          <input
            id="ed-slug"
            name="slug"
            maxLength={32}
            value={slug}
            readOnly={slugLocked}
            onChange={(e) => setSlug(normalizeSlug(e.target.value))}
            className={`${FIELD} ${slugLocked ? "opacity-70" : ""}`}
            aria-describedby="ed-slug-help"
          />
          <p id="ed-slug-help" className={HELP}>
            {slugLocked
              ? "Tu enlace ya es definitivo: un enlace que circuló no puede llevar a otra persona."
              : "Usa letras minúsculas, números y guiones. La disponibilidad se comprueba al guardar."}
          </p>
          <p className="mt-2 mb-0 text-[12px] break-all text-[#84e1ed]">{wefunnelsHost}/{slug || "tu-nombre"}</p>

          <details className="wf-details mt-5 border-t border-[#2b3b51] pt-4">
            <summary className="flex min-h-[44px] items-center justify-between gap-3 text-[14px] text-[#dcecff]">
              Más opciones (video, puntos, WhatsApp, píxel)
            </summary>
            <div className="mt-3 flex flex-col gap-4">
              <div>
                <label htmlFor="ed-location" className={LABEL}>Dónde estás</label>
                <input id="ed-location" name="location" maxLength={120} defaultValue={site.location ?? ""} className={FIELD} />
              </div>
              <div>
                <label htmlFor="ed-video" className={LABEL}>Video (YouTube o Vimeo)</label>
                <input id="ed-video" name="videoUrl" type="url" defaultValue={site.video_url ?? ""} placeholder="youtube.com/watch?v=…" className={FIELD} />
              </div>
              <fieldset className="m-0 border-0 p-0">
                <legend className={LABEL}>Tres cosas que ofreces</legend>
                {[0, 1, 2].map((i) => (
                  <input key={i} name={`bullet${i + 1}`} maxLength={160} defaultValue={site.bullets?.[i] ?? ""} aria-label={`Punto ${i + 1}`} className={`${FIELD} mb-2`} />
                ))}
              </fieldset>
              <div>
                <label htmlFor="ed-whatsapp" className={LABEL}>Tu WhatsApp</label>
                <input id="ed-whatsapp" name="whatsapp" type="tel" defaultValue={site.contact_whatsapp ?? ""} placeholder="+52 81 1234 5678" className={FIELD} />
                <p className={HELP}>Aparece como botón para escribirte después de que alguien deja sus datos.</p>
              </div>
              <div>
                <label htmlFor="ed-question" className={LABEL}>Una pregunta en tu formulario</label>
                <input id="ed-question" name="questionLabel" maxLength={160} defaultValue={site.question_label ?? ""} placeholder="¿Qué es lo que más te cuesta hoy?" className={FIELD} />
              </div>
              <fieldset className="m-0 border-0 p-0">
                <legend className={LABEL}>Color de los puntos</legend>
                <div className="flex flex-wrap gap-2.5">
                  {ACCENTS.map((option) => (
                    <label key={option.key} className="cursor-pointer">
                      <input type="radio" name="accent" value={option.key} defaultChecked={site.accent === option.key} className="peer sr-only" />
                      <span title={option.label} className="block h-8 w-8 rounded-[9px] ring-offset-2 ring-offset-[#0d1727] peer-checked:ring-2 peer-checked:ring-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#76e3ed]" style={{ background: option.hex }} />
                      <span className="sr-only">{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="ed-pixel" className={LABEL}>ID de píxel</label>
                <div className="flex flex-wrap gap-2">
                  <select name="pixelProvider" aria-label="Proveedor del píxel" defaultValue={site.pixel_provider ?? "meta"} className={`${FIELD} w-auto flex-none`}>
                    <option value="meta">Meta</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                  <input id="ed-pixel" name="pixelId" defaultValue={site.pixel_id ?? ""} placeholder="1234567890123456" className={`${FIELD} min-w-0 flex-1`} />
                </div>
              </div>
            </div>
          </details>

          {state && "error" in state && <p role="alert" className="mt-4 mb-0 text-[14px] text-[#ffb4b4]">{state.error}</p>}
          {state && "success" in state && (
            <p role="status" className="mt-4 mb-0 rounded-lg bg-[#143038] p-3 text-[13px] text-[#c7f6ed]">
              {state.published ? "¡Listo! Tu funnel está publicado." : "Cambios guardados."}
            </p>
          )}

          <div className="mt-6 grid gap-2.5">
            {published ? (
              <IntentButton intent="publish" className={`${PRIMARY_BUTTON} w-full`}>Guardar y publicar cambios</IntentButton>
            ) : (
              <>
                <IntentButton intent="publish" className={`${PRIMARY_BUTTON} w-full`}>Publicar mi funnel →</IntentButton>
                <IntentButton intent="draft" className={SECONDARY_BUTTON}>Guardar borrador</IntentButton>
              </>
            )}
          </div>
          <p className={HELP}>
            {published
              ? "Los cambios se ven en tu página en cuanto los guardas."
              : "Tú decides cuándo publicar. Podrás editar tu página después."}
          </p>
        </form>

        <section className="min-w-0">
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <strong className="text-[14px]">Así verán tu página</strong>
            <span className="text-[12px] text-[#98d9d9]" aria-live="polite">{stateLabel}</span>
          </div>
          <div className="overflow-hidden rounded-[13px] border border-[#3d526d] bg-[#0a1322] shadow-[0_20px_50px_#0005]">
            <div className="bg-[#19253a] px-4 py-3 text-[11px] break-all text-[#aebfd6]">{wefunnelsHost}/{slug || "tu-nombre"}</div>
            <div className="bg-[radial-gradient(ellipse_at_100%_0,#32225977,transparent_60%),#0a1322] px-5 py-7 break-words sm:px-6">
              <div className="mb-6 flex items-center gap-3 text-[14px]">
                <Avatar name={displayName} photoUrl={photoUrl || null} size={48} />
                <strong>{displayName || "Tu nombre"}</strong>
              </div>
              <Kicker>Conoce mi propuesta</Kicker>
              <p className={`mt-3 mb-4 text-[26px] leading-[1.16] font-bold tracking-[-0.7px] ${headline ? "text-[#f2f7ff]" : "text-[#7f93ad]"}`}>
                {headline || HEADLINE_EXAMPLE}
              </p>
              <p className={`mb-5 text-[14px] whitespace-pre-line ${description ? "text-[#b4c6dc]" : "text-[#7f93ad]"}`}>
                {description || DESCRIPTION_EXAMPLE}
              </p>
              <div className="border-t border-[#35445d] pt-5" aria-hidden="true">
                <span className="mb-1 block text-[11px] text-[#e2edfc]">Tu nombre</span>
                <div className="mb-3 h-10 rounded-md border border-[#3d506b] bg-[#080f1b] px-3 py-2.5 text-[13px] text-[#90a6c1]">¿Cómo te llamas?</div>
                <span className="mb-1 block text-[11px] text-[#e2edfc]">Email</span>
                <div className="mb-3 h-10 rounded-md border border-[#3d506b] bg-[#080f1b] px-3 py-2.5 text-[13px] text-[#90a6c1]">tu@email.com</div>
                <div className="wf-btn-primary rounded-lg py-3 text-center text-[14px] font-bold">Quiero más información →</div>
                <p className="mt-3 mb-0 text-[11px] text-[#a8bdd5]">
                  Al enviar, solicitas que {displayName || "la persona responsable"} te contacte sobre esta propuesta.
                </p>
              </div>
            </div>
            <div className="border-t border-[#23334b] p-3 text-center text-[11px] text-[#9fb3cf]">Creado con WeFunnels</div>
          </div>
          <p className="py-4 text-[13px] text-[#a8bdd3]">
            Los registros de esta página aparecerán en tu panel, junto con las visitas y la conversión.
          </p>

          {!emailVerified && (
            <div className="rounded-lg border border-[#354460] bg-[#151e31] p-4 text-[13px] text-[#c3d2e8]">
              <strong className="text-[#f2f7ff]">Antes de publicar, verifica tu email.</strong>
              <br />
              Puedes seguir personalizando tu página mientras completas este paso.
              <div className="mt-3">
                <button
                  type="button"
                  className={SECONDARY_BUTTON}
                  disabled={resent === "sent"}
                  onClick={async () => setResent((await resendVerificationEmail()).ok ? "sent" : "error")}
                >
                  {resent === "sent" ? "Te enviamos un nuevo enlace" : "Reenviar email de verificación"}
                </button>
                {resent === "error" && <p role="alert" className="mt-2 mb-0 text-[#ffb4b4]">No pudimos reenviarlo. Intenta en unos minutos.</p>}
              </div>
            </div>
          )}

          {published && (
            <form action={unpublishWeFunnelSite} className="mt-4">
              <button type="submit" className="min-h-[40px] text-[13px] text-[#9fb6d0] underline underline-offset-4">
                Despublicar mi página
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
