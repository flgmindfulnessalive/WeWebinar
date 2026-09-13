// Country list for the phone input's country-code picker. Prioritizes full
// coverage of Latin America and Europe (this product's core markets), plus
// the US/Canada and the largest countries elsewhere. Not exhaustive of all
// ~195 UN member states, but broad enough that most visitors find their
// country. iso2/dialCode pairs are verified against public ISO 3166-1 /
// ITU-T E.164 data.
export type Country = {
  name: string;
  nameEn: string;
  iso2: string;
  dialCode: string;
};

export const countries: Country[] = [
  // Latin America
  { name: "México", nameEn: "Mexico", iso2: "MX", dialCode: "+52" },
  { name: "Argentina", nameEn: "Argentina", iso2: "AR", dialCode: "+54" },
  { name: "Colombia", nameEn: "Colombia", iso2: "CO", dialCode: "+57" },
  { name: "Chile", nameEn: "Chile", iso2: "CL", dialCode: "+56" },
  { name: "Perú", nameEn: "Peru", iso2: "PE", dialCode: "+51" },
  { name: "Brasil", nameEn: "Brazil", iso2: "BR", dialCode: "+55" },
  { name: "Venezuela", nameEn: "Venezuela", iso2: "VE", dialCode: "+58" },
  { name: "Ecuador", nameEn: "Ecuador", iso2: "EC", dialCode: "+593" },
  { name: "Guatemala", nameEn: "Guatemala", iso2: "GT", dialCode: "+502" },
  { name: "Cuba", nameEn: "Cuba", iso2: "CU", dialCode: "+53" },
  { name: "Bolivia", nameEn: "Bolivia", iso2: "BO", dialCode: "+591" },
  { name: "República Dominicana", nameEn: "Dominican Republic", iso2: "DO", dialCode: "+1809" },
  { name: "Honduras", nameEn: "Honduras", iso2: "HN", dialCode: "+504" },
  { name: "Paraguay", nameEn: "Paraguay", iso2: "PY", dialCode: "+595" },
  { name: "El Salvador", nameEn: "El Salvador", iso2: "SV", dialCode: "+503" },
  { name: "Nicaragua", nameEn: "Nicaragua", iso2: "NI", dialCode: "+505" },
  { name: "Costa Rica", nameEn: "Costa Rica", iso2: "CR", dialCode: "+506" },
  { name: "Panamá", nameEn: "Panama", iso2: "PA", dialCode: "+507" },
  { name: "Uruguay", nameEn: "Uruguay", iso2: "UY", dialCode: "+598" },
  { name: "Puerto Rico", nameEn: "Puerto Rico", iso2: "PR", dialCode: "+1787" },

  // North America
  { name: "Estados Unidos", nameEn: "United States", iso2: "US", dialCode: "+1" },
  { name: "Canadá", nameEn: "Canada", iso2: "CA", dialCode: "+1" },

  // Europe
  { name: "España", nameEn: "Spain", iso2: "ES", dialCode: "+34" },
  { name: "Portugal", nameEn: "Portugal", iso2: "PT", dialCode: "+351" },
  { name: "Francia", nameEn: "France", iso2: "FR", dialCode: "+33" },
  { name: "Alemania", nameEn: "Germany", iso2: "DE", dialCode: "+49" },
  { name: "Italia", nameEn: "Italy", iso2: "IT", dialCode: "+39" },
  { name: "Reino Unido", nameEn: "United Kingdom", iso2: "GB", dialCode: "+44" },
  { name: "Irlanda", nameEn: "Ireland", iso2: "IE", dialCode: "+353" },
  { name: "Países Bajos", nameEn: "Netherlands", iso2: "NL", dialCode: "+31" },
  { name: "Bélgica", nameEn: "Belgium", iso2: "BE", dialCode: "+32" },
  { name: "Suiza", nameEn: "Switzerland", iso2: "CH", dialCode: "+41" },
  { name: "Austria", nameEn: "Austria", iso2: "AT", dialCode: "+43" },
  { name: "Suecia", nameEn: "Sweden", iso2: "SE", dialCode: "+46" },
  { name: "Noruega", nameEn: "Norway", iso2: "NO", dialCode: "+47" },
  { name: "Dinamarca", nameEn: "Denmark", iso2: "DK", dialCode: "+45" },
  { name: "Finlandia", nameEn: "Finland", iso2: "FI", dialCode: "+358" },
  { name: "Polonia", nameEn: "Poland", iso2: "PL", dialCode: "+48" },
  { name: "República Checa", nameEn: "Czech Republic", iso2: "CZ", dialCode: "+420" },
  { name: "Grecia", nameEn: "Greece", iso2: "GR", dialCode: "+30" },
  { name: "Rumania", nameEn: "Romania", iso2: "RO", dialCode: "+40" },
  { name: "Hungría", nameEn: "Hungary", iso2: "HU", dialCode: "+36" },
  { name: "Ucrania", nameEn: "Ukraine", iso2: "UA", dialCode: "+380" },
  { name: "Rusia", nameEn: "Russia", iso2: "RU", dialCode: "+7" },
  { name: "Turquía", nameEn: "Turkey", iso2: "TR", dialCode: "+90" },
  { name: "Croacia", nameEn: "Croatia", iso2: "HR", dialCode: "+385" },
  { name: "Bulgaria", nameEn: "Bulgaria", iso2: "BG", dialCode: "+359" },
  { name: "Andorra", nameEn: "Andorra", iso2: "AD", dialCode: "+376" },

  // Rest of the world (largest / most relevant countries)
  { name: "China", nameEn: "China", iso2: "CN", dialCode: "+86" },
  { name: "India", nameEn: "India", iso2: "IN", dialCode: "+91" },
  { name: "Japón", nameEn: "Japan", iso2: "JP", dialCode: "+81" },
  { name: "Corea del Sur", nameEn: "South Korea", iso2: "KR", dialCode: "+82" },
  { name: "Indonesia", nameEn: "Indonesia", iso2: "ID", dialCode: "+62" },
  { name: "Filipinas", nameEn: "Philippines", iso2: "PH", dialCode: "+63" },
  { name: "Vietnam", nameEn: "Vietnam", iso2: "VN", dialCode: "+84" },
  { name: "Tailandia", nameEn: "Thailand", iso2: "TH", dialCode: "+66" },
  { name: "Malasia", nameEn: "Malaysia", iso2: "MY", dialCode: "+60" },
  { name: "Singapur", nameEn: "Singapore", iso2: "SG", dialCode: "+65" },
  { name: "Pakistán", nameEn: "Pakistan", iso2: "PK", dialCode: "+92" },
  { name: "Australia", nameEn: "Australia", iso2: "AU", dialCode: "+61" },
  { name: "Nueva Zelanda", nameEn: "New Zealand", iso2: "NZ", dialCode: "+64" },
  { name: "Sudáfrica", nameEn: "South Africa", iso2: "ZA", dialCode: "+27" },
  { name: "Nigeria", nameEn: "Nigeria", iso2: "NG", dialCode: "+234" },
  { name: "Egipto", nameEn: "Egypt", iso2: "EG", dialCode: "+20" },
  { name: "Marruecos", nameEn: "Morocco", iso2: "MA", dialCode: "+212" },
  { name: "Israel", nameEn: "Israel", iso2: "IL", dialCode: "+972" },
  { name: "Emiratos Árabes Unidos", nameEn: "United Arab Emirates", iso2: "AE", dialCode: "+971" },
  { name: "Arabia Saudita", nameEn: "Saudi Arabia", iso2: "SA", dialCode: "+966" },
];

