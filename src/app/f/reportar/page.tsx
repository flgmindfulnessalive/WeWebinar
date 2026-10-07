import type { Metadata } from "next";

import { ReportForm } from "./report-form";

// Static segments win over [slug] in the router, and "reportar" is in the
// reserved-slug list, so no page can ever be claimed at this address.
export const metadata: Metadata = {
  title: "Reportar una página",
  robots: { index: false, follow: false },
};

export default async function WeFunnelReportPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  return <ReportForm slug={p ?? ""} />;
}
