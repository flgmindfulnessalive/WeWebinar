"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";

import { secondsToClock } from "@/lib/time";

type Registrant = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  computedSessionStart: string;
  createdAt: string;
  lastPositionSeconds: number | null;
};

export function RegistrantsTable({
  registrants,
  durationSeconds,
}: {
  registrants: Registrant[];
  durationSeconds: number;
}) {
  // null = default order (as fetched, newest registration first); true/false
  // = sorted by watch position. Cycles null -> desc -> asc -> null on click.
  const [sortDesc, setSortDesc] = useState<boolean | null>(null);

  const sorted = useMemo(() => {
    if (sortDesc === null) return registrants;
    return [...registrants].sort((a, b) => {
      const av = a.lastPositionSeconds;
      const bv = b.lastPositionSeconds;
      // Registrants who never attended have no position -- keep them at
      // the bottom regardless of sort direction, they're not part of the
      // "who watched how much" ranking either way.
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sortDesc ? bv - av : av - bv;
    });
  }, [registrants, sortDesc]);

  function toggleSort() {
    setSortDesc((prev) => (prev === null ? true : prev === true ? false : null));
  }

  return (
    <div className="max-h-96 overflow-auto rounded-md border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="sticky top-0 bg-muted/50">
          <tr>
            <th className="p-2 text-left font-medium">Nombre</th>
            <th className="p-2 text-left font-medium">Email</th>
            <th className="p-2 text-left font-medium">Teléfono</th>
            <th className="p-2 text-left font-medium">Horario asignado</th>
            <th className="p-2 text-left font-medium">Registrado el</th>
            <th className="p-2 text-left font-medium">
              <button
                type="button"
                onClick={toggleSort}
                className="flex items-center gap-1 hover:text-foreground"
              >
                Último minuto visto
                <ArrowUpDown className="size-3.5" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.email}</td>
              <td className="p-2">{r.phone ?? "—"}</td>
              <td className="p-2">{new Date(r.computedSessionStart).toLocaleString("es")}</td>
              <td className="p-2">{new Date(r.createdAt).toLocaleString("es")}</td>
              <td className="p-2">
                {r.lastPositionSeconds === null ? (
                  <span className="text-muted-foreground">No asistió</span>
                ) : (
                  <>
                    {secondsToClock(r.lastPositionSeconds)}
                    {durationSeconds > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({Math.round((r.lastPositionSeconds / durationSeconds) * 100)}%)
                      </span>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
