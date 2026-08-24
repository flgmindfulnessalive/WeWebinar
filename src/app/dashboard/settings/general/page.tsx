import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneralForm } from "./general-form";

export default async function GeneralSettingsPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  if (current.user.role !== "owner") {
    redirect("/dashboard");
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">General</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Nombre de la cuenta</CardTitle>
          <CardDescription>
            Se muestra en el panel y no afecta tu plan actual (
            <span className="capitalize">{current.plan.key}</span>). Para cambiar de
            plan, ve a Facturación y plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GeneralForm name={current.account.name} />
        </CardContent>
      </Card>
    </div>
  );
}
