import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No [locale] segment on this route (see src/i18n/routing.ts) --
  // ForgotPasswordForm/ResetPasswordForm use useTranslations() client-side
  // and need their own provider, same pattern as dashboard/layout.tsx.
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/30 p-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          WeWebinars
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </NextIntlClientProvider>
  );
}
