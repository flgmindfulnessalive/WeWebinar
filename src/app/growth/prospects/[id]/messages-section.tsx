"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Copy, Check } from "lucide-react";

import { generateMessageAction, markMessageSent } from "@/lib/actions/growth-scoring";
import { Button } from "@/components/ui/button";

const SELECT_CLASS =
  "flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export type ProspectMessage = {
  id: string;
  channel: string;
  kind: string;
  body: string;
  status: string;
  created_at: string;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard API can fail (no permission, insecure context) --
          // the text is still visible on screen to select manually.
        }
      }}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {label}
    </button>
  );
}

function MarkSentButton({ messageId, prospectId, label, doneLabel, alreadySent }: {
  messageId: string;
  prospectId: string;
  label: string;
  doneLabel: string;
  alreadySent: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  if (alreadySent) {
    return <span className="text-xs text-muted-foreground">{doneLabel}</span>;
  }
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => markMessageSent(messageId, prospectId))}
      className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export function MessagesSection({
  prospectId,
  messages,
  hasAnalysis,
}: {
  prospectId: string;
  messages: ProspectMessage[];
  hasAnalysis: boolean;
}) {
  const t = useTranslations("GrowthScoring");
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState(generateMessageAction, null);

  return (
    <div className="flex flex-col gap-4">
      {!hasAnalysis ? (
        <p className="text-sm text-muted-foreground">{t("analyzeFirst")}</p>
      ) : (
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="prospect_id" value={prospectId} />
          <div className="grid gap-1.5">
            <label htmlFor="channel" className="text-xs font-medium text-muted-foreground">
              {t("channelLabel")}
            </label>
            <select id="channel" name="channel" defaultValue="email" className={SELECT_CLASS}>
              <option value="email">{t("channel.email")}</option>
              <option value="instagram_dm">{t("channel.instagram_dm")}</option>
              <option value="linkedin_dm">{t("channel.linkedin_dm")}</option>
              <option value="tiktok_dm">{t("channel.tiktok_dm")}</option>
              <option value="whatsapp">{t("channel.whatsapp")}</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="kind" className="text-xs font-medium text-muted-foreground">
              {t("kindLabel")}
            </label>
            <select id="kind" name="kind" defaultValue="opening" className={SELECT_CLASS}>
              <option value="opening">{t("kind.opening")}</option>
              <option value="full_message">{t("kind.full_message")}</option>
              <option value="follow_up">{t("kind.follow_up")}</option>
              <option value="proposal">{t("kind.proposal")}</option>
            </select>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("generating") : t("generateMessage")}
          </Button>
        </form>
      )}
      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex flex-col gap-3">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">{t("noMessages")}</p>}
        {messages.map((message) => (
          <div key={message.id} className="rounded-md border p-3 text-sm">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t(`channel.${message.channel}`)} · {t(`kind.${message.kind}`)} ·{" "}
                {new Date(message.created_at).toLocaleString(locale)}
              </span>
              <div className="flex items-center gap-3">
                <CopyButton text={message.body} label={t("copy")} />
                <MarkSentButton
                  messageId={message.id}
                  prospectId={prospectId}
                  label={t("markSent")}
                  doneLabel={t("sent")}
                  alreadySent={message.status === "marked_sent"}
                />
              </div>
            </div>
            <p className="whitespace-pre-wrap">{message.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
