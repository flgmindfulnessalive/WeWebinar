"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackGrowthEvent } from "@/lib/growth/track-client";

// Growth OS MVP 0 -- fires page_viewed on the initial load and every
// client-side route change alike (pathname/searchParams both change on
// those), carrying whatever UTM/referral params are present in the URL.
// This is "universal AttributionParams capture" (the six-field shape
// already proven twice, in readiness_assessments and webinar_projects)
// extended to every page instead of just those two tools -- no special
// "first touch" handling needed here: an internal link never re-adds a
// utm_* param, so only the page someone actually clicked an ad/link into
// ever carries one, and growth_attributions' recompute picks the true
// earliest event regardless.
//
// Mounted next to WhopPixel in the root layout (same site-wide tracking
// pattern already used there), not in the [locale] layout -- so dashboard
// and admin usage post-signup is covered too, not just marketing pages.
function GrowthBeaconInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackGrowthEvent({
      eventName: "page_viewed",
      source: searchParams.get("utm_source") ?? undefined,
      medium: searchParams.get("utm_medium") ?? undefined,
      campaign: searchParams.get("utm_campaign") ?? undefined,
      content: searchParams.get("utm_content") ?? undefined,
      term: searchParams.get("utm_term") ?? undefined,
      referralCode: searchParams.get("ref") ?? undefined,
      metadata: { pathname },
    });
  }, [pathname, searchParams]);

  return null;
}

export function GrowthBeacon() {
  // useSearchParams() requires a Suspense boundary in the App Router, or
  // every static page pulling this in from the root layout gets deopted
  // to fully dynamic rendering.
  return (
    <Suspense fallback={null}>
      <GrowthBeaconInner />
    </Suspense>
  );
}
