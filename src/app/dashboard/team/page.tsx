import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteForm } from "./invite-form";
import { RevokeInvitationButton, RemoveMemberButton } from "./member-row-actions";

export default async function TeamPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  if (current.user.role !== "owner") {
    redirect("/dashboard");
  }

  if ((current.plan.max_users ?? 2) <= 1) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
        <p className="text-sm text-muted-foreground">
          El plan {current.plan.name} incluye un único usuario. Pasate a Pro o
          Business para invitar Editores y Viewers.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, role, display_name")
      .eq("account_id", current.account.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("account_invitations")
      .select("id, email, role")
      .eq("account_id", current.account.id)
      .eq("status", "pending"),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Invitar usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Miembros</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {members?.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {member.display_name ?? member.email}
                </span>
                <span className="text-xs text-muted-foreground">{member.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="capitalize">
                  {member.role}
                </Badge>
                {member.role !== "owner" && member.id !== current.user.id && (
                  <RemoveMemberButton userId={member.id} />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Invitaciones pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-4">
                <span className="text-sm">{invitation.email}</span>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="capitalize">
                    {invitation.role}
                  </Badge>
                  <RevokeInvitationButton invitationId={invitation.id} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
