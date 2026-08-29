import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

// This route has no locale in the URL (see src/i18n/routing.ts), so it
// isn't covered by the [locale] segment's own NextIntlClientProvider --
// LoginForm/GoogleButton use useTranslations() client-side and need their
// own provider, same pattern as dashboard/layout.tsx and admin/layout.tsx.
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
