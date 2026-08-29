import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

// Same reasoning as src/app/login/layout.tsx -- AuthConfirmClient uses
// useTranslations() client-side and this route has no [locale] segment.
export default async function AuthConfirmLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
