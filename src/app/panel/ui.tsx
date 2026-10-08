import Link from "next/link";
import type { ReactNode } from "react";

import type { WeFunnelFollowUpStatus } from "@/lib/supabase/database.types";

export const STATUS_LABEL: Record<WeFunnelFollowUpStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  en_conversacion: "En conversación",
  no_interesado: "No interesado",
};

export const STATUS_ORDER: WeFunnelFollowUpStatus[] = ["nuevo", "contactado", "en_conversacion", "no_interesado"];

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(raw: string | undefined): Period {
  const n = Number(raw);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 30;
}

export const DATE_SHORT = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
export const DATE_LONG = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" });

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mb-5 rounded-[11px] border border-[#2b3c54] bg-[#0e1929] p-5 ${className}`}>{children}</div>;
}

export function Tag({ children, tone = "ok" }: { children: ReactNode; tone?: "ok" | "draft" | "warn" }) {
  const tones = {
    ok: "bg-[#193a3c] text-[#a0f0df]",
    draft: "bg-[#1f2b40] text-[#c3d2e8]",
    warn: "bg-[#3a2a1a] text-[#ffd9a8]",
  } as const;
  return <span className={`inline-block rounded-[5px] px-2 py-1 text-[11px] ${tones[tone]}`}>{children}</span>;
}

export function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-[11px] border border-[#283b54] bg-[#101b2c] px-3 py-4 sm:p-5">
      <div className="text-[12px] text-[#a8bfd8]">{label}</div>
      <div className="my-1.5 text-[28px] font-bold tracking-[-1px] text-[#e9f9ff] tabular-nums sm:text-[34px]">{value}</div>
      <small className="text-[11px] text-[#a0b8d2]">{hint}</small>
    </div>
  );
}

export function PeriodPicker({ period, basePath }: { period: Period; basePath: string }) {
  return (
    <div role="group" aria-label="Periodo" className="inline-flex overflow-hidden rounded-[7px] border border-[#3d516d] text-[12px]">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={`${basePath}?periodo=${p}`}
          aria-current={p === period ? "true" : undefined}
          scroll={false}
          className={`px-3 py-2 no-underline ${p === period ? "bg-[#183443] text-[#a1f0f1]" : "bg-[#101e31] text-[#e6f3ff] hover:text-white"}`}
        >
          {p} días
        </Link>
      ))}
    </div>
  );
}

export function formatConversion(visits: number, registrations: number): string {
  if (visits <= 0) return "—";
  const pct = (registrations / visits) * 100;
  return `${pct < 10 && pct > 0 ? pct.toFixed(1) : Math.round(pct)}%`;
}
