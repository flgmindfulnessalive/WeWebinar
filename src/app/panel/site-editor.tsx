"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveWeFunnelSite,
  setWeFunnelPublished,
  type SaveState,
} from "@/lib/actions/wefunnel-site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import type { WeFunnelSite } from "@/lib/wefunnels/site";

const FIELD =
  "w-full rounded-[10px] border border-[#23233A] bg-[#050509] px-3.5 py-3 text-[15px] text-white outline-none focus-visible:border-[#2BD7F5]";
const LABEL = "text-[13px] font-semibold text-[#A9B0C9]";

const ACCENTS: { key: string; hex: string; label: string }[] = [
  { key: "cyan", hex: "#2BD7F5", label: "Cian" },
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

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-[11px] border border-[#23233A] bg-[#0D0D15] px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Guardar cambios"}
    </button>
  );
}

function PublishButton({ published }: { published: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        published
          ? "rounded-[10px] border border-[#23233A] bg-[#0D0D15] px-5 py-3 text-[15px] font-semibold text-[#A9B0C9] disabled:opacity-60"
          : "rounded-[10px] bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-6 py-3 text-[15px] font-semibold text-white disabled:opacity-60"
      }
    >
      {pending ? "…" : published ? "Despublicar" : "Publicar"}
    </button>
  );
}

function Step({ done, index, label }: { done: boolean; index: number; label: string }) {
  return (
    <span
      className={
        done
          ? "inline-flex items-center gap-2.5 text-[15px] text-[#6E7694]"
          : "inline-flex items-center gap-2.5 text-[15px] font-semibold text-white"
      }
    >
      <span
        className={
          done
            ? "inline-flex h-[22px] w-[22px] items-center justify-center rounded-[7px] bg-[#14263B] text-xs text-[#2BD7F5]"
            : "inline-flex h-[22px] w-[22px] items-center justify-center rounded-[7px] bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] text-xs font-semibold text-white"
        }
        aria-hidden="true"
      >
        {done ? "✓" : index}
      </span>
      {label}
    </span>
  );
}

