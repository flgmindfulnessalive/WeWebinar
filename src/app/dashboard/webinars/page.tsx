import Link from "next/link";
import { Video } from "lucide-react";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WebinarRowActions } from "./webinar-row-actions";
import { StatusBadge } from "./status-badge";

export default async function WebinarsPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  const supabase = await createClient();
  const { data: webinars } = await supabase
    .from("webinars")
    .select("id, title, status, attendee_count, created_at")
    .eq("account_id", current.account.id)
    .order("created_at", { ascending: false });

  const canManage = current.user.role === "owner" || current.user.role === "editor";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Webinars</h1>
        {canManage && (
          <Button asChild>
            <Link href="/dashboard/webinars/new">Crear webinar</Link>
          </Button>
        )}
      </div>

      {!webinars || webinars.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Video className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Todavía no creaste ningún webinar.
            </p>
            {canManage && (
              <Button asChild>
                <Link href="/dashboard/webinars/new">Crear tu primer webinar</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {webinars.map((webinar) => (
              <div
                key={webinar.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/dashboard/webinars/${webinar.id}`}
                    className="font-medium hover:underline"
                  >
                    {webinar.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {webinar.attendee_count} registrados
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={webinar.status} />
                  {canManage && (
                    <WebinarRowActions
                      webinarId={webinar.id}
                      status={webinar.status}
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
