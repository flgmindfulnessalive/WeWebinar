// The badge cookie.
//
// It carries exactly one hop: the click on someone's badge, through to the
// moment the new person claims their own page. After that the referral is a
// row on their account and this cookie stops mattering -- which is the
// whole point, because the chain it would otherwise have to survive runs
// five hops and several months, across devices, and no cookie does that.
//
// Last touch, so a later click simply overwrites it. That rule was chosen
// because it is the one that can be explained to both claimants without
// argument: the badge that produced the registration is the one that gets
// the credit.

export const REFERRAL_COOKIE = "wf_ref";
export const REFERRAL_WINDOW_DAYS = 90;

export type ReferralTouch = { slug: string; touchedAt: Date };

export function serializeTouch(slug: string, touchedAt: Date = new Date()): string {
  return `${slug}.${touchedAt.getTime()}`;
}

// Anything malformed, in the future, or past the window reads as no touch.
// The database clamps the same way on the way in; this keeps a stale cookie
// from showing up as a referrer in the UI before it gets there.
export function parseTouch(raw: string | undefined): ReferralTouch | null {
  if (!raw) return null;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;

  const slug = raw.slice(0, separator);
  const millis = Number(raw.slice(separator + 1));
  if (!Number.isFinite(millis) || millis <= 0) return null;
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) return null;

  const touchedAt = new Date(millis);
  const ageDays = (Date.now() - millis) / 86_400_000;
  if (ageDays < 0 || ageDays > REFERRAL_WINDOW_DAYS) return null;

  return { slug, touchedAt };
}
