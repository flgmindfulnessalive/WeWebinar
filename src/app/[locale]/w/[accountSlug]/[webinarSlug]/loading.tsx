import { getTranslations } from "next-intl/server";

import { RedirectLoadingScreen } from "@/components/redirect-loading-screen";

// The registration page runs several Supabase queries before it can paint
// anything (account, webinar, schedule, presenter, custom domain). Next.js
// streams this as the instant Suspense fallback for that gap instead of a
// blank white tab -- most visible right after the marketing "Demo" link
// redirects here.
export default async function WebinarRegistrationLoading() {
  const t = await getTranslations("RedirectLoading");
  return <RedirectLoadingScreen message={t("message")} />;
}
