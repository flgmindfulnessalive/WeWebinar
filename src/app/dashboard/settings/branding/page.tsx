import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandingForm } from "./branding-form";

export default async function BrandingPage() {
  const current = await getCurrentAccount();
  if (!current) return null;

  if (current.user.role !== "owner") {
    redirect("/dashboard");
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Marca</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Branding de la cuenta
          </CardTitle>
          <CardDescription>
            Se aplica en la página de registro, la sala del webinar y el pie
            de los emails.
            {current.plan.key !== "business" &&
              " El plan Business además permite ocultar el \"Powered by\" y usar dominio propio."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingForm branding={current.account.branding} />
        </CardContent>
      </Card>
    </div>
  );
}
