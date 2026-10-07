// The address is the product: wefunnels.wewebinars.com/<slug>. It gets
// proposed from the person's own name rather than asked for blank -- a
// blank field is where "juan123" comes from -- and stays editable until
// they publish, after which the database freezes it.

const MIN = 3;
const MAX = 32;

// Accents and ñ are the normal case in this audience's names, not an edge
// case: José Peña has to become josepena, never jos-pe-a.
export function normalizeSlug(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX)
    .replace(/-+$/g, "");
}

// "Carlos Medina" -> "carlosmedina". Joined rather than hyphenated because
// that is how a person says their own address out loud, and these links get
// dictated as often as they get clicked.
export function proposeSlug(displayName: string): string {
  const joined = normalizeSlug(displayName).replace(/-/g, "");
  return joined.length >= MIN ? joined.slice(0, MAX) : "";
}

export function isWellFormedSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug);
}

export function slugLengthHint(slug: string): string | null {
  if (slug.length < MIN) return `El nombre necesita al menos ${MIN} caracteres.`;
  if (slug.length > MAX) return `El nombre no puede pasar de ${MAX} caracteres.`;
  return null;
}
