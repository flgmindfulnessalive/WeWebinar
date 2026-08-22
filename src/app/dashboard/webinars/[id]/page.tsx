import { notFound } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "../status-badge";
import { WebinarRowActions } from "../webinar-row-actions";

export default async function WebinarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const current = await getCurrentAccount();
  if (!current) return null;

  const supabase = await createClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("*")
    .eq("id", id)
    .single();

  if (!webinar) notFound();

  const canManage = current.user.role === "owner" || current.user.role === "editor";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{webinar.title}</h1>
          <StatusBadge status={webinar.status} />
        </div>
        {canManage && (
          <WebinarRowActions webinarId={webinar.id} status={webinar.status} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Detalle
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Categoría:</span>{" "}
            {webinar.category ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Registrados:</span>{" "}
            {webinar.attendee_count} / {current.plan.max_attendees_per_webinar ?? "∞"}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Descripción:</span>{" "}
            {webinar.description ?? "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          El editor de video, programación, sala de espera, chat simulado y
          CTAs se agrega en la próxima etapa del build.
        </CardContent>
      </Card>
    </div>
  );
}
