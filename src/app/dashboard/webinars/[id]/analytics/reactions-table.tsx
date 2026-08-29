import { getTranslations } from "next-intl/server";

import { secondsToClock } from "@/lib/time";

type Reaction = {
  id: string;
  registrantId: string;
  name: string;
  email: string;
  emoji: string;
  videoTimestampSeconds: number | null;
};

export async function ReactionsTable({ reactions }: { reactions: Reaction[] }) {
  const t = await getTranslations("AnalyticsTables");

  return (
    <div className="max-h-96 overflow-auto rounded-md border">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="sticky top-0 bg-muted/50">
          <tr>
            <th className="p-2 text-left font-medium">{t("attendeeHeader")}</th>
            <th className="p-2 text-left font-medium">{t("emojiHeader")}</th>
            <th className="p-2 text-left font-medium">{t("minuteHeader")}</th>
          </tr>
        </thead>
        <tbody>
          {reactions.map((r) => (
            <tr key={r.id} className="border-t align-top">
              <td className="p-2">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.email}</p>
              </td>
              <td className="p-2 text-lg">{r.emoji}</td>
              <td className="p-2 whitespace-nowrap text-muted-foreground">
                {r.videoTimestampSeconds === null ? "—" : secondsToClock(r.videoTimestampSeconds)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
