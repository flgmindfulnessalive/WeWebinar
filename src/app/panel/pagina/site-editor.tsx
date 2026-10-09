"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";

import {
  saveWeFunnelSite,
  saveAndPublishWeFunnelSite,
  changeWeFunnelSlug,
  type SaveState,
} from "@/lib/actions/wefunnel-site";
import { uploadFunnelPhoto, type PhotoState } from "@/lib/actions/wefunnel-photo";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import type { WeFunnelSite, checklist } from "@/lib/wefunnels/site";

// The approved editor: five fields and a preview that changes as they type.
//
// The five are the ones that make a page somebody's -- photo, name,
// headline, description, address. Everything the previous editor had
// (location, the three bullets, a video, WhatsApp, the form's own question,
// the accent colour, a pixel) is still here, moved into a section below:
// those are rights people already have on pages that are already published,
// and the approved set is the opening screen, not the whole of what a page
// can carry.

const FIELD =
  "w-full rounded-[10px] border border-[#2D3E57] bg-[#0B1423] px-3.5 py-3 text-[length:var(--wf-body)] text-[#F3F7FF] outline-none placeholder:text-[#5E7290] focus-visible:border-[#43E2EE] focus-visible:ring-2 focus-visible:ring-[#43E2EE]/30";
const LABEL = "block text-[length:var(--wf-small)] font-semibold text-[#D2DFEF]";
const HELP = "m-0 mt-1.5 text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]";
const PANEL = "rounded-[14px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(18px,2.4vw,24px)]";
const H2 = "m-0 text-[18px] font-semibold tracking-[-0.015em] text-[#F3F7FF]";

