import { redirect } from "next/navigation";

import { getPanelViewer } from "@/lib/wefunnels/site";

// The course is the asset everything else hangs off, and it does not exist
// yet. An honest placeholder beats a fake player: this section exists so
// the shape of the panel is right and so re-watching has a home the day the
// room is mounted.
export default async function PanelCoursePage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/curso");
  if (!viewer.site) redirect("/panel");

  return (
    <div className="flex max-w-[620px] flex-col gap-5">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">El curso</h1>
      <div className="flex flex-col gap-4 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
        <p className="m-0 text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
          Cómo nunca quedarte sin prospectos
        </p>
        <p className="m-0 text-[16px] leading-relaxed text-[#A9B0C9]">
          Aquí vas a poder volver a verlo cuantas veces quieras. Lo estamos grabando: te
          avisamos por correo en cuanto esté.
        </p>
      </div>
      <p className="m-0 text-sm leading-relaxed text-[#6E7694]">
        Mientras tanto, lo que más mueve la aguja es tener tu página publicada y
        mandarle gente desde donde ya estés.
      </p>
    </div>
  );
}
