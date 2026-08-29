"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { secondsToClock } from "@/lib/time";
import { Badge } from "@/components/ui/badge";

type Message = {
  id: string;
  registrantId: string;
  name: string;
  email: string;
  messageText: string;
  videoTimestampSeconds: number;
  aiReplyText: string | null;
  aiRepliedAt: string | null;
  hostReplied: boolean;
  createdAt: string;
};

export function MessagesTable({ messages }: { messages: Message[] }) {
  const t = useTranslations("AnalyticsTables");
  const [hideAiReplies, setHideAiReplies] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={hideAiReplies}
          onChange={(e) => setHideAiReplies(e.target.checked)}
          className="size-4"
        />
        {t("hideAiReplies")}
      </label>
      <div className="max-h-96 overflow-auto rounded-md border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="sticky top-0 bg-muted/50">
            <tr>
              <th className="p-2 text-left font-medium">{t("attendeeHeader")}</th>
              <th className="p-2 text-left font-medium">{t("minuteHeader")}</th>
              <th className="p-2 text-left font-medium">{t("messageHeader")}</th>
              <th className="p-2 text-left font-medium">{t("replyHeader")}</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} className="border-t align-top">
                <td className="p-2">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </td>
                <td className="p-2 whitespace-nowrap text-muted-foreground">
                  {secondsToClock(m.videoTimestampSeconds)}
                </td>
                <td className="p-2">{m.messageText}</td>
                <td className="p-2">
                  {m.aiReplyText ? (
                    hideAiReplies ? (
                      <span className="text-xs text-muted-foreground">{t("aiReplyHidden")}</span>
                    ) : (
                      <div>
                        <Badge variant="secondary" className="mb-1">
                          {t("aiReplyBadge")}
                        </Badge>
                        <p className="text-muted-foreground">{m.aiReplyText}</p>
                      </div>
                    )
                  ) : m.hostReplied ? (
                    <Badge variant="secondary">{t("hostRepliedBadge")}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("noReply")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
