// El antetítulo de una página personal.
//
// Nulo quiere decir "el de siempre": la aplicación pone el texto por
// defecto. Guardar una copia de ese valor en cada fila haría que cambiarlo
// mañana obligara a tocar las filas de todo el mundo.
//
// En su propio módulo y no en la página: lo leen la página pública, el
// editor y su vista previa, y una página de Next no puede exportar nada que
// no sea lo que el enrutador espera.
export const DEFAULT_KICKER = "Conoce mi propuesta";

export const KICKER_MAX = 60;

export function kickerOf(value: string | null | undefined): string {
  return value?.trim() || DEFAULT_KICKER;
}
