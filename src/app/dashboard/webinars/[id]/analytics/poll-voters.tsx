"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

type Voter = {
  registrantId: string;
  name: string;
  email: string;
  votedAt: string;
};

// Poll-side counterpart of CtaClickersToggle -- a poll option's votes are
// deduped to one per registrant (see get_webinar_poll_voters), so there's
// no repeat-count column here the way CTA clicks have.
export function PollVotersToggle({ label, voters }: { label: string; voters: Voter[] }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("AnalyticsTables");
  const locale = useLocale();

  if (voters.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("noVotersYet", { label })}</p>;
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
        {t("viewVoters", { label, count: voters.length })}
      </button>
      {open && (
        <div className="max-h-64 overflow-auto rounded-md border">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="sticky top-0 bg-muted/50">
              <tr>
                <th className="p-2 text-left font-medium">{t("nameHeader")}</th>
                <th className="p-2 text-left font-medium">{t("emailHeader")}</th>
                <th className="p-2 text-left font-medium">{t("votedAtHeader")}</th>
              </tr>
            </thead>
            <tbody>
              {voters.map((v) => (
                <tr key={v.registrantId} className="border-t">
                  <td className="p-2">{v.name}</td>
                  <td className="p-2">{v.email}</td>
                  <td className="p-2">{new Date(v.votedAt).toLocaleString(locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
