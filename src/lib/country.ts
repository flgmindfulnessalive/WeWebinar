// ISO 3166-1 alpha-2 -> flag emoji, via the standard regional-indicator
// trick (each letter maps to U+1F1E6..U+1F1FF, offset from 'A'). No lookup
// table, no dependency -- works for any valid 2-letter code.
export function countryFlagEmoji(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))
  );
}

// Localized country name from the code (e.g. "AR" -> "Argentina" in es,
// "Argentina" in en too, but "DE" -> "Alemania" vs "Germany"). Falls back
// to the raw code if Intl.DisplayNames can't resolve it (unusual/invalid
// code) rather than throwing.
export function countryDisplayName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
