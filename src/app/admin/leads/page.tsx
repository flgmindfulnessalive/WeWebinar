import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { LeadStatusSelect } from "./lead-status-select";

export default async function AdminLeadsPage() {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("enterprise_leads")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Leads Enterprise</h1>

      <Card>
        <CardContent className="divide-y p-0">
          {(!leads || leads.length === 0) && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Todavía no hay leads del formulario de contacto de Enterprise.
            </p>
          )}
          {leads?.map((lead) => (
            <div key={lead.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {lead.name} {lead.company && `· ${lead.company}`}
                </span>
                <span className="text-xs text-muted-foreground">{lead.email}</span>
                {lead.message && <p className="max-w-xl text-sm text-muted-foreground">{lead.message}</p>}
                <span className="text-xs text-muted-foreground">
                  {new Date(lead.created_at).toLocaleString("es")}
                </span>
              </div>
              <LeadStatusSelect leadId={lead.id} status={lead.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
