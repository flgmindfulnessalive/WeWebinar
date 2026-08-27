"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Clicker = {
  registrantId: string;
  name: string;
  email: string;
  clickedAt: string;
  clickCount: number;
};

export function CtaClickersToggle({ label, clickers }: { label: string; clickers: Clicker[] }) {
  const [open, setOpen] = useState(false);

  if (clickers.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        Ver quién hizo clic en &ldquo;{label}&rdquo; ({clickers.length})
      </button>
      {open && (
        <div className="max-h-64 overflow-auto rounded-md border">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="sticky top-0 bg-muted/50">
              <tr>
                <th className="p-2 text-left font-medium">Nombre</th>
                <th className="p-2 text-left font-medium">Email</th>
                <th className="p-2 text-left font-medium">Primer clic</th>
                <th className="p-2 text-left font-medium">Clics</th>
              </tr>
            </thead>
            <tbody>
              {clickers.map((c) => (
                <tr key={c.registrantId} className="border-t">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.email}</td>
                  <td className="p-2">{new Date(c.clickedAt).toLocaleString("es")}</td>
                  <td className="p-2">{c.clickCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
