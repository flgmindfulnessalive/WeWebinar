"use client";

import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";

import { addProspectNote } from "@/lib/actions/growth-prospects";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ProspectNote = {
  id: string;
  body: string;
  created_at: string;
  author_email: string | null;
};

export function NotesSection({ prospectId, notes }: { prospectId: string; notes: ProspectNote[] }) {
  const t = useTranslations("GrowthProspects");
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState(addProspectNote, null);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="prospect_id" value={prospectId} />
        <Textarea name="body" rows={3} placeholder={t("noteBodyPlaceholder")} required />
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("adding") : t("addNote")}
          </Button>
          {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
        </div>
      </form>

      <div className="flex flex-col gap-3">
        {notes.length === 0 && <p className="text-sm text-muted-foreground">{t("noNotes")}</p>}
        {notes.map((note) => (
          <div key={note.id} className="rounded-md border p-3 text-sm">
            <p className="whitespace-pre-wrap">{note.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {note.author_email ?? t("unknownAuthor")} · {new Date(note.created_at).toLocaleString(locale)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