export function SiteEditor({
  site,
  steps,
}: {
  site: WeFunnelSite;
  steps: { watched: boolean; personalised: boolean; published: boolean };
}) {
  const [saveState, saveAction] = useActionState<SaveState, FormData>(saveWeFunnelSite, null);
  const [publishState, publishAction] = useActionState<SaveState, FormData>(
    setWeFunnelPublished,
    null
  );

  const [displayName, setDisplayName] = useState(site.display_name);
  const [headline, setHeadline] = useState(site.headline ?? "");
  const [bullets, setBullets] = useState<string[]>([
    site.bullets?.[0] ?? "",
    site.bullets?.[1] ?? "",
    site.bullets?.[2] ?? "",
  ]);
  const [accent, setAccent] = useState(site.accent);

  const published = site.status === "published";
  const suspended = Boolean(site.suspended_at);
  const accentHex = ACCENTS.find((a) => a.key === accent)?.hex ?? "#2BD7F5";

  return (
    <div className="flex flex-col gap-6">
      {suspended ? (
        <div className="rounded-2xl border border-[#A855F7] bg-gradient-to-br from-[#10163A] to-[#250F3D] p-5">
          <p className="m-0 text-xs font-semibold tracking-[0.08em] text-[#E879F9] uppercase">
            Página suspendida
          </p>
          <p className="mt-2 mb-0 text-[15px] leading-relaxed text-[#A9B0C9]">
            Tu página no está visible y no puede editarse mientras se revisa. Tus
            registrados siguen intactos. Escríbenos para resolverlo.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#23233A] bg-[#0D0D15] px-6 py-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Step done={steps.watched} index={1} label="Mira el curso" />
            <Step done={steps.personalised} index={2} label="Personaliza tu página" />
            <Step done={steps.published} index={3} label="Publícala" />
          </div>
          <form action={publishAction}>
            <input type="hidden" name="published" value={published ? "false" : "true"} />
            <PublishButton published={published} />
          </form>
        </div>
      )}

      {publishState && "error" in publishState && (
        <p role="alert" className="m-0 text-sm text-[#FF8A8A]">
          {publishState.error}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <form action={saveAction} className="flex min-w-0 flex-[999_1_340px] flex-col gap-5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
          <input type="hidden" name="siteId" value={site.id} />

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
              Tu dirección
            </span>
            <a
              href={`https://${WEFUNNELS_HOST}/${site.slug}`}
              className="text-[15px] break-all no-underline"
              style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
            >
              <span className="text-[#6E7694]">{WEFUNNELS_HOST}/</span>
              <span className="font-medium text-[#2BD7F5]">{site.slug}</span>
            </a>
            <span className="text-[13px] leading-relaxed text-[#6E7694]">
              {site.published_at
                ? "Ya está fija: un enlace que circuló no puede llevar a otra persona."
                : "Puedes cambiarla hasta que publiques. Después queda fija."}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ed-name" className={LABEL}>Tu nombre</label>
            <input
              id="ed-name" name="displayName" type="text" className={FIELD}
              value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ed-location" className={LABEL}>Dónde estás</label>
            <input
              id="ed-location" name="location" type="text" className={FIELD}
              defaultValue={site.location ?? ""} placeholder="Monterrey, México"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ed-headline" className={LABEL}>Titular</label>
            <textarea
              id="ed-headline" name="headline" rows={2}
              className={`${FIELD} resize-y leading-snug`}
              value={headline} onChange={(e) => setHeadline(e.target.value)}
              placeholder="A quién ayudas y a conseguir qué."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ed-video" className={LABEL}>Video (YouTube o Vimeo)</label>
            <input
              id="ed-video" name="videoUrl" type="url" className={FIELD}
              defaultValue={site.video_url ?? ""} placeholder="youtube.com/watch?v=…"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className={LABEL}>Tres cosas que ofreces</span>
            {bullets.map((value, index) => (
              <input
                key={index}
                name={`bullet${index + 1}`}
                type="text"
                aria-label={`Punto ${index + 1}`}
                className={FIELD}
                value={value}
                onChange={(e) =>
                  setBullets((prev) => prev.map((b, i) => (i === index ? e.target.value : b)))
                }
              />
            ))}
          </div>

          <div className="flex flex-col gap-1.5 border-t border-[#1A1A2A] pt-5">
            <label htmlFor="ed-whatsapp" className={LABEL}>Tu WhatsApp</label>
            <input
              id="ed-whatsapp" name="whatsapp" type="tel" className={FIELD}
              defaultValue={site.contact_whatsapp ?? ""} placeholder="+52 81 1234 5678"
            />
            <span className="text-[13px] leading-relaxed text-[#6E7694]">
              Es el botón que ve quien te deja sus datos, con el mensaje ya escrito. Sin
              esto solo verá que le escribirás tú.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ed-question" className={LABEL}>Tu pregunta del formulario</label>
            <input
              id="ed-question" name="questionLabel" type="text" className={FIELD}
              defaultValue={site.question_label ?? ""}
              placeholder="¿Qué es lo que más te cuesta hoy?"
            />
          </div>

          <fieldset className="flex flex-col gap-2 border-0 border-t border-[#1A1A2A] p-0 pt-5">
            <legend className={`${LABEL} px-0`}>Color de acento</legend>
            <div className="flex flex-wrap gap-2.5">
              {ACCENTS.map((option) => (
                <label key={option.key} className="cursor-pointer">
                  <input
                    type="radio" name="accent" value={option.key}
                    checked={accent === option.key}
                    onChange={() => setAccent(option.key)}
                    className="sr-only peer"
                  />
                  <span
                    title={option.label}
                    className="block h-8 w-8 rounded-[9px] peer-focus-visible:ring-2 peer-focus-visible:ring-white"
                    style={{
                      background: option.hex,
                      boxShadow:
                        accent === option.key ? "0 0 0 2px #000, 0 0 0 4px #fff" : undefined,
                    }}
                  />
                  <span className="sr-only">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5 border-t border-[#1A1A2A] pt-5">
            <label htmlFor="ed-pixel" className={LABEL}>ID de píxel</label>
            <div className="flex flex-wrap gap-2">
              <select
                name="pixelProvider"
                aria-label="Proveedor del píxel"
                defaultValue={site.pixel_provider ?? "meta"}
                className={`${FIELD} w-auto flex-none`}
              >
                <option value="meta">Meta</option>
                <option value="tiktok">TikTok</option>
              </select>
              <input
                id="ed-pixel" name="pixelId" type="text"
                className={`${FIELD} min-w-0 flex-1`}
                defaultValue={site.pixel_id ?? ""} placeholder="1234567890123456"
                style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
              />
            </div>
            <span className="text-[13px] leading-relaxed text-[#6E7694]">
              Solo el número. Nosotros ponemos el script oficial, y la conversión se
              dispara cuando alguien envía tu formulario.
            </span>
          </div>

          {saveState && "error" in saveState && (
            <p role="alert" className="m-0 text-sm text-[#FF8A8A]">{saveState.error}</p>
          )}
          {saveState && "success" in saveState && (
            <p className="m-0 text-sm text-[#2BD7F5]">Guardado.</p>
          )}

          <SaveButton />
        </form>

        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5">
          <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
            Vista previa
          </span>
          <div className="flex flex-col gap-3.5 rounded-2xl border border-[#23233A] bg-[#050509] p-5">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] text-[15px] font-bold text-white"
                aria-hidden="true"
              >
                {initials(displayName)}
              </span>
              <strong className="text-[15px] font-semibold">{displayName}</strong>
            </div>
            {headline && (
              <strong className="text-[20px] leading-tight font-extrabold tracking-tight">
                {headline}
              </strong>
            )}
            <div className="aspect-video rounded-[10px] border border-[#1A1A2A] bg-[#0D0D15]" />
            <div className="flex flex-col gap-2">
              {bullets.filter(Boolean).map((bullet, index) => (
                <span key={index} className="flex items-start gap-2.5 text-sm leading-snug text-[#A9B0C9]">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: accentHex }}
                    aria-hidden="true"
                  />
                  {bullet}
                </span>
              ))}
            </div>
            <div className="h-9 rounded-[9px] border border-[#23233A] bg-[#0D0D15]" />
            <span className="text-xs text-[#4A5173]">Creado con WeFunnels</span>
          </div>
        </div>
      </div>
    </div>
  );
}
