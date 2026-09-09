import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { TaskActions } from "../task-actions";
import { CreateTaskForm } from "./create-task-form";

export default async function GrowthTasksPage() {
  const t = await getTranslations("GrowthTasks");
  const locale = await getLocale();
  const supabase = await createClient();

  const [{ data: tasks }, { data: prospects }] = await Promise.all([
    supabase
      .from("partner_tasks")
      .select("id, title, due_date, status, prospect_id, partner_prospects(id, full_name, username, profile_url)")
      .order("status", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("partner_prospects")
      .select("id, full_name, username, profile_url")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const openTasks = (tasks ?? []).filter((task) => task.status === "open");
  const closedTasks = (tasks ?? []).filter((task) => task.status !== "open");

  const prospectOptions = (prospects ?? []).map((p) => ({
    id: p.id,
    label: p.full_name || p.username || p.profile_url,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <CreateTaskForm prospects={prospectOptions} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t("openTasks", { count: openTasks.length })}</h2>
        <Card>
          <CardContent className="divide-y p-0">
            {openTasks.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("noOpenTasks")}</p>
            )}
            {openTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{task.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString(locale) : t("noDueDate")}
                    {task.partner_prospects && (
                      <>
                        {" · "}
                        <Link href={`/growth/prospects/${task.prospect_id}`} className="hover:underline">
                          {task.partner_prospects.full_name ||
                            task.partner_prospects.username ||
                            task.partner_prospects.profile_url}
                        </Link>
                      </>
                    )}
                  </span>
                </div>
                <TaskActions taskId={task.id} prospectId={task.prospect_id} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {closedTasks.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t("closedTasks", { count: closedTasks.length })}</h2>
          <Card>
            <CardContent className="divide-y p-0">
              {closedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-4 p-4 text-muted-foreground">
                  <span className="text-sm line-through">{task.title}</span>
                  <span className="text-xs">{t(`taskStatus.${task.status}`)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
