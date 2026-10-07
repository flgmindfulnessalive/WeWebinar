import { redirect } from "next/navigation";

import { getPanelViewer } from "@/lib/wefunnels/site";
import { courseRoomUrl } from "@/lib/wefunnels/course-room";

// Where re-watching lives. It points at the canonical course, not at a
// distributor's own copy: that copy exists to be given away, and sending
// its owner back through their own claim CTA would be absurd.
//
// Until the course is recorded and WEFUNNELS_COURSE_WEBINAR_ID is set,
// this stays the placeholder it has always been -- an honest "we are
// recording it" beats a player that plays nothing.
export default async function PanelCoursePage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/curso");
  if (!viewer.site) redirect("/panel");

  const roomUrl = await courseRoomUrl();

  return (
    <div className="flex max-w-[620px] flex-col gap-5">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">El curso</h1>
      <div className="flex flex-col gap-4 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
        <p className="m-0 text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
          Cómo nunca quedarte sin prospectos
        </p>
        {roomUrl ? (
          <>
            <p className="m-0 text-[16px] leading-relaxed text-[#A9B0C9]">
              Vuelve a verlo cuantas veces quieras. Son 25 minutos y empieza desde el
              principio cada vez que entras.
            </p>
            <a
              href={roomUrl}
              className="rounded-xl bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-7 py-4 text-center text-[16px] font-semibold text-white no-underline"
            >
              Ver el curso
            </a>
          </>
        ) : (
          <p className="m-0 text-[16px] leading-relaxed text-[#A9B0C9]">
            Aquí vas a poder volver a verlo cuantas veces quieras. Lo estamos grabando: te
            avisamos por correo en cuanto esté.
          </p>
        )}
      </div>
      <p className="m-0 text-sm leading-relaxed text-[#6E7694]">
        Mientras tanto, lo que más mueve la aguja es tener tu página publicada y
        mandarle gente desde donde ya estés.
      </p>
    </div>
  );
}
