// Textos de la interfaz. Para añadir inglés: crear en.ts con las mismas
// claves y elegir el diccionario según `lang`.
import { es } from "./es";

export type Key = keyof typeof es;
const dict: Record<string, Record<Key, string>> = { es };
let lang = "es";
export const setLang = (l: string) => { if (dict[l]) lang = l; };
export const t = (k: Key): string => dict[lang][k] ?? es[k];
