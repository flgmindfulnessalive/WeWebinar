// What counts as a visit (shown in the panel next to the numbers):
// one browser opening a published page, at most once every 24 hours per
// page. The page owner, link-preview crawlers (they never run the beacon)
// and obvious bots are not counted. No visitor identity is stored: the
// 24-hour window lives in a first-party cookie on the visitor's side.
export const VISIT_DEFINITION =
  "Una visita es un navegador que abre tu página publicada, contada una vez cada 24 horas. No cuentan tus propias visitas ni los robots.";

export type VisitPage = "funnel" | "gift";

export const VISIT_WINDOW_SECONDS = 24 * 60 * 60;

const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|skype|embedly|headless|lighthouse|pingdom|monitor/i;

export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return BOT_PATTERN.test(userAgent);
}

export function visitCookieName(page: VisitPage, slug: string): string {
  return `wfv_${page}_${slug.replace(/[^a-z0-9-]/g, "")}`;
}
