"use client";

import { useEffect, useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

type Stats = { visits: number; leads: number; gift_visits: number; claims: number };

const PERIODS: { days: number; label: string }[] = [
  { days: 7, label: "Últimos 7 días" },
  { days: 30, label: "Últimos 30 días" },
];

// The performance block, with the selector the approved panel puts on it.
//
// Client-side so changing the period does not reload the screen, and one
// RPC call per change rather than three: visits come from a daily rollup
// and registros from timestamps, and wefunnel_site_stats cuts both on the
// same calendar window. Asking separately would make the conversion rate
// disagree with its own numerator at the edges of the window.
export function PeriodStats() {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void supabase
      .rpc("wefunnel_site_stats", { p_days: days })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.[0]) {
          setFailed(true);
          return;
        }
        setFailed(false);
        setStats(data[0] as Stats);
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  const visits = stats?.visits ?? 0;
  const leads = stats?.leads ?? 0;
  // Only when there is traffic: a percentage of nothing reads as a verdict
  // on them rather than as the absence of data.
  const rate = visits > 0 ? Math.round((leads / visits) * 100) : null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong className="text-[16px] font-semibold text-[#F3F7FF]">
          Rendimiento de tu página
        </strong>
        <label className="flex items-center gap-2 text-[length:var(--wf-body)] text-[#8498B4]">
          Periodo
          <select
            value={days}
            onChange={(event) =>
              startTransition(() => setDays(Number(event.target.value)))
            }
            className="rounded-lg border border-[#2D3E57] bg-[#0B1423] px-3 py-2 text-[length:var(--wf-body)] text-[#D2DFEF]"
          >
            {PERIODS.map((period) => (
              <option key={period.days} value={period.days}>
                {period.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={`grid gap-4 sm:grid-cols-3 ${pending ? "opacity-60" : ""}`}
        aria-live="polite"
      >
        <Metric
          label="Visitas"
          value={stats ? String(visits) : "—"}
          note="Navegadores distintos por día"
        />
        <Metric
          label="Registros"
          value={stats ? String(leads) : "—"}
          note="Contactos nuevos"
        />
        <Metric
          label="Conversión"
          value={rate === null ? "—" : `${rate}%`}
          note="Registros / visitas"
          accent
        />
      </div>

      {failed && (
        <p className="m-0 text-[length:var(--wf-body)] text-[#F5BE52]">
          No pudimos cargar tus números ahora mismo. Vuelve a abrir esta pantalla en un
          rato.
        </p>
      )}
      {stats && visits === 0 && (
        <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[#8498B4]">
          Todavía no hay visitas en este periodo. Comparte tu enlace y vuelve a mirar.
        </p>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[14px] border border-[#2D3E57] bg-[#0E192A] p-5">
      <p className="m-0 text-[length:var(--wf-small)] tracking-[0.1em] text-[#8498B4] uppercase">{label}</p>
      <p
        className={`m-0 mt-2 text-[clamp(30px,4vw,40px)] leading-none font-extrabold tracking-[-0.03em] tabular-nums ${
          accent ? "text-[#43E2EE]" : "text-[#F3F7FF]"
        }`}
      >
        {value}
      </p>
      <p className="m-0 mt-2 text-[length:var(--wf-small)] text-[#8498B4]">{note}</p>
    </div>
  );
}
