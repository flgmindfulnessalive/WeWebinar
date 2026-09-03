import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { resolveBrandColors } from "@/lib/brand-colors";
import { NewWebinarForm } from "./new-webinar-form";

export default async function NewWebinarPage() {
  const current = await getCurrentAccount();
  if (!current) redirect("/onboarding");

  const brandColors = resolveBrandColors(
    current.account.branding as Record<string, string | null> | null
  );

  return (
    <NewWebinarForm accountName={current.account.name} brandColors={brandColors} />
  );
}
