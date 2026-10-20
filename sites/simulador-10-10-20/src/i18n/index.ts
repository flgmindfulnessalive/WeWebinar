// Textos de la interfaz en español (base) e inglés.
import { en } from "./en";
import { es } from "./es";

export type Key = keyof typeof es;
export type UiLang = "es" | "en";
let current: UiLang = "es";
export const setLang = (l: UiLang) => { current = l; };
export const getLang = () => current;
export const t = (k: Key, lang: UiLang = current): string => (lang === "en" ? en[k] : undefined) ?? es[k];
