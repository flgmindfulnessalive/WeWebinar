import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { EmailForm } from "./email-form";
import { PasswordForm } from "./password-form";
import { TestEmailForm } from "./test-email-form";

export default async function ProfilePage() {
  const current = await getCurrentAccount();
  if (!current) redirect("/onboarding");

  const t = await getTranslations("ProfileSettings");

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("personalInfoTitle")}</CardTitle>
          <CardDescription>{t("personalInfoDescription")}</CardDescription>
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
          <CardTitle className="text-sm font-medium">{t("emailTitle")}</CardTitle>
          <CardDescription>{t("emailDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailForm currentEmail={current.user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("passwordTitle")}</CardTitle>
          <CardDescription>{t("passwordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("diagnosticsTitle")}</CardTitle>
          <CardDescription>{t("diagnosticsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TestEmailForm />
        </CardContent>
      </Card>
    </div>
  );
}
