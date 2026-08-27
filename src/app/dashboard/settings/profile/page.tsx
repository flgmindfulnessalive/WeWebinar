import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { TestEmailForm } from "./test-email-form";

export default async function ProfilePage() {
  const current = await getCurrentAccount();
  if (!current) redirect("/onboarding");

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Datos personales</CardTitle>
          <CardDescription>{current.user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            displayName={current.user.display_name}
            avatarUrl={current.user.avatar_url}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cambiar contraseña</CardTitle>
          <CardDescription>Mínimo 8 caracteres.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Diagnóstico de emails</CardTitle>
          <CardDescription>
            Prueba el envío de emails (confirmación, recordatorios) sin tener que
            registrarte a un webinar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestEmailForm />
        </CardContent>
      </Card>
    </div>
  );
}
