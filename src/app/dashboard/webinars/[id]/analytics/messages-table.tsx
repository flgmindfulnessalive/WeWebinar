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
  return (
    <div className="max-h-96 overflow-auto rounded-md border">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="sticky top-0 bg-muted/50">
          <tr>
            <th className="p-2 text-left font-medium">Asistente</th>
            <th className="p-2 text-left font-medium">Minuto</th>
            <th className="p-2 text-left font-medium">Mensaje</th>
            <th className="p-2 text-left font-medium">Respuesta</th>
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
                  <div>
                    <Badge variant="secondary" className="mb-1">
                      Respuesta AI
                    </Badge>
                    <p className="text-muted-foreground">{m.aiReplyText}</p>
                  </div>
                ) : m.hostReplied ? (
                  <Badge variant="secondary">Respondido por el host</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin respuesta</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