/**
 * Display name for a country in the given locale -- `name` is the
 * (default) Spanish label, `nameEn` the English one.
 */
export function countryName(country: Country, locale: string): string {
  return locale === "en" ? country.nameEn : country.name;
}

/**
 * Converts an ISO 3166-1 alpha-2 country code into its flag emoji by
 * mapping each letter to its Regional Indicator Symbol codepoint. Never
 * hand-type flag emoji -- compute them, so the mapping can't drift from
 * the iso2 codes above.
 */
export function isoToFlagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

// Rough, best-effort mapping from IANA timezone to a likely country, used
// only to pick a sane default in the phone input. Deliberately small and
// approximate -- covers the product's core LatAm/Europe markets plus a
// handful of large timezones elsewhere. Falls back to the first country in
// the list (México) when nothing matches.
const timezoneToIso2: Record<string, string> = {
  "America/Mexico_City": "MX",
  "America/Tijuana": "MX",
  "America/Cancun": "MX",
  "America/Monterrey": "MX",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Bogota": "CO",
  "America/Santiago": "CL",
  "America/Lima": "PE",
  "America/Sao_Paulo": "BR",
  "America/Caracas": "VE",
  "America/Guayaquil": "EC",
  "America/Guatemala": "GT",
  "America/Havana": "CU",
  "America/La_Paz": "BO",
  "America/Santo_Domingo": "DO",
  "America/Tegucigalpa": "HN",
  "America/Asuncion": "PY",
  "America/El_Salvador": "SV",
  "America/Managua": "NI",
  "America/Costa_Rica": "CR",
  "America/Panama": "PA",
  "America/Montevideo": "UY",
  "America/Puerto_Rico": "PR",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Europe/Madrid": "ES",
  "Europe/Lisbon": "PT",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Rome": "IT",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Zurich": "CH",
  "Europe/Vienna": "AT",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ",
  "Europe/Athens": "GR",
  "Europe/Bucharest": "RO",
  "Europe/Budapest": "HU",
  "Europe/Kyiv": "UA",
  "Europe/Moscow": "RU",
  "Europe/Istanbul": "TR",
  "Asia/Shanghai": "CN",
  "Asia/Kolkata": "IN",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Jakarta": "ID",
  "Asia/Manila": "PH",
  "Australia/Sydney": "AU",
  "Pacific/Auckland": "NZ",
  "Africa/Johannesburg": "ZA",
};

/**
 * Best-effort default country from the browser's IANA timezone. Returns
 * null when the timezone isn't in the (small, approximate) map above, so
 * callers can fall back to a fixed default instead.
 */
export function guessCountryFromTimezone(timezone: string): Country | null {
  const iso2 = timezoneToIso2[timezone];
  if (!iso2) return null;
  return countries.find((c) => c.iso2 === iso2) ?? null;
}
