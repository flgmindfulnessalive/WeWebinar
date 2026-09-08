import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { AttributionParams } from "@/lib/script-builder/types";
import { localeAlternates } from "@/lib/seo";
import { ScriptBuilderApp } from "./script-builder-app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ScriptBuilder.meta" });
  const title = t("title");
  const description = t("description");
  const image = { url: "/opengraph-image", width: 1200, height: 630 };
  return {
    title,
    description,
    alternates: localeAlternates("/script-builder", locale),
    openGraph: { title, description, images: [image] },
    twitter: { title, description, images: [image] },
  };
}

const ATTRIBUTION_KEYS: (keyof AttributionParams)[] = [
  "source",
  "medium",
  "campaign",
  "content",
  "affiliate",
  "ref",
];

function pickAttribution(searchParams: Record<string, string | string[] | undefined>): AttributionParams {
  const attribution: AttributionParams = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = searchParams[key];
    if (typeof value === "string" && value.length > 0) attribution[key] = value;
  }
  return attribution;
}

export default async function ScriptBuilderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const attribution = pickAttribution(params);
  const assessmentId = typeof params.assessment_id === "string" ? params.assessment_id : undefined;

  return <ScriptBuilderApp attribution={attribution} assessmentId={assessmentId} />;
}
