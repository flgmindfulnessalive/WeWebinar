"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

type Clicker = {
  registrantId: string;
  name: string;
  email: string;
  clickedAt: string;
  clickCount: number;
};

export function CtaClickersToggle({ label, clickers }: { label: string; clickers: Clicker[] }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("AnalyticsTables");
  const locale = useLocale();

  // Previously returned null here -- indistinguishable from a broken query:
  // a host with zero real clicks on a CTA saw exactly the same nothing as a
  // host whose clicks silently failed to record. Say it outright instead.
  if (clickers.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("noClickersYet", { label })}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {t("viewClickers", { label, count: clickers.length })}
      </button>
      {open && (
        <div className="max-h-64 overflow-auto rounded-md border">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="sticky top-0 bg-muted/50">
              <tr>
                <th className="p-2 text-left font-medium">{t("nameHeader")}</th>
                <th className="p-2 text-left font-medium">{t("emailHeader")}</th>
                <th className="p-2 text-left font-medium">{t("firstClickHeader")}</th>
                <th className="p-2 text-left font-medium">{t("clicksHeader")}</th>
              </tr>
            </thead>
            <tbody>
              {clickers.map((c) => (
                <tr key={c.registrantId} className="border-t">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.email}</td>
                  <td className="p-2">{new Date(c.clickedAt).toLocaleString(locale)}</td>
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
