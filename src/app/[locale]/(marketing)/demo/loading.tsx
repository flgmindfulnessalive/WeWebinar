import { getTranslations } from "next-intl/server";

import { RedirectLoadingScreen } from "@/components/redirect-loading-screen";

// Next.js streams this instantly for the split second it takes /demo to
// resolve NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL and redirect -- without
// it, that gap (and the follow-up navigation to the destination page,
// covered by its own loading.tsx) shows as a blank white tab instead of
// looking like WeWebinars.
export default async function DemoLoading() {
  const t = await getTranslations("RedirectLoading");
  return <RedirectLoadingScreen message={t("message")} />;
}