const ACCENTS: { key: string; hex: string; label: string }[] = [
  { key: "cyan", hex: "#43E2EE", label: "Cian" },
  { key: "blue", hex: "#2E63FF", label: "Azul" },
  { key: "violet", hex: "#A855F7", label: "Violeta" },
  { key: "pink", hex: "#F0479B", label: "Rosa" },
  { key: "green", hex: "#28C98B", label: "Verde" },
  { key: "amber", hex: "#F5A524", label: "Ámbar" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Submit({
  children,
  action,
  variant = "primary",
}: {
  children: React.ReactNode;
  action?: (formData: FormData) => void;
  variant?: "primary" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={action}
      disabled={pending}
      className={
        variant === "primary"
          ? "inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-5 py-3.5 text-[length:var(--wf-body)] font-bold text-[#071521] disabled:opacity-60"
          : "inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#2D3E57] px-5 py-3.5 text-[length:var(--wf-body)] font-semibold text-[#D2DFEF] disabled:opacity-60"
      }
    >
      {pending ? "Guardando…" : children}
    </button>
  );
}

function Avatar({ photo, name, size }: { photo: string | null; name: string; size: number }) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] font-bold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size / 2.8) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function SiteEditor({
  site,
  steps,
  emailVerified,
}: {
  site: WeFunnelSite;
  steps: ReturnType<typeof checklist>;
  emailVerified: boolean;
}) {
  const [saveState, saveAction] = useActionState<SaveState, FormData>(
    saveWeFunnelSite,
    null
  );
  const [publishState, publishAction] = useActionState<SaveState, FormData>(
    saveAndPublishWeFunnelSite,
    null
  );
  const [slugState, slugAction] = useActionState<SaveState, FormData>(
    changeWeFunnelSlug,
    null
  );
  const [photoState, photoAction] = useActionState<PhotoState, FormData>(
    uploadFunnelPhoto,
    null
  );

  // Mirrored locally so the preview moves with the keyboard. The form still
  // posts its own inputs, so nothing here is the source of truth.
  const [name, setName] = useState(site.display_name);
  const [headline, setHeadline] = useState(site.headline ?? "");
  const [description, setDescription] = useState(site.description ?? "");
  const [slug, setSlug] = useState(site.slug);
  const [touched, setTouched] = useState(false);

  const photo = photoState && "url" in photoState ? photoState.url : site.photo_url;
  const isPublished = site.status === "published" && !site.suspended_at;
  const state = publishState ?? saveState;

  const stateLabel = site.suspended_at
    ? "Suspendida"
    : isPublished
      ? touched
        ? "Publicada · Cambios sin guardar"
        : "Publicada"
      : touched
        ? "Borrador · Cambios sin publicar"
        : "Borrador · No publicada";

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="m-0 text-[length:var(--wf-kicker)] font-bold tracking-[0.155em] text-[#70E9EF] uppercase">
          Tu funnel ya es tuyo
        </p>
        <h1 className="m-0 mt-2.5 text-[clamp(26px,4vw,34px)] leading-tight font-extrabold tracking-[-0.03em] text-[#F3F7FF]">
          Personaliza tu funnel
        </h1>
        <p className="m-0 mt-2.5 max-w-[58ch] text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]">
          Ahora hagámoslo a tu medida. Cuéntale a tus visitantes qué pueden descubrir
          contigo.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_1fr]">
        {/* ---------- el formulario ---------- */}
        <form
          action={saveAction}
          className="flex min-w-0 flex-col gap-6"
          onChange={() => setTouched(true)}
        >
          <input type="hidden" name="siteId" value={site.id} />
          <input type="hidden" name="photoUrl" value={photo ?? ""} />

          <section className={`${PANEL} flex flex-col gap-5`}>
            <h2 className={H2}>Tu identidad y tu propuesta</h2>

            <div className="flex flex-wrap items-center gap-4">
              <Avatar photo={photo} name={name} size={64} />
              <div className="min-w-0 flex-1">
                <span className={LABEL}>Tu foto · opcional</span>
                <p className={HELP}>JPG, PNG o WebP. Hasta 5 MB.</p>
                {photoState && "error" in photoState && (
                  <p className="m-0 mt-1.5 text-[length:var(--wf-small)] text-[#FF9A9A]" role="alert">
                    {photoState.error}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="wf-name">
                Nombre público
              </label>
              <input
                id="wf-name"
                name="displayName"
                required
                maxLength={60}
                autoComplete="off"
                className={`${FIELD} mt-2`}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="wf-headline">
                ¿A quién ayudas y con qué?
              </label>
              <input
                id="wf-headline"
                name="headline"
                maxLength={110}
                autoComplete="off"
                placeholder="Explora una forma de construir tu negocio a tiempo parcial."
                className={`${FIELD} mt-2`}
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
              />
              <p className={HELP}>Esta frase será el titular de tu página.</p>
            </div>

            <div>
              <label className={LABEL} htmlFor="wf-description">
                Cuéntales un poco más
              </label>
              <textarea
                id="wf-description"
                name="description"
                maxLength={300}
                rows={4}
                placeholder="Acompaño a personas que quieren conocer el network marketing y aprender a construir equipo. Déjame tus datos y conversemos sobre lo que estás buscando."
                className={`${FIELD} mt-2 resize-y`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <p className={HELP}>
                Explica tu propuesta con claridad y sin prometer resultados.
              </p>
            </div>
          </section>

          {/* Everything the editor had before the approved five. Kept, not
              removed: these are on pages that are already published. */}
          <details className={PANEL}>
            <summary className="cursor-pointer text-[length:var(--wf-body)] font-semibold text-[#D2DFEF]">
              Más opciones de tu página
            </summary>
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <label className={LABEL} htmlFor="wf-location">
                  Dónde estás
                </label>
                <input
                  id="wf-location"
                  name="location"
                  maxLength={120}
                  defaultValue={site.location ?? ""}
                  className={`${FIELD} mt-2`}
                />
              </div>
              {[1, 2, 3].map((n) => (
                <div key={n}>
                  <label className={LABEL} htmlFor={`wf-bullet${n}`}>
                    Punto {n}
                  </label>
                  <input
                    id={`wf-bullet${n}`}
                    name={`bullet${n}`}
                    maxLength={160}
                    defaultValue={site.bullets?.[n - 1] ?? ""}
                    className={`${FIELD} mt-2`}
                  />
                </div>
              ))}
              <div>
                <label className={LABEL} htmlFor="wf-video">
                  Video de Vimeo
                </label>
                <input
                  id="wf-video"
                  name="videoUrl"
                  maxLength={500}
                  defaultValue={site.video_url ?? ""}
                  className={`${FIELD} mt-2`}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="wf-whatsapp">
                  Tu WhatsApp
                </label>
                <input
                  id="wf-whatsapp"
                  name="whatsapp"
                  type="tel"
                  maxLength={32}
                  defaultValue={site.contact_whatsapp ?? ""}
                  className={`${FIELD} mt-2`}
                />
                <p className={HELP}>
                  Para que puedas escribirle a quien te deje su número.
                </p>
              </div>
              <div>
                <label className={LABEL} htmlFor="wf-question">
                  Una pregunta para tu formulario
                </label>
                <input
                  id="wf-question"
                  name="questionLabel"
                  maxLength={160}
                  defaultValue={site.question_label ?? ""}
                  className={`${FIELD} mt-2`}
                />
                <p className={HELP}>
                  Lo que quieras saber de cada persona antes de escribirle.
                </p>
              </div>
              <fieldset className="border-0 p-0">
                <legend className={LABEL}>Color de acento</legend>
                <div className="mt-2.5 flex flex-wrap gap-2.5">
                  {ACCENTS.map((accent) => (
                    <label
                      key={accent.key}
                      className="flex cursor-pointer items-center gap-2 rounded-[9px] border border-[#2D3E57] px-3 py-2 text-[length:var(--wf-small)] text-[#D2DFEF] has-checked:border-[#43E2EE]"
                    >
                      <input
                        type="radio"
                        name="accent"
                        value={accent.key}
                        defaultChecked={site.accent === accent.key}
                        className="sr-only"
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: accent.hex }}
                        aria-hidden="true"
                      />
                      {accent.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                <div>
                  <label className={LABEL} htmlFor="wf-pixel-provider">
                    Píxel
                  </label>
                  <select
                    id="wf-pixel-provider"
                    name="pixelProvider"
                    defaultValue={site.pixel_provider ?? "meta"}
                    className={`${FIELD} mt-2`}
                  >
                    <option value="meta">Meta</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="wf-pixel-id">
                    ID del píxel
                  </label>
                  <input
                    id="wf-pixel-id"
                    name="pixelId"
                    maxLength={40}
                    defaultValue={site.pixel_id ?? ""}
                    className={`${FIELD} mt-2`}
                  />
                  <p className={HELP}>Necesita un plan de WeWebinars.</p>
                </div>
              </div>
            </div>
          </details>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <Submit action={publishAction}>
                {isPublished ? "Guardar y publicar →" : "Publicar mi funnel →"}
              </Submit>
              <Submit variant="ghost">Guardar borrador</Submit>
            </div>
            <p className={HELP}>
              Tú decides cuándo publicar. Podrás editar tu página después.
            </p>
            {state && "error" in state && (
              <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[#FF9A9A]" role="alert">
                {state.error}
              </p>
            )}
            {state && "success" in state && (
              <p className="m-0 text-[length:var(--wf-body)] text-[#4ED8A8]" role="status">
                Guardado.
              </p>
            )}
          </div>
        </form>

        {/* ---------- la vista previa ---------- */}
        <section className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong className="text-[length:var(--wf-body)] font-semibold text-[#F3F7FF]">
              Así verán tu página
            </strong>
            <span className="rounded-full border border-[#2D3E57] px-3 py-1 text-[length:var(--wf-kicker)] text-[#B7C7DC]">
              {stateLabel}
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-[14px] border border-[#3D4C68] bg-[#0B1423]">
            <p
              className="m-0 bg-[#182237] px-4 py-3 text-[length:var(--wf-kicker)] break-all text-[#C1D3E7]"
              style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
            >
              {WEFUNNELS_HOST}/{slug}
            </p>
            <div className="p-[clamp(18px,2.6vw,26px)]">
              <div className="flex items-center gap-3">
                <Avatar photo={photo} name={name} size={44} />
                <strong className="min-w-0 text-[16px] font-semibold text-[#F3F7FF]">
                  {name || "Tu nombre"}
                </strong>
              </div>
              <p className="m-0 mt-5 text-[length:var(--wf-kicker)] font-bold tracking-[0.14em] text-[#70E9EF] uppercase">
                Conoce mi propuesta
              </p>
              <p className="m-0 mt-2 text-[clamp(20px,2.8vw,25px)] leading-[1.18] font-bold tracking-[-0.025em] text-[#F3F7FF]">
                {headline || "Tu titular aparecerá aquí."}
              </p>
              <p className="m-0 mt-3 text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]">
                {description || "Y debajo, lo que quieras contarles de tu propuesta."}
              </p>

              {/* The lead form as the visitor sees it, inert on purpose: this
                  is a preview, and a working form here would write a row on
                  the owner's own page. */}
              <div className="mt-5 flex flex-col gap-2.5 border-t border-[#1F2A3C] pt-5">
                <span className="text-[length:var(--wf-small)] font-semibold text-[#D2DFEF]">Tu nombre</span>
                <p className="m-0 rounded-[9px] border border-[#2D3E57] px-3 py-2.5 text-[length:var(--wf-small)] text-[#5E7290]">
                  ¿Cómo te llamas?
                </p>
                <span className="mt-1 text-[length:var(--wf-small)] font-semibold text-[#D2DFEF]">Email</span>
                <p className="m-0 rounded-[9px] border border-[#2D3E57] px-3 py-2.5 text-[length:var(--wf-small)] text-[#5E7290]">
                  tu@email.com
                </p>
                <p className="m-0 mt-2 rounded-md bg-[#48E0E8] px-3 py-2.5 text-center text-[length:var(--wf-small)] font-bold text-[#051521]">
                  Quiero más información →
                </p>
                <p className="m-0 text-[length:var(--wf-kicker)] leading-relaxed text-[#8498B4]">
                  Al enviar, solicitan que {name || "tú"} les contactes sobre esta
                  propuesta.
                </p>
              </div>
            </div>
            <p className="m-0 border-t border-[#1F2A3C] bg-[#091221] px-4 py-3 text-center text-[length:var(--wf-kicker)] text-[#8498B4]">
              Creado con WeFunnels
            </p>
          </div>

          <p className="m-0 mt-3 text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]">
            Los registros de esta página aparecerán en tu panel, junto con las visitas y la
            conversión.
          </p>

          {!emailVerified && (
            <div className="mt-4 rounded-[13px] border border-[#F5BE52] bg-[#1A1407] p-4">
              <strong className="text-[length:var(--wf-body)] font-semibold text-[#F7D79B]">
                Antes de publicar, verifica tu email.
              </strong>
              <p className="m-0 mt-1.5 text-[length:var(--wf-small)] leading-relaxed text-[#D8C49A]">
                Puedes seguir personalizando tu página mientras completas este paso.
              </p>
            </div>
          )}

          {/* ---------- la dirección ---------- */}
          <form action={slugAction} className="mt-5 flex flex-col gap-3">
            <input type="hidden" name="siteId" value={site.id} />
            <h2 className={H2}>Tu enlace personal</h2>
            <div>
              <label className={LABEL} htmlFor="wf-slug">
                Elige tu dirección
              </label>
              <input
                id="wf-slug"
                name="slug"
                required
                maxLength={32}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                aria-describedby="wf-slug-help"
                className={`${FIELD} mt-2`}
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                disabled={Boolean(site.published_at)}
              />
              <p className={HELP} id="wf-slug-help">
                {site.published_at
                  ? "Tu dirección ya está publicada y no puede cambiar: el enlace que compartiste tiene que seguir llevando a tu página."
                  : "Letras minúsculas, números y guiones. Comprobamos que esté libre al guardarla."}
              </p>
            </div>
            {!site.published_at && (
              <>
                <Submit variant="ghost">Guardar mi dirección</Submit>
                {slugState && "error" in slugState && (
                  <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[#FF9A9A]" role="alert">
                    {slugState.error}
                  </p>
                )}
                {slugState && "success" in slugState && (
                  <p className="m-0 text-[length:var(--wf-body)] text-[#4ED8A8]" role="status">
                    Tu dirección quedó guardada.
                  </p>
                )}
              </>
            )}
          </form>
        </section>
      </div>

      {/* ---------- la foto, en su propio formulario ---------- */}
      <form action={photoAction} className={`${PANEL} flex flex-wrap items-end gap-4`}>
        <div className="min-w-0 flex-1">
          <label className={LABEL} htmlFor="wf-photo">
            Cambiar tu foto
          </label>
          <input
            id="wf-photo"
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-2 w-full text-[length:var(--wf-small)] text-[#B7C7DC] file:mr-3 file:rounded-md file:border-0 file:bg-[#1C2A3F] file:px-3 file:py-2 file:text-[13px] file:font-semibold file:text-[#D2DFEF]"
          />
        </div>
        <Submit variant="ghost">Subir</Submit>
      </form>

      {steps && (
        <p className="m-0 text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]">
          {steps.published
            ? "Tu página está publicada. Comparte tu enlace y revisa tus registros en el panel."
            : "Cuando la publiques, tu enlace queda vivo y empieza a captar registros."}
        </p>
      )}
    </div>
  );
}
